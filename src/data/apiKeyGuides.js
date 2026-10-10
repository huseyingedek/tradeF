import { t } from '../i18n'
// =====================================================================
//  "Bu anahtarları nasıl alırım?" – platform bazında kısa rehberler
//  Borsaların menü adları zamanla değişebilir; adımlar genel tutuldu.
// =====================================================================

const SAFE = t('Sadece okuma ve işlem iznini açın. Para çekme (withdraw) iznini asla açmayın.')

export const API_KEY_GUIDES = {
  binance: {
    url: 'https://www.binance.com/en/my/settings/api-management',
    urlLabel: t('Binance API Yönetimi'),
    steps: [
      t('**binance.com** hesabınız olmalı. **Binance TR (binance.tr)** ayrı bir borsadır, oradan alınan anahtarlar burada çalışmaz.'),
      t('Binance\'e girin (web veya mobil uygulama). Uygulamada üstteki arama çubuğuna **API** yazıp **API Management** (API Yönetimi) sayfasını açın.'),
      t('**Create API** (API Oluştur) → **System generated** (Sistem tarafından oluşturulan) seçin, bir ad verin (ör. Tradepilo).'),
      t('Güvenlik doğrulamasını (e-posta / SMS / 2FA) tamamlayın.'),
      t('**Edit restrictions** (Kısıtlamaları düzenle): **Enable Reading** ve **Enable Spot & Margin Trading** açık olsun. **Enable Withdrawals** KAPALI kalsın. ') + SAFE,
      t('Mümkünse **Restrict access to trusted IPs only** (yalnızca güvenilir IP\'ler) seçeneğini açın.'),
      t('**API Key** ve **Secret Key**\'i kopyalayıp buraya yapıştırın. Secret yalnızca bir kez gösterilir.'),
    ],
  },
  bybit: {
    url: 'https://www.bybit.com/app/user/api-management',
    urlLabel: t('Bybit API Yönetimi'),
    steps: [
      t('Bybit hesabınıza girin, profil menüsünden **API**\'yi açın.'),
      t('**Yeni Anahtar Oluştur** → **Sistem tarafından oluşturulan API anahtarları**\'nı seçin.'),
      t('Kullanım: **API İşlemleri**, izin: **Okuma-Yazma** seçin; işlem izinlerinden spot/vadeli emirleri işaretleyin. ') + SAFE,
      t('Mümkünse IP kısıtlaması ekleyin.'),
      t('Doğrulamayı tamamlayın; **API Key** ve **API Secret**\'ı buraya yapıştırın. Secret yalnızca bir kez gösterilir.'),
    ],
  },
  okx: {
    url: 'https://www.okx.com/account/my-api',
    urlLabel: t('OKX API sayfası'),
    steps: [
      t('OKX hesabınıza girin, profil menüsünden **API** sayfasını açın.'),
      t('**API anahtarı oluştur**\'a tıklayın, amaç olarak **API ile işlem**\'i seçin.'),
      t('Bir ad ve **Passphrase** belirleyin. Passphrase\'i siz koyarsınız; not edin, buraya da gireceksiniz.'),
      t('İzinler: **Okuma** ve **İşlem**. ') + SAFE,
      t('Mümkünse IP adresi ekleyin.'),
      t('**API Key**, **Secret Key** ve **Passphrase**\'i buraya yapıştırın.'),
    ],
  },
  kraken: {
    steps: [
      t('Kraken Pro\'ya girin, profil simgesinden **Ayarlar → API**\'yi açın.'),
      t('**Yeni anahtar oluştur**\'a tıklayın ve bir ad verin.'),
      t('İzinler: **Bakiyeleri sorgula**, **Açık/kapalı emirleri sorgula**, **Emir oluştur ve değiştir**, **Emir iptal et**. Para çekme iznini açmayın.'),
      t('Anahtarı oluşturun; **API Key** ve **Private Key**\'i buraya yapıştırın. Private Key yalnızca bir kez gösterilir.'),
    ],
  },
  btcturk: {
    steps: [
      t('BtcTurk hesabınıza girin, hesap menüsünden **API Erişimi** bölümünü açın.'),
      t('Yeni bir API anahtarı oluşturun; istenirse IP adresini tanımlayın.'),
      t('Yetkilerden **okuma** ve **al-sat (işlem)** seçin. ') + SAFE,
      t('Oluşan **Public Key** ve **Private Key**\'i buraya yapıştırın. Private Key yalnızca bir kez gösterilir.'),
    ],
  },
  oanda: {
    steps: [
      t('OANDA hesabınıza (fxTrade) web üzerinden girin.'),
      t('Hesap ayarlarında **API Erişimini Yönet (Manage API Access)** bölümünü açın.'),
      t('**Oluştur (Generate)** ile kişisel erişim token\'ı üretin ve kopyalayın.'),
      t('**Hesap ID**\'nizi hesap özetinde bulabilirsiniz (ör. 001-001-1234567-001).'),
      t('Hesap ID\'yi ve token\'ı buraya girin. Demo (practice) hesap kullanıyorsanız "Test ağı / demo hesap" kutusunu işaretleyin.'),
    ],
  },
  bist_broker: {
    steps: [
      t('BIST aracı kurum entegrasyonu henüz bağlı değil; hesap şimdilik sanal (paper) modda çalışır.'),
      t('Anahtar alanlarını boş bırakıp sanal hesap açabilirsiniz.'),
      t('Aracı kurumunuzun API hizmeti varsa bilgileri kurumunuzun müşteri hizmetlerinden alabilirsiniz.'),
    ],
  },
  custom_rest: {
    steps: [
      t('Bağlanmak istediğiniz servisin API dokümantasyonundan Base URL, API Key ve Secret bilgilerini alın.'),
      t('Anahtarı yalnızca okuma ve işlem izniyle oluşturun; para çekme izni vermeyin.'),
    ],
  },
}
