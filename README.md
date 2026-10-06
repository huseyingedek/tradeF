# Tradepilo – Çoklu Borsa Yönetim Paneli

Kripto borsaları, BIST aracı kurumları ve forex hesaplarını tek panelden yönetmek için React frontend'i.
İşi yoğun, ekran başında piyasayı izleyemeyen yatırımcı için tasarlandı: kurallar, botlar ve risk limitleri
onun yerine piyasayı takip eder; acil durumda tek tıkla her şey durdurulur.

> Varsayılan olarak **gerçek backend'e** (`../tradenest-api`, Node.js + PostgreSQL) bağlanır.
> Backend olmadan arayüzü denemek için `.env` içinde `VITE_USE_MOCK=true` yapın (tarayıcı içi simülasyon).

## Kurulum

Önce backend'i çalıştırın (`../tradenest-api/README.md`), sonra:

```bash
npm install
cp .env.example .env     # VITE_USE_MOCK=false, API: http://localhost:8080/api/v1
npm run dev              # http://localhost:5173
npm run build
```

Giriş (backend seed): yatırımcı `demo@tradepilo.com` / `Demo12345!` · admin `admin@tradepilo.com` / `Admin12345!` (ilk girişte 2FA kurulumu).
Mock modda: `demo@tradepilo.com` / `123456`.

## Özellikler

| Sayfa | Neler var |
|---|---|
| Genel Bakış | Toplam varlık, günlük K/Z, portföy grafiği (1G–1Y), varlık dağılımı, canlı izleme listesi, pozisyonlar, hesap durumları, botlar, aktivite |
| Piyasalar | Kripto / BIST / Forex canlı fiyat tablosu, favoriler, en çok yükselen/düşenler, sıralama, arama |
| İşlem Terminali | Mum grafik (TradingView lightweight-charts), canlı emir defteri ve son işlemler, hesap seçimi, gelişmiş emir formu: **Piyasa, Limit, Stop-Piyasa, Stop-Limit, İz Süren Stop, OCO**, kaldıraç (vadeli hesaplarda), emirle birlikte **TP/SL**, % ile miktar, emir onayı; grafikte giriş/SL/TP/emir çizgileri |
| Portföy | Hesap bazında filtre, canlı K/Z'li pozisyonlar, SL/TP düzenleme, %25/50/100 kapatma, nakit bakiyeler, varlık dağılımı |
| Emirler | Açık/geçmiş emirler, çoklu filtre (hesap, sembol, yön, tip, kaynak), toplu iptal, CSV |
| Kurallar & Alarmlar | "EĞER → O ZAMAN" kural oluşturucu: fiyat/değişim/pozisyon K/Z/günlük portföy düşüşü → bildirim, al, sat, kapat, emir iptal, hesap duraklat, kill switch. Tek seferlik / tekrarlı (bekleme süreli). Hazır şablonlar |
| Botlar | DCA, Grid, Trend takip botları; başlat / duraklat / durdur, K/Z grafiği |
| Risk Yönetimi | **Acil durdurma (kill switch)**, tüm emirleri iptal, tüm pozisyonları kapat, günlük zarar limiti (otomatik durdurma), tek emir tutar limiti, maks. açık emir, emir onayı, hesap bazında duraklatma |
| Borsa Bağlantıları | 3 adımlı bağlama sihirbazı (platform → API anahtarları → test), bağlantı testi, anahtar yenileme, duraklatma, kaldırma, platform özellik tablosu |
| İşlem Günlüğü | Manuel / kural / bot / sistem / risk olaylarının zaman çizelgesi, filtre, CSV |
| Ayarlar | Profil, bildirim kanalları (uygulama, e-posta, Telegram), 2FA, backend bağlantı bilgisi, demo verisini sıfırlama |

Header'da her sayfadan erişilebilen **Acil Durdur** butonu, canlı veri durumu, sembol arama ve bildirimler var.

## Admin Paneli (`/admin`)

Platform yöneticileri için ayrı arayüz. Aynı giriş ekranından girilir; admin hesapları **2 adımlı doğrulama** ister.

| Demo hesap (şifre `123456`, 2FA kodu herhangi 6 hane) | Rol |
|---|---|
| `admin@tradepilo.com` | Süper Admin – her şey |
| `risk@tradepilo.com` | Risk Görevlisi – platform riski, entegrasyonlar, kullanıcı işlemlerini durdurma |
| `destek@tradepilo.com` | Destek – kullanıcı hesapları, duyurular |
| `finans@tradepilo.com` | Finans – planlar, ödemeler, iadeler |

| Sayfa | Neler var |
|---|---|
| Genel Bakış | Kullanıcı / aktif / MRR / bağlı hesap KPI'ları, 90 günlük büyüme, plan dağılımı, platform hacmi, entegrasyon sağlığı, güvenlik uyarıları, son admin işlemleri |
| Kullanıcılar | Arama, plan/durum/uyarı filtresi, sıralama, sayfalama, CSV. Detayda: borsa hesapları (maskeli), pozisyon/emir, otomasyon, aktivite, oturumlar, ödemeler, ekip notları; **işlemlerini durdur**, askıya al, oturumları kapat, 2FA sıfırla, plan değiştir (hepsi gerekçeli) |
| Platform Riski | **Global durdurma**, borsa bazında durdurma, maks. kaldıraç, tek emir limiti, kayıt aç/kapa, kullanıcı 2FA zorunluluğu, bakım modu, yasaklı semboller |
| Entegrasyonlar | Her platform için durum, p50/p95 gecikme, hata oranı, API limit kullanımı, uptime; yeni bağlantılara kapatma, bakım modu; olay (incident) listesi |
| Abonelik & Ödemeler | Plan yönetimi (fiyat, limitler, özellikler), MRR/ARR, aylık gelir grafiği, ödemeler ve gerekçeli iade |
| Duyurular | Hedef kitleli (tümü / plan bazlı), zamanlanmış duyurular; kullanıcı panelinde banner olarak görünür |
| Denetim Günlüğü | Tüm admin işlemleri (kim, ne, kime, gerekçe, IP), filtre, CSV |
| Ekip & Roller | Admin davet etme, rol değiştirme, erişim kapatma, rol-yetki matrisi |

Admin'de yapılan değişiklikler kullanıcı paneline anında yansır (mock'ta da): global/borsa durdurma, yasaklı sembol,
kaldıraç ve emir limiti, kullanıcı askıya alma / işlem durdurma, plan limitleri (borsa, bot, kural sayısı) ve duyurular.

## Mimari

```
src/
  api/
    config.js         .env okuma (mock / gerçek)
    http.js           fetch istemcisi (token, zaman aşımı, hata normalize) – mock modda mock/server.js'e gider
    realtime.js       WebSocket istemcisi (abonelik, yeniden bağlanma, heartbeat) – mock modda motor
    services/*.js     ← GERÇEK API'YE GEÇERKEN DEĞİŞECEK TEK YER (uç nokta yolları)
    queries.js        React Query hook'ları + canlı senkron (sayfalar yalnızca bunu kullanır)
  mock/
    admin.js          admin backend simülasyonu (kullanıcılar, planlar, RBAC, audit…)
    data.js           başlangıç verisi (platformlar, hesaplar, pozisyonlar, kurallar, botlar…)
    engine.js         simülasyon motoru (fiyat, emir eşleştirme, TP/SL, kurallar, botlar, risk)
    server.js         REST rotaları (gerçek API ile aynı sözleşme)
  hooks/useMarket.js  canlı ticker store, emir defteri, son işlemler
  components/         layout, ortak UI, trading/ (grafik, emir formu, tablolar)
  pages/              sayfalar
docs/API.md           backend sözleşmesi (REST + WebSocket + Admin API)
```

## Backend

Backend `../tradenest-api` klasöründe (Fastify + Prisma + PostgreSQL). Uç noktaların tam listesi oradaki README'de.
Farklı bir sunucuya bağlanmak için `.env` → `VITE_API_URL`, `VITE_WS_URL`.

> Uyarı: Bu yazılım yatırım tavsiyesi değildir. Otomatik işlemler ve kaldıraç ciddi kayıplara yol açabilir.
