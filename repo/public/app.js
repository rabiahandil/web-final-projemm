// ── 0. Yüzen Emoji Arka Planı ────────────────────────────
(function initEmojiBg() {
    const container = document.getElementById('emoji-bg');

    // Video sohbetle alakalı emojiler
    const EMOJIS = [
        '📡','🎥','📷','💬','🔒','📞','🎤','🖥️',
        '🤳','💻','📱','🔐','🌐','🎙️','📹','🎧',
        '🔔','💡','✨','🛡️','🔗','📶','🎬','🖱️',
        '👩‍💻','👨‍💻','🧑‍💻','⚡','👥','🤝'
    ];

    const COUNT = 45;

    function randomBetween(a, b) { return a + Math.random() * (b - a); }

    function createParticle() {
        const el = document.createElement('span');
        el.className = 'emoji-particle';
        el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

        const size  = randomBetween(1.2, 2.8);
        const dur   = randomBetween(14, 30);
        const delay = randomBetween(0, -dur);
        const left  = randomBetween(0, 98);

        el.style.cssText = `
            left: ${left}%;
            bottom: -60px;
            font-size: ${size}rem;
            animation-duration: ${dur}s;
            animation-delay: ${delay}s;
            opacity: 0;
        `;
        container.appendChild(el);
    }

    for (let i = 0; i < COUNT; i++) createParticle();
})();



const socket = io();


// ── UI Elemanları ──────────────────────────────────────────
const loginContainer = document.getElementById('login-container');
const chatContainer  = document.getElementById('chat-container');
const joinBtn        = document.getElementById('join-btn');
const sendCodeBtn    = document.getElementById('send-code-btn');
const verifyBtn      = document.getElementById('verify-btn');
const verificationSection = document.getElementById('verification-section');
const authStatus     = document.getElementById('auth-status');
const simCodeBox     = document.getElementById('sim-code-box');
const simCodeValue   = document.getElementById('sim-code-value');
const copyCodeBtn    = document.getElementById('copy-code-btn');

const localVideo     = document.getElementById('local-video');
const remoteVideo    = document.getElementById('remote-video');
const remoteLoader   = document.getElementById('remote-loader');
const localLabel     = document.getElementById('local-label');
const remoteLabel    = document.getElementById('remote-label');
const currentRoomLbl = document.getElementById('current-room');
const statusPill     = document.getElementById('connection-status');
const toast          = document.getElementById('toast');

const usernameInput  = document.getElementById('username');
const emailInput     = document.getElementById('email');
const codeInput      = document.getElementById('verify-code-input');
const roomIdInput    = document.getElementById('room-id');
const passwordInput  = document.getElementById('password');

const micBtn         = document.getElementById('toggle-mic');
const videoBtn       = document.getElementById('toggle-video');
const shareBtn       = document.getElementById('share-screen');
const leaveBtn       = document.getElementById('leave-call');
const toggleChatBtn  = document.getElementById('toggle-chat-btn');
const closeChatBtn   = document.getElementById('toggle-chat');

const chatPanel      = document.getElementById('chat-panel');
const messagesArea   = document.getElementById('messages-area');
const chatInput      = document.getElementById('chat-input');
const sendMsgBtn     = document.getElementById('send-msg-btn');
const emojiBtn       = document.getElementById('emoji-btn');
const emojiPicker    = document.getElementById('emoji-picker');
const typingIndicator = document.getElementById('typing-indicator');
const unreadBadge    = document.getElementById('unread-badge');

// ── Durum ─────────────────────────────────────────────────
let localStream, peerConnection;
let roomId, password, username, email;
let isScreenSharing = false;
let isVerified = false;
let pendingCandidates = [];
let typingTimer;
let chatOpen = true;
let unreadCount = 0;
let toastTimer;

const iceServers = {
    iceServers: [
        // STUN sunucuları — NAT arkasındaki public IP keşfi
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // TURN sunucuları — Simetrik NAT / kurumsal firewall geçişi
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// Kullanıcı adı geçerlilik kontrolü
function validateUsername(name) {
    const val = name.trim();
    if (val.length < 3) return false;
    if (!/[a-zA-Z0-9ıİğĞüÜşŞöÖçÇ]/.test(val)) return false;
    return true;
}

// E-posta geçerlilik kontrolü
function validateEmail(email) {
    const val = email.trim();
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(val);
}

// Giriş alanlarının durumuna göre buton ve e-posta inputunu güncelle
function updateEmailSectionState() {
    if (isVerified) return;

    const isUserValid = validateUsername(usernameInput.value);
    
    if (isUserValid) {
        emailInput.disabled = false;
        
        const isEmailValid = validateEmail(emailInput.value);
        if (isEmailValid) {
            sendCodeBtn.disabled = false;
            sendCodeBtn.classList.remove('disabled');
        } else {
            sendCodeBtn.disabled = true;
            sendCodeBtn.classList.add('disabled');
        }
    } else {
        emailInput.disabled = true;
        sendCodeBtn.disabled = true;
        sendCodeBtn.classList.add('disabled');
        verificationSection.classList.add('hidden');
        simCodeBox.classList.add('hidden');
    }
}

usernameInput.addEventListener('input', updateEmailSectionState);
emailInput.addEventListener('input', updateEmailSectionState);

// ── 1. E-posta Doğrulama ──────────────────────────────────
sendCodeBtn.onclick = () => {
    // Çift kontrol: Kullanıcı adı kontrolü
    const userVal = usernameInput.value.trim();
    if (userVal.length < 3) {
        return showToast('Kullanıcı adı en az 3 karakter olmalıdır.');
    }
    if (!/[a-zA-Z0-9ıİğĞüÜşŞöÖçÇ]/.test(userVal)) {
        return showToast('Kullanıcı adı sadece noktalama işaretlerinden oluşamaz! En az bir harf veya rakam içermelidir.');
    }

    const emailVal = emailInput.value.trim();
    if (!emailVal) {
        return showToast('E-posta alanı boş bırakılamaz!');
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(emailVal)) {
        return showToast('E-posta adresi eksik veya geçersiz formatta!');
    }
    email = emailVal;
    socket.emit('send-verification-code', email);
    sendCodeBtn.textContent = 'Tekrar Gönder';
    verificationSection.classList.remove('hidden');
};

socket.on('code-sent', ({ mode, code, message }) => {
    if (mode === 'simulation' && code) {
        // Simülasyon modunda: kodu göster ve otomatik doğrula
        simCodeBox.classList.remove('hidden');
        simCodeValue.textContent = code;
        verificationSection.classList.remove('hidden');
        codeInput.value = code;
        showToast('✅ Test modu: Kod otomatik girildi, doğrulanıyor...');
        // 800ms bekleyip otomatik doğrula
        setTimeout(() => {
            socket.emit('verify-code', { email, code });
        }, 800);
    } else {
        showToast(message);
    }
});

copyCodeBtn && (copyCodeBtn.onclick = () => {
    navigator.clipboard.writeText(simCodeValue.textContent).then(() => showToast('Kod kopyalandı! ✅'));
});

verifyBtn.onclick = () => {
    const code = codeInput.value.trim();
    if (code.length !== 6) return showToast('Kod 6 haneli olmalıdır.');
    socket.emit('verify-code', { email, code });
};

socket.on('code-verified', (verifiedEmail) => {
    isVerified = true;
    email = verifiedEmail;
    authStatus.textContent = '✅ E-posta başarıyla doğrulandı!';
    authStatus.className = 'status-msg success';
    verificationSection.classList.add('hidden');
    simCodeBox.classList.add('hidden');
    emailInput.disabled = true;
    sendCodeBtn.classList.add('hidden');
    roomIdInput.disabled = false;
    passwordInput.disabled = false;
    joinBtn.disabled = false;
    joinBtn.classList.remove('disabled');
    showToast('Doğrulama başarılı! 🎉');
});

// ── 2. Odaya Katılma ──────────────────────────────────────
joinBtn.onclick = async () => {
    username = usernameInput.value.trim();
    roomId   = roomIdInput.value.trim();
    password = passwordInput.value;

    if (!isVerified) return showToast('Önce e-postayı doğrulayın.');
    if (!username || !roomId || !password) return showToast('Tüm alanları doldurun.');

    // E-posta format kontrolü (eksik girilmiş olabilir)
    if (!email || !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
        return showToast('Geçerli bir e-posta adresi girilmedi! Lütfen doğru formatta girin.');
    }

    // Kullanıcı adı uzunluk kontrolü
    if (username.length < 3) {
        return showToast('Kullanıcı adı en az 3 karakter olmalıdır.');
    }

    // Sadece noktalama işareti kontrolü
    if (!/[a-zA-Z0-9ıİğĞüÜşŞöÖçÇ]/.test(username)) {
        return showToast('Kullanıcı adı sadece noktalama işaretlerinden oluşamaz! En az bir harf veya rakam içermelidir.');
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localLabel.textContent = `Siz (${username})`;
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        currentRoomLbl.textContent = roomId;
        socket.emit('join-room', { roomId, password, username, email });
    } catch {
        showToast('Kamera/Mikrofon izni gereklidir! 📷🎤');
    }
};

// ── 3. WebRTC Sinyalizasyon ───────────────────────────────
socket.on('error-msg', (msg) => {
    showToast(msg);
    if (!chatContainer.classList.contains('hidden')) window.location.reload();
});

socket.on('user-joined', async ({ username: peerName }) => {
    showToast(`🎉 ${peerName} odaya katıldı!`);
    remoteLabel.textContent = peerName;
    statusPill.textContent  = '⚡ Bağlantı Kuruluyor...';
    await initPeerConnection();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId, username });
    addSystemMsg(`${peerName} sohbete katıldı 👋`);
});

socket.on('peer-info', ({ username: peerName }) => {
    remoteLabel.textContent = peerName;
});

socket.on('offer', async ({ offer, username: peerName }) => {
    remoteLabel.textContent = peerName;
    await initPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer, roomId });
    processPendingCandidates();
});

socket.on('answer', async ({ answer }) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    processPendingCandidates();
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
        pendingCandidates.push(candidate);
    }
});

socket.on('user-left', () => {
    showToast('Karşı taraf ayrıldı.');
    addSystemMsg('Bağlantı kesildi 📴');
    resetRemote();
});

async function initPeerConnection() {
    if (peerConnection) return;
    peerConnection = new RTCPeerConnection(iceServers);
    peerConnection.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomId });
    };
    peerConnection.ontrack = (e) => {
        remoteVideo.srcObject = e.streams[0];
        remoteLoader.classList.add('hidden');
        statusPill.textContent = '🟢 Bağlı';
        statusPill.classList.add('connected');
    };
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'disconnected') resetRemote();
    };
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
}

function processPendingCandidates() {
    pendingCandidates.forEach(async c => await peerConnection.addIceCandidate(new RTCIceCandidate(c)));
    pendingCandidates = [];
}

function resetRemote() {
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    remoteVideo.srcObject = null;
    remoteLoader.classList.remove('hidden');
    statusPill.textContent = '🔴 Ayrıldı';
    statusPill.classList.remove('connected');
}

// ── 4. Kontrol Butonları ──────────────────────────────────
micBtn.onclick = () => {
    const t = localStream.getAudioTracks()[0];
    t.enabled = !t.enabled;
    micBtn.classList.toggle('off', !t.enabled);
    micBtn.querySelector('.ctrl-icon').textContent = t.enabled ? '🎤' : '🔇';
};

videoBtn.onclick = () => {
    const t = localStream.getVideoTracks()[0];
    t.enabled = !t.enabled;
    videoBtn.classList.toggle('off', !t.enabled);
    videoBtn.querySelector('.ctrl-icon').textContent = t.enabled ? '📷' : '🚫';
};

shareBtn.onclick = async () => {
    if (!isScreenSharing) {
        try {
            const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const st = ss.getVideoTracks()[0];
            const sender = peerConnection?.getSenders().find(s => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(st);
            localVideo.srcObject = ss;
            shareBtn.classList.add('off');
            shareBtn.querySelector('.ctrl-icon').textContent = '⏹️';
            isScreenSharing = true;
            st.onended = stopSharing;
        } catch { showToast('Ekran paylaşımı iptal edildi.'); }
    } else { stopSharing(); }
};

function stopSharing() {
    const vt = localStream.getVideoTracks()[0];
    const sender = peerConnection?.getSenders().find(s => s.track?.kind === 'video');
    if (sender) sender.replaceTrack(vt);
    localVideo.srcObject = localStream;
    shareBtn.classList.remove('off');
    shareBtn.querySelector('.ctrl-icon').textContent = '🖥️';
    isScreenSharing = false;
}

leaveBtn.onclick = () => window.location.reload();

// ── 5. Sohbet Paneli ──────────────────────────────────────
toggleChatBtn.onclick = () => {
    chatOpen = !chatOpen;
    chatPanel.classList.toggle('hidden', !chatOpen);
    if (chatOpen) { unreadCount = 0; unreadBadge.classList.add('hidden'); }
};

closeChatBtn.onclick = () => {
    chatOpen = false;
    chatPanel.classList.add('hidden');
};

// Mesaj Gönder
function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    const ts = new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
    addMessage(msg, username, ts, true);
    socket.emit('chat-message', { roomId, message: msg, username, timestamp: ts });
    chatInput.value = '';
    socket.emit('stop-typing', { roomId });
}

sendMsgBtn.onclick = sendMessage;
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

// Yazıyor bildirimi
chatInput.addEventListener('input', () => {
    socket.emit('typing', { roomId, username });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('stop-typing', { roomId }), 1500);
});

socket.on('chat-message', ({ message, username: sender, timestamp }) => {
    addMessage(message, sender, timestamp, false);
    if (!chatOpen) {
        unreadCount++;
        unreadBadge.textContent = unreadCount;
        unreadBadge.classList.remove('hidden');
    }
});

socket.on('typing', ({ username: sender }) => {
    typingIndicator.classList.remove('hidden');
    typingIndicator.title = `${sender} yazıyor...`;
});

socket.on('stop-typing', () => {
    typingIndicator.classList.add('hidden');
});

function addMessage(text, sender, timestamp, isMine) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = isMine ? 'flex-end' : 'flex-start';

    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${isMine ? 'mine' : 'theirs'}`;
    bubble.textContent = text;

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    meta.textContent = `${isMine ? 'Siz' : sender} · ${timestamp}`;

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    messagesArea.appendChild(wrap);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function addSystemMsg(text) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    messagesArea.appendChild(div);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ── 6. Emoji Picker ───────────────────────────────────────
const emojis = ['😀','😂','😍','🔥','👍','👋','❤️','🎉','😎','🤔','😅','💪','🙌','✅','🚀','😊','🥳','💯','👏','🤝'];
emojiPicker.innerHTML = '';
emojis.forEach(e => {
    const s = document.createElement('span');
    s.textContent = e;
    s.onclick = () => { chatInput.value += e; chatInput.focus(); };
    emojiPicker.appendChild(s);
});
emojiPicker.classList.add('hidden');

emojiBtn.onclick = () => emojiPicker.classList.toggle('hidden');
document.addEventListener('click', (e) => {
    if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
        emojiPicker.classList.add('hidden');
    }
});

// ── 7. Toast ──────────────────────────────────────────────
function showToast(msg, forceType = null) {
    clearTimeout(toastTimer);
    
    // Default values
    let type = 'info';
    let icon = 'ℹ️';
    let title = 'Bilgi';
    
    // Determine message type based on keywords
    const lowerMsg = msg.toLowerCase();
    if (forceType === 'error' || lowerMsg.includes('hata') || lowerMsg.includes('geçersiz') || lowerMsg.includes('eksik') || lowerMsg.includes('boş') || lowerMsg.includes('izin') || lowerMsg.includes('dolu') || lowerMsg.includes('olmalıdır') || lowerMsg.includes('olamaz') || lowerMsg.includes('doğrulayın')) {
        type = 'error';
        icon = '⚠️';
        title = 'Hata Algılandı';
    } else if (forceType === 'success' || lowerMsg.includes('başarılı') || lowerMsg.includes('kopyalandı') || lowerMsg.includes('doğrulandı') || lowerMsg.includes('uygulandı') || lowerMsg.includes('değiştirildi') || lowerMsg.includes('döndü') || lowerMsg.includes('katıldı')) {
        type = 'success';
        icon = '✅';
        title = 'İşlem Başarılı';
    }
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <div class="toast-details">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${msg}</div>
            </div>
        </div>
    `;
    
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 5000);
}

// ── 8. Arka Plan Değiştirici ──────────────────────────────
const bgPickerBtn   = document.getElementById('bg-picker-btn');
const bgPickerPanel = document.getElementById('bg-picker-panel');
const bgPickerClose = document.getElementById('bg-picker-close');
const bgGrid        = document.getElementById('bg-grid');
const customColor   = document.getElementById('custom-color');
const bgUploadInput = document.getElementById('bg-upload-input');
const bgResetBtn    = document.getElementById('bg-reset-btn');

// Gradyan haritası (data-bg → CSS değeri)
const BG_MAP = {
    default:  'radial-gradient(ellipse at 20% 20%,#1e1b4b,#0f0c29 40%,#1a0533)',
    aurora:   'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
    sunset:   'linear-gradient(135deg,#ff6b6b,#feca57,#ff9ff3)',
    ocean:    'linear-gradient(135deg,#0575e6,#021b79)',
    forest:   'linear-gradient(135deg,#134e5e,#71b280)',
    candy:    'linear-gradient(135deg,#f953c6,#b91d73)',
    midnight: 'linear-gradient(135deg,#232526,#414345)',
    galaxy:   'radial-gradient(ellipse at top,#1b2735,#090a0f)',
    nordic:   'linear-gradient(135deg,#2d6a4f,#1b4332,#081c15)',
    fire:     'linear-gradient(135deg,#f12711,#f5af19)',
    violet:   'linear-gradient(135deg,#4776e6,#8e54e9)',
    rose:     'linear-gradient(135deg,#f64f59,#c471ed,#12c2e9)',
};

const DEFAULT_BG = 'default';

function setBackground(cssValue, isImage = false) {
    if (cssValue === 'default' || cssValue === '') {
        document.body.style.backgroundImage = '';
        document.body.style.background = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
    } else {
        document.body.style.backgroundImage = cssValue;
        document.body.style.backgroundSize = isImage ? 'cover' : '400% 400%';
        document.body.style.backgroundPosition = isImage ? 'center' : '';
        document.body.style.backgroundRepeat   = isImage ? 'no-repeat' : '';
    }
    // gradient animasyonunu durdur/başlat
    document.body.style.animation = isImage ? 'none' : '';
    // bg-orbs'u gizle/göster (görselde orb gereksiz)
    const orbs = document.querySelector('.bg-orbs');
    if (orbs) {
        orbs.style.opacity = isImage ? '0' : (document.body.classList.contains('light-theme') ? '0.2' : '0.25');
    }
}

function setActiveThumb(el) {
    document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
    if (el) el.classList.add('active');
}

// Gradyan kartela tıklamaları
document.querySelectorAll('.bg-swatch[data-bg]').forEach(swatch => {
    swatch.addEventListener('click', () => {
        const key   = swatch.dataset.bg;
        const color = swatch.dataset.color;

        if (key === 'solid' && color) {
            setBackground(color);
        } else if (BG_MAP[key]) {
            setBackground(BG_MAP[key]);
        } else if (key === 'default') {
            setBackground('default');
        }
        setActiveThumb(swatch);
        showToast('Arka plan değiştirildi 🎨');
    });
});

// Özel renk seçici
customColor.addEventListener('input', () => {
    setBackground(customColor.value);
    setActiveThumb(null);
    showToast('Özel renk uygulandı 🖌️');
});

// Görsel yükleme
bgUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        setBackground(`url("${ev.target.result}")`, true);
        setActiveThumb(null);
        showToast('Görsel arka plan uygulandı 🖼️');
    };
    reader.readAsDataURL(file);
});

// Sıfırlama
bgResetBtn.onclick = () => {
    setBackground(DEFAULT_BG);
    document.body.style.animation = '';
    const orbs = document.querySelector('.bg-orbs');
    if (orbs) {
        orbs.style.opacity = document.body.classList.contains('light-theme') ? '0.2' : '0.25';
    }
    setActiveThumb(document.querySelector('.bg-swatch[data-bg="default"]'));
    bgPickerPanel.classList.add('hidden');
    showToast('Varsayılan arka plana döndü ↩');
};

// Panel aç/kapat
bgPickerBtn.onclick = () => bgPickerPanel.classList.toggle('hidden');
bgPickerClose.onclick = () => bgPickerPanel.classList.add('hidden');

// Dışarı tıklandığında kapat
document.addEventListener('click', (e) => {
    if (!bgPickerPanel.classList.contains('hidden') &&
        !bgPickerPanel.contains(e.target) &&
        !bgPickerBtn.contains(e.target)) {
        bgPickerPanel.classList.add('hidden');
    }
});

// ── 9. Tema Değiştirici (Dark / Light Mode) ──────────────────
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeToggleIcon = themeToggleBtn.querySelector('.theme-toggle-icon');

function setTheme(theme) {
    const orbs = document.querySelector('.bg-orbs');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleIcon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
        if (orbs) orbs.style.opacity = '0.2';
    } else {
        document.body.classList.remove('light-theme');
        themeToggleIcon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
        if (orbs) orbs.style.opacity = '0.25';
    }
}

// İlk yükleme
const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);

themeToggleBtn.onclick = () => {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
    showToast(`${isLight ? 'Karanlık' : 'Aydınlık'} tema uygulandı 🌗`);
};
