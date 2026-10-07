// =====================================================================
//  "Bu anahtarları nasıl alırım?" – platform bazında kısa rehberler
//  Borsaların menü adları zamanla değişebilir; adımlar genel tutuldu.
// =====================================================================

const SAFE = 'Sadece okuma ve işlem iznini açın. Para çekme (withdraw) iznini asla açmayın.'

export const API_KEY_GUIDES = {
  binance: {
    url: 'https://www.binance.com/en/my/settings/api-management',
    urlLabel: 'Binance API Yönetimi',
    steps: [
      '**binance.com** hesabınız olmalı. **Binance TR (binance.tr)** ayrı bir borsadır, oradan alınan anahtarlar burada çalışmaz.',
      'Binance\'e girin (web veya mobil uygulama). Uygulamada üstteki arama çubuğuna **API** yazıp **API Management** (API Yönetimi) sayfasını açın.',
      '**Create API** (API Oluştur) → **System generated** (Sistem tarafından oluşturulan) seçin, bir ad verin (ör. Tradepilo).',
      'Güvenlik doğrulamasını (e-posta / SMS / 2FA) tamamlayın.',
      '**Edit restrictions** (Kısıtlamaları düzenle): **Enable Reading** ve **Enable Spot & Margin Trading** açık olsun. **Enable Withdrawals** KAPALI kalsın. ' + SAFE,
      'Mümkünse **Restrict access to trusted IPs only** (yalnızca güvenilir IP\'ler) seçeneğini açın.',
      '**API Key** ve **Secret Key**\'i kopyalayıp buraya yapıştırın. Secret yalnızca bir kez gösterilir.',
    ],
  },
  bybit: {
    url: 'https://www.bybit.com/app/user/api-management',
    urlLabel: 'Bybit API Yönetimi',
    steps: [
      'Bybit hesabınıza girin, profil menüsünden **API**\'yi açın.',
      '**Yeni Anahtar Oluştur** → **Sistem tarafından oluşturulan API anahtarları**\'nı seçin.',
      'Kullanım: **API İşlemleri**, izin: **Okuma-Yazma** seçin; işlem izinlerinden spot/vadeli emirleri işaretleyin. ' + SAFE,
      'Mümkünse IP kısıtlaması ekleyin.',
      'Doğrulamayı tamamlayın; **API Key** ve **API Secret**\'ı buraya yapıştırın. Secret yalnızca bir kez gösterilir.',
    ],
  },
  okx: {
    url: 'https://www.okx.com/account/my-api',
    urlLabel: 'OKX API sayfası',
    steps: [
      'OKX hesabınıza girin, profil menüsünden **API** sayfasını açın.',
      '**API anahtarı oluştur**\'a tıklayın, amaç olarak **API ile işlem**\'i seçin.',
      'Bir ad ve **Passphrase** belirleyin. Passphrase\'i siz koyarsınız; not edin, buraya da gireceksiniz.',
      'İzinler: **Okuma** ve **İşlem**. ' + SAFE,
      'Mümkünse IP adresi ekleyin.',
      '**API Key**, **Secret Key** ve **Passphrase**\'i buraya yapıştırın.',
    ],
  },
  kraken: {
    steps: [
      'Kraken Pro\'ya girin, profil simgesinden **Ayarlar → API**\'yi açın.',
      '**Yeni anahtar oluştur**\'a tıklayın ve bir ad verin.',
      'İzinler: **Bakiyeleri sorgula**, **Açık/kapalı emirleri sorgula**, **Emir oluştur ve değiştir**, **Emir iptal et**. Para çekme iznini açmayın.',
      'Anahtarı oluşturun; **API Key** ve **Private Key**\'i buraya yapıştırın. Private Key yalnızca bir kez gösterilir.',
    ],
  },
  btcturk: {
    steps: [
      'BtcTurk hesabınıza girin, hesap menüsünden **API Erişimi** bölümünü açın.',
      'Yeni bir API anahtarı oluşturun; istenirse IP adresini tanımlayın.',
      'Yetkilerden **okuma** ve **al-sat (işlem)** seçin. ' + SAFE,
      'Oluşan **Public Key** ve **Private Key**\'i buraya yapıştırın. Private Key yalnızca bir kez gösterilir.',
    ],
  },
  oanda: {
    steps: [
      'OANDA hesabınıza (fxTrade) web üzerinden girin.',
      'Hesap ayarlarında **API Erişimini Yönet (Manage API Access)** bölümünü açın.',
      '**Oluştur (Generate)** ile kişisel erişim token\'ı üretin ve kopyalayın.',
      '**Hesap ID**\'nizi hesap özetinde bulabilirsiniz (ör. 001-001-1234567-001).',
      'Hesap ID\'yi ve token\'ı buraya girin. Demo (practice) hesap kullanıyorsanız "Test ağı / demo hesap" kutusunu işaretleyin.',
    ],
  },
  bist_broker: {
    steps: [
      'BIST aracı kurum entegrasyonu henüz bağlı değil; hesap şimdilik sanal (paper) modda çalışır.',
      'Anahtar alanlarını boş bırakıp sanal hesap açabilirsiniz.',
      'Aracı kurumunuzun API hizmeti varsa bilgileri kurumunuzun müşteri hizmetlerinden alabilirsiniz.',
    ],
  },
  custom_rest: {
    steps: [
      'Bağlanmak istediğiniz servisin API dokümantasyonundan Base URL, API Key ve Secret bilgilerini alın.',
      'Anahtarı yalnızca okuma ve işlem izniyle oluşturun; para çekme izni vermeyin.',
    ],
  },
}
