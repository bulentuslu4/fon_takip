# FonTakip - Kurulum ve Kullanım Rehberi

## 📱 Dışarıdan Erişim (GitHub Pages)

### Adım 1: GitHub Hesabı Aç
1. https://github.com adresine git
2. "Sign up" ile ücretsiz hesap oluştur

### Adım 2: Yeni Repository Oluştur
1. GitHub'da sağ üstten "+" → "New repository"
2. Repository name: `fon-takip` (veya istediğin bir isim)
3. Public seç (GitHub Pages ücretsiz olması için)
4. "Create repository" butonuna bas

### Adım 3: Dosyaları Yükle
1. Repository sayfasında "uploading an existing file" linkine tıkla
2. Şu dosyaları sürükle:
   - `index.html`
   - `styles.css`
   - `app.js`
3. "Commit changes" butonuna bas

### Adım 4: GitHub Pages Aktifleştir
1. Repository → Settings → Pages
2. Source: "Deploy from a branch" seç
3. Branch: "main" seç, folder: "/ (root)"
4. Save butonuna bas
5. Birkaç dakika bekle

### Adım 5: Erişim! 🎉
Adres: `https://KULLANICI-ADIN.github.io/fon-takip`
- iPhone Safari'den aç
- Ana ekrana ekle (Share → "Ana Ekrana Ekle") → Uygulama gibi çalışır!

---

## 📲 Telegram Bildirim Botu Kurulumu

### Adım 1: Bot Oluştur (2 dakika)
1. Telegram'da **@BotFather** ara ve aç
2. `/newbot` yaz
3. Bot adı: `FonTakip Bildirim`
4. Kullanıcı adı: `fontakip_senin_adin_bot` (benzersiz olmalı)
5. **API Token**'ı kopyala (örn: `1234567890:ABCdefGhIjKlMnOpQrStUvWxYz`)

### Adım 2: Chat ID'ni Öğren
1. Telegram'da **@userinfobot** ara ve aç
2. `/start` yaz
3. Gelen mesajdaki **Id** numarasını kopyala (örn: `987654321`)

### Adım 3: Bot'u Yapılandır
1. `bildirim_bot.py` dosyasını aç
2. Şu satırları güncelle:
```python
TELEGRAM_BOT_TOKEN = "1234567890:ABCdefGhIjKlMnOpQrStUvWxYz"
TELEGRAM_CHAT_ID = "987654321"
```

### Adım 4: Test Et
```
cd C:\Users\User1\Desktop\fon
python bildirim_bot.py test
```
Telegram'ına test mesajı gelecek!

### Adım 5: Çalıştır
```
python bildirim_bot.py
```
Günlük rapor Telegram'ına gelecek!

### Adım 6: Otomatik Çalıştırma (GitHub Actions ile 7/24 Bulutta)
Artık PC'nin açık kalmasına gerek yok! Uygulamanı GitHub'a yüklediğinde bot bulutta otomatik çalışacak. 
Bunun için Telegram şifrelerini GitHub'a güvenli bir şekilde eklememiz lazım:

1. GitHub'da deponu (repository) aç
2. Üst menüden **Settings** > Sol menüden **Secrets and variables** > **Actions** seç
3. **"New repository secret"** butonuna bas:
   - Name: `TELEGRAM_BOT_TOKEN`
   - Secret: *Bot tokenını yapıştır*
   - Add secret de
4. Tekrar **"New repository secret"** butonuna bas:
   - Name: `TELEGRAM_CHAT_ID`
   - Secret: *Chat ID numaranı yapıştır*
   - Add secret de

Her şey hazır! Artık hafta içi her gün saat 18:00'de borsa verileri güncellendikten sonra GitHub otomatik olarak botunu çalıştırıp sana rapor gönderecek! İstersen GitHub'da üstteki **Actions** sekmesine gidip manuel olarak da çalıştırabilirsin.

---

## 💾 Portföy Verisini Bota Aktarma

Botun sana **"Günlük Kâr/Zarar"** değerini ve portföy büyüklüğünü atabilmesi için senin portföyündeki hisse adetlerini bilmesi lazım:
1. Uygulamada işlemlerini gir
2. "Portföy" sekmesinin en altındaki **"📥 Portföy Verisini İndir"** butonuna bas
3. İnen `portfolio_export.json` dosyasını `fon` klasörüne at
4. Daha sonra bu dosyayı GitHub'a da yükle (Commit & Push)
*Not: Sen bu dosyayı güncellemesen bile bot güncel FON FİYATLARINI atmaya devam edecektir. Sadece kendi kâr/zararını görmek için bu veriye ihtiyacı var.*

## 📋 Bildirim Türleri

| Bildirim | Ne Zaman? | Örnek |
|----------|-----------|-------|
| 📊 Günlük Rapor | Her gün 18:00 | Fon fiyatları + portföy durumu |
| 📈 Fiyat Artışı | Fon %3+ yükseldiğinde | "AFA %4.2 yükseldi!" |
| 📉 Fiyat Düşüşü | Fon %3+ düştüğünde | "IJC %5.1 düştü!" |
| 🎉 Milestone | Portföy hedefi geçince | "Portföyün ₺10.000'i geçti!" |
| 📅 Haftalık Özet | Her Pazar | Haftalık özet rapor |
| ⏰ Aylık Hatırlatma | Ayın 1'i ve 15'i | "Aylık yatırımını yaptın mı?" |
