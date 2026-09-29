"""
FonTakip - Telegram Bildirim Botu
TEFAS'tan fon fiyatlarını çeker, analiz eder ve Telegram'dan bildirim gönderir.

Kullanım:
    1. Telegram'da @BotFather ile bot oluştur
    2. @userinfobot ile Chat ID'ni öğren  
    3. Aşağıdaki TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID'yi doldur
    4. python bildirim_bot.py çalıştır

Zamanlanmış çalıştırma:
    Windows Görev Zamanlayıcı ile günde 1-2 kez çalıştırabilirsin.
"""

import requests
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
try:
    from tefas import Crawler
except ImportError:
    print("tefas-crawler kütüphanesi bulunamadi. Lutfen 'pip install tefas-crawler' komutunu calistirin.")
    sys.exit(1)

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path
try:
    from tefas import Crawler
except ImportError:
    print("tefas-crawler kütüphanesi bulunamadi. Lutfen 'pip install tefas-crawler' komutunu calistirin.")
    sys.exit(1)

# ============================================================
# ⚠️ GÜVENLİK: GitHub'da public repo kullandığımız için 
# Token'ları artık kodun içine YAZMIYORUZ. 
# GitHub Secrets'tan (çevre değişkenlerinden) alacağız.
# ============================================================
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "BURAYA_TEST_ICIN_YAZABILIRSIN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "BURAYA_TEST_ICIN_YAZABILIRSIN")
# ============================================================

# Fon tanımları
FUNDS = {
    "AFA": {"name": "Ak Portföy Amerika Hisse", "target": 35, "type": "ABD Hisse"},
    "AFT": {"name": "Ak Portföy Yeni Teknolojiler", "target": 25, "type": "Teknoloji"},
    "IJC": {"name": "İş Portföy Yarı İletken", "target": 15, "type": "Yarı İletken"},
    "GTA": {"name": "Garanti Portföy Altın", "target": 15, "type": "Altın"},
    "AKE": {"name": "Ak Portföy Eurobond", "target": 10, "type": "Eurobond"},
}

# Milestone'lar (TL)
MILESTONES = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000]

# Değişim eşikleri
DAILY_CHANGE_ALERT = 3.0      # %3 günlük değişim
WEEKLY_CHANGE_ALERT = 5.0     # %5 haftalık değişim
TOTAL_PNL_ALERT = 10.0        # %10 toplam kâr/zarar değişimi

# Veri dosyası (geçmiş fiyatları saklar)
DATA_FILE = Path(__file__).parent / "bildirim_data.json"


def load_data():
    """Geçmiş verileri yükle"""
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "prices": {},
        "history": [],
        "last_milestone": 0,
        "last_weekly_report": None,
        "portfolio_value_history": []
    }


def save_data(data):
    """Verileri kaydet"""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def fetch_all_prices():
    """Tüm fon fiyatlarını çek (tefas-crawler kullanarak)"""
    prices = {}
    print("Fon fiyatlari TEFAS'tan cekiliyor...")
    
    crawler = Crawler()
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
    
    for code in FUNDS:
        try:
            data = crawler.fetch(start=yesterday, end=today, name=code, columns=['date', 'price'])
            if data is not None and not data.empty:
                # Get the most recent price (last row)
                latest_price = float(data.iloc[-1]['price'])
                prices[code] = latest_price
                print(f"  [OK] {code}: {latest_price:.4f} TL")
            else:
                print(f"  [HATA] {code}: Fiyat alinamadi (veri bos)")
        except Exception as e:
            print(f"  [HATA] {code}: {e}")
            
    return prices


def send_telegram(message, parse_mode="HTML"):
    """Telegram'dan mesaj gönder"""
    if TELEGRAM_BOT_TOKEN == "BURAYA_BOT_TOKEN_YAZ":
        print("Uyari: Telegram bot token ayarlanmamis! bildirim_bot.py dosyasini duzenle.")
        print(f"Gonderilecek mesaj:\n{message}")
        return False
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            print("Telegram mesaji gonderildi!")
            return True
        else:
            print(f"Telegram hatasi: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Telegram baglanti hatasi: {e}")
        return False


def check_price_changes(current_prices, stored_data):
    """Fiyat değişimlerini kontrol et ve bildirim gönder"""
    alerts = []
    previous_prices = stored_data.get("prices", {})
    
    for code, current_price in current_prices.items():
        if code in previous_prices and previous_prices[code] > 0:
            prev_price = previous_prices[code]
            change_pct = ((current_price - prev_price) / prev_price) * 100
            
            if abs(change_pct) >= DAILY_CHANGE_ALERT:
                emoji = "🟢📈" if change_pct > 0 else "🔴📉"
                direction = "yükseldi" if change_pct > 0 else "düştü"
                alerts.append(
                    f"{emoji} <b>{code}</b> %{abs(change_pct):.2f} {direction}!\n"
                    f"   ₺{prev_price:.4f} → ₺{current_price:.4f}"
                )
    
    return alerts


def check_milestones(portfolio_value, stored_data):
    """Milestone kontrolü"""
    last_milestone = stored_data.get("last_milestone", 0)
    
    for milestone in MILESTONES:
        if portfolio_value >= milestone and last_milestone < milestone:
            stored_data["last_milestone"] = milestone
            return milestone
    
    return None


def calculate_portfolio_value(prices, stored_data):
    """
    Portföy değerini hesapla.
    Not: Bu fonksiyon web uygulamasındaki işlem verilerini kullanır.
    Eğer web uygulamasından export edilmiş veri yoksa, 
    basit bir tahmin kullanır.
    """
    portfolio_file = Path(__file__).parent / "portfolio_export.json"
    
    if portfolio_file.exists():
        try:
            with open(portfolio_file, "r", encoding="utf-8") as f:
                portfolio = json.load(f)
            
            total_value = 0
            total_cost = 0
            fund_details = {}
            
            for code in FUNDS:
                if code in portfolio.get("holdings", {}):
                    holding = portfolio["holdings"][code]
                    units = holding.get("units", 0)
                    cost = holding.get("totalCost", 0)
                    
                    if code in prices:
                        value = units * prices[code]
                    else:
                        value = cost  # Fiyat yoksa maliyeti kullan
                    
                    total_value += value
                    total_cost += cost
                    fund_details[code] = {
                        "value": value,
                        "cost": cost,
                        "pnl": value - cost,
                        "pnl_pct": ((value - cost) / cost * 100) if cost > 0 else 0
                    }
            
            return {
                "total_value": total_value,
                "total_cost": total_cost,
                "total_pnl": total_value - total_cost,
                "total_pnl_pct": ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0,
                "funds": fund_details
            }
        except Exception as e:
            print(f"  ⚠️ Portföy dosyası okunamadı: {e}")
    
    return None


def build_daily_report(prices, portfolio_data, price_alerts):
    """Günlük rapor mesajı oluştur"""
    now = datetime.now()
    
    msg = f"📊 <b>FonTakip Günlük Rapor</b>\n"
    msg += f"📅 {now.strftime('%d %B %Y %H:%M')}\n"
    msg += "━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    # Fon fiyatları
    msg += "💹 <b>Güncel Fon Fiyatları:</b>\n"
    for code in FUNDS:
        if code in prices:
            msg += f"  • {code}: ₺{prices[code]:.4f}\n"
    
    msg += "\n"
    
    # Portföy durumu
    if portfolio_data:
        pnl_emoji = "🟢" if portfolio_data["total_pnl"] >= 0 else "🔴"
        msg += f"💰 <b>Portföy Durumu:</b>\n"
        msg += f"  Toplam Değer: ₺{portfolio_data['total_value']:,.2f}\n"
        msg += f"  Yatırılan: ₺{portfolio_data['total_cost']:,.2f}\n"
        msg += f"  {pnl_emoji} Kâr/Zarar: ₺{portfolio_data['total_pnl']:,.2f}"
        msg += f" ({'+' if portfolio_data['total_pnl_pct'] >= 0 else ''}{portfolio_data['total_pnl_pct']:.2f}%)\n\n"
    
    # Fiyat uyarıları
    if price_alerts:
        msg += "⚡ <b>Önemli Değişimler:</b>\n"
        for alert in price_alerts:
            msg += f"{alert}\n"
        msg += "\n"
    
    msg += "━━━━━━━━━━━━━━━━━━━━━\n"
    msg += "🔗 FonTakip Uygulaması'ndan detaylara bak"
    
    return msg


def build_milestone_message(milestone, portfolio_value):
    """Milestone mesajı oluştur"""
    msg = f"🎉🎉🎉 <b>MILESTONE!</b> 🎉🎉🎉\n\n"
    msg += f"Portföyün <b>₺{milestone:,}</b> seviyesini geçti! 🚀\n"
    msg += f"Güncel değer: ₺{portfolio_value:,.2f}\n\n"
    msg += "Tebrikler! Düzenli yatırımın meyvesini veriyor! 💪\n"
    msg += f"Sonraki hedef: ₺{next(m for m in MILESTONES if m > milestone):,}"
    return msg


def build_weekly_summary(prices, stored_data):
    """Haftalık özet oluştur"""
    history = stored_data.get("portfolio_value_history", [])
    
    msg = f"📈 <b>FonTakip Haftalık Özet</b>\n"
    msg += f"📅 {datetime.now().strftime('%d %B %Y')}\n"
    msg += "━━━━━━━━━━━━━━━━━━━━━\n\n"
    
    msg += "💹 <b>Fon Fiyatları:</b>\n"
    for code in FUNDS:
        if code in prices:
            msg += f"  • {code} ({FUNDS[code]['type']}): ₺{prices[code]:.4f}\n"
    
    msg += "\n📌 <b>Hatırlatmalar:</b>\n"
    msg += "  • Aylık 1.000 TL yatırımını yaptın mı?\n"
    msg += "  • Portföy dengesini kontrol et\n"
    msg += "  • TEFAS'tan fiyatları FonTakip'e gir\n"
    
    msg += "\n━━━━━━━━━━━━━━━━━━━━━\n"
    msg += "💡 Düzenli yatırım, uzun vadede en güçlü stratejidir!"
    
    return msg


def send_monthly_reminder():
    """Aylık yatırım hatırlatması"""
    now = datetime.now()
    
    # Her ayın 1'i ve 15'inde hatırlat
    if now.day in [1, 15]:
        msg = f"⏰ <b>Aylık Yatırım Hatırlatması</b>\n\n"
        msg += "Bu ay düzenli yatırımını yaptın mı? 🤔\n\n"
        msg += "📋 <b>Önerilen Dağılım (₺1.000):</b>\n"
        for code, fund in FUNDS.items():
            amount = fund["target"] * 10  # %target × 1000/100
            msg += f"  • {code}: ₺{amount}\n"
        msg += "\n💪 Düzenli yatırım = DCA = Uzun vadeli başarı!"
        
        send_telegram(msg)


def run():
    """Ana çalıştırma fonksiyonu"""
    print("=" * 50)
    print("🚀 FonTakip Bildirim Botu")
    print(f"📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 50)
    
    # Veri yükle
    stored_data = load_data()
    
    # Fiyatları çek
    prices = fetch_all_prices()
    
    if not prices:
        print("❌ Hiçbir fiyat alınamadı. Çıkılıyor...")
        return
    
    # Fiyat değişim kontrolü
    price_alerts = check_price_changes(prices, stored_data)
    
    # Portföy hesapla
    portfolio_data = calculate_portfolio_value(prices, stored_data)
    
    # Milestone kontrolü
    if portfolio_data:
        milestone = check_milestones(portfolio_data["total_value"], stored_data)
        if milestone:
            milestone_msg = build_milestone_message(milestone, portfolio_data["total_value"])
            send_telegram(milestone_msg)
            print(f"🎉 Milestone bildirimi gönderildi: ₺{milestone:,}")
    
    # Günlük rapor
    report = build_daily_report(prices, portfolio_data, price_alerts)
    send_telegram(report)
    
    # Haftalık özet (Pazar günleri)
    now = datetime.now()
    if now.weekday() == 6:  # Pazar
        last_weekly = stored_data.get("last_weekly_report")
        if last_weekly != now.strftime("%Y-%W"):
            weekly = build_weekly_summary(prices, stored_data)
            send_telegram(weekly)
            stored_data["last_weekly_report"] = now.strftime("%Y-%W")
    
    # Aylık hatırlatma
    send_monthly_reminder()
    
    # Verileri güncelle ve kaydet
    stored_data["prices"] = prices
    stored_data["history"].append({
        "date": now.isoformat(),
        "prices": prices
    })
    
    # Sadece son 90 günlük geçmişi tut
    if len(stored_data["history"]) > 90:
        stored_data["history"] = stored_data["history"][-90:]
    
    if portfolio_data:
        stored_data["portfolio_value_history"].append({
            "date": now.isoformat(),
            "value": portfolio_data["total_value"]
        })
    
    save_data(stored_data)
    
    # Web uygulaması için fiyatları dışa aktar (prices.json)
    try:
        prices_export = prices.copy()
        prices_export["last_updated"] = now.isoformat()
        with open(Path(__file__).parent / "prices.json", "w", encoding="utf-8") as f:
            json.dump(prices_export, f, ensure_ascii=False, indent=2)
        print("✅ Fiyatlar web uygulaması için (prices.json) güncellendi.")
    except Exception as e:
        print(f"⚠️ prices.json güncellenirken hata: {e}")
    
    print("\n✅ Tamamlandı!")


def test_telegram():
    """Telegram bağlantısını test et"""
    print("Telegram baglanti testi...")
    result = send_telegram(
        "🧪 <b>FonTakip Test Mesajı</b>\n\n"
        "Telegram bildirim sistemi çalışıyor! ✅\n"
        "Artık fon fiyatları, milestone'lar ve hatırlatmalar "
        "buradan gelecek.\n\n"
        f"📅 {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    )
    if result:
        print("Test basarili! Telegram'ini kontrol et.")
    else:
        print("Test basarisiz. Token ve Chat ID'yi kontrol et.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        test_telegram()
    else:
        run()
