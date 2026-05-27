# 📡 AuraLink — Güvenli P2P Görüntülü Sohbet Uygulaması

<div align="center">

![AuraLink Banner](public/assets/screenshots/05_active_call.png)

**WebRTC tabanlı, uçtan uca şifreli, sunucu depolaması sıfır olan P2P görüntülü sohbet platformu**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![WebRTC](https://img.shields.io/badge/WebRTC-Native-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 🎯 Proje Hakkında

**AuraLink (P35)**, merkezi sunucu bağımlılığını tamamen ortadan kaldıran, kullanıcılar arasında doğrudan ve şifreli veri akışı sağlayan **WebRTC tabanlı uçtan uca P2P görüntülü sohbet uygulamasıdır.**

> 🔒 Ses, video ve sohbet verileri **hiçbir sunucuda depolanmaz** — doğrudan tarayıcılar arasında şifreli olarak aktarılır.

---

## ✨ Özellikler

| Özellik | Açıklama |
|---|---|
| 🎥 **P2P Görüntülü Görüşme** | WebRTC ile doğrudan tarayıcılar arası video/ses |
| 🔒 **Şifreli Oda Sistemi** | Şifre korumalı, maks. 2 kişilik odalar |
| 📧 **E-posta OTP Doğrulama** | 6 haneli SMTP doğrulama kodu |
| 🖥️ **Ekran Paylaşımı** | `replaceTrack` ile kesintisiz ekran paylaşımı |
| 💬 **Anlık Mesajlaşma** | RTCDataChannel üzerinden şifreli chat + emoji |
| 🎨 **Arka Plan Değiştirici** | 12 gradyan + düz renk + görsel yükleme |
| 🌙 **Karanlık/Aydınlık Tema** | Tam tema desteği |
| 📱 **Responsive Tasarım** | Masaüstü ve mobil uyumlu |
| 🌐 **NAT Traversal** | STUN/TURN sunucuları ile firewall aşma |

---

## 🖼️ Ekran Görüntüleri

<div align="center">

| Giriş Ekranı | OTP Doğrulama |
|:---:|:---:|
| ![Auth](public/assets/screenshots/01_auth_gate.png) | ![OTP](public/assets/screenshots/02_otp_verify.png) |

| Lobi Kurulumu | Bağlanıyor... |
|:---:|:---:|
| ![Lobby](public/assets/screenshots/03_lobby_setup.png) | ![ICE](public/assets/screenshots/04_ice_signaling.png) |

| Aktif P2P Görüşme | Ekran Paylaşımı |
|:---:|:---:|
| ![Call](public/assets/screenshots/05_active_call.png) | ![Screen](public/assets/screenshots/06_screen_sharing.png) |

| Anlık Sohbet | Arka Plan Seçici |
|:---:|:---:|
| ![Chat](public/assets/screenshots/07_data_channel_chat.png) | ![BG](public/assets/screenshots/08_bg_filters.png) |

</div>

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya pnpm

### 1. Repoyu klonla
```bash
git clone https://github.com/RabiaHandil/p2p-connect.git
cd p2p-connect
```

### 2. Bağımlılıkları yükle
```bash
npm install
```

### 3. Ortam değişkenlerini ayarla
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

### 4. Çalıştır
```bash
npm start
```

### 5. Tarayıcıda aç
- **HTTP:** `http://localhost:3000`
- **HTTPS (kamera için):** `https://localhost:3443`

> ⚠️ Kamera/mikrofon için HTTPS gereklidir. "Güvenli değil" uyarısında → "Gelişmiş" → "Devam et"

---

## 🛠️ Teknoloji Stack

```
Frontend  : Vanilla HTML5 + CSS3 + JavaScript (WebRTC API)
Backend   : Node.js + Express + Socket.IO
Protokol  : WebRTC (RTCPeerConnection + RTCDataChannel)
Signaling : WebSocket (Socket.IO)
Email     : Nodemailer (SMTP)
SSL       : Self-signed (selfsigned paketi)
STUN/TURN : Google STUN + OpenRelay TURN
```

---

## 📁 Proje Yapısı

```
projem/
├── server.js          # Node.js + Socket.IO sunucu
├── package.json       # Bağımlılıklar
├── .env.example       # Ortam değişkenleri şablonu
└── public/
    ├── index.html     # Ana HTML
    ├── app.js         # WebRTC + UI mantığı
    ├── style.css      # Glassmorphism CSS
    └── assets/
        ├── screenshots/   # Uygulama ekran görüntüleri
        └── rakipler/      # Rakip logo görselleri
```

---

## 🔐 Güvenlik Özellikleri

- ✅ Medya verisi **hiçbir sunucuya** kaydedilmez (P2P direkt aktarım)
- ✅ DTLS-SRTP ile **uçtan uca şifreleme** (WebRTC varsayılanı)
- ✅ **Şifreli oda** koruması
- ✅ **6 haneli OTP** e-posta doğrulama
- ✅ Oda başına **maksimum 2 kişi** sınırı
- ✅ **KVKK / GDPR** uyumlu sıfır sunucu depolama

---

## 📄 Lisans

MIT License — © 2025 Rabia Handil
