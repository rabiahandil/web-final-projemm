# WebRTC P2P Görüntülü Sohbet

> **WebRTC ile P2P görüntülü sohbet — Zoom'suz, signaling dışı sunucu yok**

![Zorluk](https://img.shields.io/badge/Zorluk-%C3%87ok%20Zor-blueviolet)
![Puan](https://img.shields.io/badge/Puan-100-blue)
![Hafta](https://img.shields.io/badge/Hafta-4-gray)
![Lisans](https://img.shields.io/badge/License-MIT-green)
![Durum](https://img.shields.io/badge/Durum-Tamamland%C4%B1-yellow)

## 🎯 Özet

AuraLink (P35), merkezi bir medya sunucusuna ihtiyaç duymadan, kullanıcılar arasında doğrudan (Peer-to-Peer) veri akışı sağlayan WebRTC tabanlı şifreli bir görüntülü sohbet uygulamasıdır. Klasik platformların aksine medya trafiği hiçbir sunucuda depolanmaz veya izlenemez. 

Gizliliği ön planda tutan bu proje; avukatlar, terapistler ve hassas veri iletişimi yapan şirketler için tasarlanmıştır. Sadece odaları eşleştirmek (sinyalleşme) ve SMTP e-posta tabanlı 6 haneli OTP doğrulama kodunu göndermek için Node.js ve Socket.IO kullanır.

### Neden P2P (Peer-to-Peer)?

1. **Görüntü ve Ses Akışı P2P'dir (WebRTC):** Kullanıcılar kamerayı ve mikrofonu açtığında, video/ses verileri bir sunucuya gidip oradan karşı tarafa aktarılmaz. WebRTC teknolojisi sayesinde doğrudan A kullanıcısından B kullanıcısına şifreli bir tünel üzerinden akar. Bu sayede sunucuda veri depolanması veya izlenmesi teknik olarak imkansızdır.
2. **Sunucunun Tek Rolü "Sinyalleşme" (Signaling):** İki bilgisayarın doğrudan birbirine bağlanabilmesi için önce birbirlerini bulmaları gerekir. Node.js ve Socket.IO sadece bu tanışma aşamasında devreye girer. Eşleşme sağlandıktan sonra medya aktarımı için sunucu aradan çekilir.
3. **Güvenlik ve OTP:** Sunucu ayrıca kimlik doğrulaması (SMTP ile e-posta OTP kodunun gönderilmesi) gibi güvenlik katmanlarını yönetir, ancak kişisel medya akışına asla dokunmaz.

## 🎥 Demo

🔗 **Canlı Demo (GitHub):** https://github.com/RabiaHandil/p2p-connect
👤 **Demo Hesap:** E-posta doğrulaması (OTP) aktif olduğu için **kendi e-postanızı** kullanarak test edebilirsiniz. (Test oda şifresi: `1234`)

> _Not: Uygulamanın kamera ve mikrofon donanımlarına erişebilmesi için `https://localhost:3443` üzerinden çalıştırılması tavsiye edilir. Selfsigned SSL desteği projenin içine entegre edilmiştir._

### Ekran Görüntüleri

| Giriş ve OTP | Lobi ve Bağlantı | P2P Görüşme ve Ekran Paylaşımı |
|---------|-----------|--------|
| ![Giriş](repo/public/assets/screenshots/01_auth_gate.png) | ![Lobi](repo/public/assets/screenshots/03_lobby_setup.png) | ![Görüşme](repo/public/assets/screenshots/05_active_call.png) |

## ✨ Ana Özellikler

- ✅ Özel şifreli oda sistemi ile katıl/oluştur (Maks 2 Kişi)
- ✅ SMTP e-posta tabanlı 6 haneli OTP doğrulama
- ✅ WebRTC RTCPeerConnection ile P2P görüntülü ve sesli görüşme
- ✅ `replaceTrack` yöntemiyle anlık Ekran Paylaşımı
- ✅ WebRTC RTCDataChannel üzerinden metin sohbeti (Chat & Emojiler)
- ✅ Mikrofon/Kamera aç-kapat (Mute/Unmute) donanım kontrolleri
- ✅ Dinamik Arka Plan ve Tema Filtreleri (Glassmorphism UI)
- ✅ Sıfır sunucu depolaması (Medya verileri buluta gitmez)

## 🧰 Tech Stack

**Core:** `WebRTC (RTCPeerConnection, RTCDataChannel)`  
**Signaling:** `Node.js, Express, Socket.IO`  
**TURN server:** `Google STUN + OpenRelay TURN (Yedekli)`  
**Frontend:** `Vanilla JavaScript (ES6+), HTML5`  
**UI:** `Özel Tasarım CSS3 (Glassmorphism & Değişkenler)`  
**Güvenlik:** `Nodemailer (OTP), selfsigned (SSL HTTPS)`  

> Teknoloji seçimlerinin detaylı gerekçesi: [PROJE-RAPORU.md · Bölüm 7](PROJE-RAPORU.md#7-teknoloji-yığını-tech-stack)

## 🏗 Mimari

Mimari Context (C1) şemasına ve detaylı sequence (sinyalleşme) diyagramlarına rapor dosyasından ulaşabilirsiniz. Tüm peer bağlantı süreci uçtan uca şifrelidir (DTLS-SRTP).

[Detaylı mimari ve WebRTC Akışları →](PROJE-RAPORU.md#8-sistem-mimarisi)

## 🚀 Kurulum

### Gereksinimler

- Node.js ≥ 18
- HTTPS zorunlu (getUserMedia API'si için)

### Adım Adım

```bash
# 1) Proje klasörüne gidin (veya git clone yapın)
cd repo

# 2) Bağımlılıkları yükle
npm install

# 3) Environment dosyası (.env.example dosyasının adını .env yapın)
# İçerisine SMTP e-posta ayarlarınızı girin. (Test/Simülasyon modu varsayılan açıktır)
cp .env.example .env

# 4) Sunucuyu Çalıştır
npm start
```

Proje: https://localhost:3443 (Tarayıcınızın "Gelişmiş -> Güvenli Değil" uyarısını geçerek erişin, bu selfsigned SSL için normaldir).

## 📁 Klasör Yapısı (bu teslimde)

```
.
├── README.md                   (bu dosya — özet, kurulum, demo)
├── PROJE-RAPORU.md             (uzun form final raporu — markdown)
├── LICENSE
└── repo/                       (projenizin kaynak kodu — arayüz ve sunucu)
    ├── server.js               (Node.js + Socket.IO Signaling Server)
    ├── .env.example
    ├── package.json
    └── public/                 (Frontend HTML, JS, CSS, Görseller)
```

## 🛣 Roadmap

- [x] V1 — MVP (bu teslim - P2P Video, OTP, Chat, Ekran Paylaşımı)
- [ ] V2 — WebRTC DataChannel üzerinden şifreli P2P Dosya Gönderimi
- [ ] V3 — AI destekli arka plan bulanıklaştırma (Virtual Background)

## 🤝 Katkı

Bu proje **BMU1208 Web Tabanlı Programlama** dersi kapsamında **Bitlis Eren Üniversitesi** — **Bilgisayar Mühendisliği** bölümünde bir final ödevi olarak geliştirilmiştir.

Ders yürütücüsü: **Dr. Öğr. Üyesi Davut ARI**

Kod katkısı beklenmez, ancak fikir / feedback için issue açabilirsiniz.

## 📜 Lisans

MIT © 2026 **RABİA HANDİL** — Tam metin için [LICENSE](LICENSE).

## 🙋♂️ İletişim

- **Öğrenci:** RABİA HANDİL
- **Öğrenci No:** 24080410008
- **E-posta:** handilrabia@gmail.com
- **Ders:** BMU1208 · Web Tabanlı Programlama
- **Kurum:** Bitlis Eren Üniversitesi — Mühendislik-Mimarlık Fakültesi

---

<sub>🤖 Bu projede asistan yapay zeka araçları kullanılmıştır. Tüm mimari kararlar ve kullanım tercihleri öğrenci tarafından yapılmıştır.</sub>
