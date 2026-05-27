require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const nodemailer = require('nodemailer');
const selfsigned = require('selfsigned');
const os = require('os');

// Yerel IP adresini otomatik bul
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const app = express();
const httpServer = http.createServer(app);

// Globals to be initialized asynchronously
let httpsServer;
let io;
let ioHttp;

app.use(express.static(path.join(__dirname, 'public')));

// SMTP Yapılandırması (.env dosyasından okunur)
const SMTP_USER = process.env.SMTP_USER || 'YOUR_EMAIL@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'YOUR_APP_PASSWORD';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const isSmtpConfigured = SMTP_USER !== 'YOUR_EMAIL@gmail.com' && SMTP_PASS !== 'YOUR_APP_PASSWORD';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
});

// Veri depolama
const rooms = {};
const verificationCodes = {};
const verifiedEmails = new Set();

console.log(`[CONFIG] SMTP Modu: ${isSmtpConfigured ? 'Gerçek E-posta' : 'Simülasyon (kod tarayıcıya gönderilir)'}`);

// Ortak socket handler (HTTPS ve HTTP için)
function handleConnection(socket) {
    console.log(`[INFO] Yeni bağlantı: ${socket.id}`);

    // 1. Doğrulama Kodu Gönder
    socket.on('send-verification-code', async (email) => {
        if (!email || email.trim() === '') {
            socket.emit('error-msg', 'E-posta alanı boş bırakılamaz!');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            socket.emit('error-msg', 'E-posta adresi eksik veya geçersiz formatta!');
            return;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        verificationCodes[email] = {
            code: code,
            expires: Date.now() + 10 * 60 * 1000
        };

        console.log(`[AUTH] ${email} için doğrulama kodu: ${code}`);

        if (isSmtpConfigured) {
            try {
                await transporter.sendMail({
                    from: `"AuraLink" <${SMTP_USER}>`,
                    to: email,
                    subject: 'AuraLink - Doğrulama Kodunuz',
                    html: `
                        <div style="font-family: Arial; max-width: 500px; margin: auto; background: #1e1b4b; color: white; padding: 30px; border-radius: 16px;">
                            <h2 style="color: #6366f1;">AuraLink 🎥</h2>
                            <p>Merhaba! Giriş doğrulama kodunuz:</p>
                            <h1 style="font-size: 48px; letter-spacing: 8px; color: #a855f7; text-align: center;">${code}</h1>
                            <p style="color: #94a3b8; font-size: 12px;">Bu kod 10 dakika boyunca geçerlidir.</p>
                        </div>`
                });
                socket.emit('code-sent', { mode: 'email', message: 'Doğrulama kodu e-posta adresinize gönderildi.' });
            } catch (err) {
                console.error('[ERROR] E-posta gönderilemedi:', err.message);
                // SMTP hata verirse simülasyon moduna düş
                socket.emit('code-sent', { mode: 'simulation', code, message: 'E-posta gönderilemedi, simülasyon modu aktif.' });
            }
        } else {
            // Simülasyon modu: kodu direkt tarayıcıya gönder
            socket.emit('code-sent', { mode: 'simulation', code, message: 'Simülasyon modu: Kod aşağıda gösterilmektedir.' });
        }
    });

    // 2. Kodu Doğrula
    socket.on('verify-code', (data) => {
        const { email, code } = data;
        const storedData = verificationCodes[email];

        if (storedData && storedData.code === code && Date.now() < storedData.expires) {
            verifiedEmails.add(email);
            delete verificationCodes[email];
            socket.emit('code-verified', email);
            console.log(`[AUTH] ${email} başarıyla doğrulandı.`);
        } else {
            socket.emit('error-msg', 'Hatalı veya süresi dolmuş doğrulama kodu!');
        }
    });

    // 3. Odaya Katıl
    socket.on('join-room', (data) => {
        const { roomId, password, username, email } = data;

        // E-posta format kontrolü (eksik/hatalı girilmiş mi?)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!email || !emailRegex.test(email)) {
            socket.emit('error-msg', 'Geçerli bir e-posta adresi girilmedi!');
            return;
        }

        if (!verifiedEmails.has(email)) {
            socket.emit('error-msg', 'Lütfen önce e-posta adresinizi doğrulayın!');
            return;
        }

        // Kullanıcı adı kontrolü
        if (!username || username.trim().length < 3) {
            socket.emit('error-msg', 'Kullanıcı adı en az 3 karakter olmalıdır!');
            return;
        }

        if (!/[a-zA-Z0-9ıİğĞüÜşŞöÖçÇ]/.test(username)) {
            socket.emit('error-msg', 'Kullanıcı adı sadece noktalama işaretlerinden oluşamaz! En az bir harf veya rakam içermelidir.');
            return;
        }

        if (!rooms[roomId]) {
            rooms[roomId] = { password, users: {} };
        }

        const roomData = rooms[roomId];

        if (roomData.password !== password) {
            socket.emit('error-msg', 'Hatalı oda şifresi!');
            return;
        }

        if (Object.keys(roomData.users).length >= 2) {
            socket.emit('error-msg', 'Oda dolu! (Maks. 2 kişi)');
            return;
        }

        const existingEmail = Object.values(roomData.users).find(u => u.email === email);
        if (existingEmail) {
            socket.emit('error-msg', 'Bu e-posta adresi zaten odada aktif.');
            return;
        }

        // Aynı kullanıcı adı kontrolü
        const existingUsername = Object.values(roomData.users).find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (existingUsername) {
            socket.emit('error-msg', 'Bu kullanıcı adı odada zaten kullanılıyor! Lütfen farklı bir isim girin.');
            return;
        }

        roomData.users[socket.id] = { username, email };
        socket.join(roomId);

        console.log(`[ROOM] ${username} odaya girdi: ${roomId}`);
        socket.to(roomId).emit('user-joined', { id: socket.id, username });

        const otherUser = Object.entries(roomData.users).find(([id]) => id !== socket.id);
        if (otherUser) {
            socket.emit('peer-info', { username: otherUser[1].username });
        }
    });

    // WebRTC Sinyalizasyon
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', { offer: data.offer, senderId: socket.id, username: data.username });
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', { answer: data.answer, senderId: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });

    // 4. Metin Sohbeti
    socket.on('chat-message', (data) => {
        const { roomId, message, username, timestamp } = data;
        if (!message || message.trim().length === 0) return;
        // Mesajı odadaki diğer kullanıcıya ilet
        socket.to(roomId).emit('chat-message', { message: message.trim(), username, timestamp });
        console.log(`[CHAT] [${roomId}] ${username}: ${message.trim()}`);
    });

    // 5. Yazıyor bildirimi
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('typing', { username: data.username });
    });

    socket.on('stop-typing', (data) => {
        socket.to(data.roomId).emit('stop-typing');
    });

    // 6. Bağlantı Kesilmesi
    socket.on('disconnecting', () => {
        socket.rooms.forEach(roomId => {
            if (rooms[roomId]) {
                const user = rooms[roomId].users[socket.id];
                if (user) {
                    delete rooms[roomId].users[socket.id];
                    if (Object.keys(rooms[roomId].users).length === 0) {
                        delete rooms[roomId];
                    } else {
                        socket.to(roomId).emit('user-left', socket.id);
                    }
                }
            }
        });
    });
}

async function startServer() {
    // Self-signed SSL sertifikası oluştur (HTTPS için gerekli)
    console.log('[SSL] Self-signed sertifika oluşturuluyor...');
    const attrs = [{ name: 'commonName', value: 'AuraLink Local' }];
    const pems = await selfsigned.generate(attrs, {
        days: 365,
        keySize: 2048,
        algorithm: 'sha256',
        extensions: [{
            name: 'subjectAltName',
            altNames: [
                { type: 2, value: 'localhost' },
                { type: 7, ip: '127.0.0.1' },
                { type: 7, ip: getLocalIP() }
            ]
        }]
    });
    console.log('[SSL] Sertifika hazır ✅');

    httpsServer = https.createServer({ key: pems.private, cert: pems.cert }, app);
    io = new Server(httpsServer, { cors: { origin: '*' } });
    ioHttp = new Server(httpServer, { cors: { origin: '*' } });

    // Her iki sunucu için de aynı handler'ı kullan
    io.on('connection', handleConnection);
    ioHttp.on('connection', handleConnection);

    const PORT = process.env.PORT || 3000;
    const HTTPS_PORT = 3443;
    const LOCAL_IP = getLocalIP();

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`[READY] HTTP  → http://localhost:${PORT}`);
    });

    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`[READY] HTTPS → https://localhost:${HTTPS_PORT}`);
        console.log(``);
        console.log(`┌──────────────────────────────────────────────────┐`);
        console.log(`│  📱 TELEFONDAN BAĞLANMAK İÇİN:                   │`);
        console.log(`│                                                  │`);
        console.log(`│  👉 https://${LOCAL_IP}:${HTTPS_PORT}`);
        console.log(`│                                                  │`);
        console.log(`│  ⚠️  Tarayıcıda "Güvenli değil" uyarısı çıkarsa  │`);
        console.log(`│     "Gelişmiş" → "Devam et" tıklayın.            │`);
        console.log(`│                                                  │`);
        console.log(`│  💻 Bilgisayarda: https://localhost:${HTTPS_PORT}       │`);
        console.log(`└──────────────────────────────────────────────────┘`);
    });
}

startServer().catch(err => {
    console.error('[FATAL] Sunucu başlatılamadı:', err);
});
