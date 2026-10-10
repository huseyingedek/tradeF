import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiEye, FiEyeOff, FiShield } from 'react-icons/fi'
import AuthLayout from '../layouts/AuthLayout'
import { useApp } from '../context/AppContext'
import { authService } from '../api/services'
import { config } from '../api/config'
import { t } from '../i18n'

export default function Login() {
  const { login, toast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(config.useMock ? { email: 'demo@tradepilo.com', password: '123456', remember: true } : { email: location.state?.email || '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState('')

  const finish = ({ token, user }) => {
    login(user, token)
    toast(t('Hoş geldiniz, {0}', user.name))
    const from = location.state?.from
    if (user.kind === 'admin') navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
    else navigate(from && !from.startsWith('/admin') ? from : '/dashboard', { replace: true })
  }

  const verify = (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setErrors({ code: t('6 haneli kodu girin') })
    setLoading(true)
    authService
      .verify2fa(challenge.challengeId, code)
      .then(finish)
      .catch((err) => setErrors({ code: err.message }))
      .finally(() => setLoading(false))
  }

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = t('Geçerli bir e-posta adresi girin')
    if (!form.password) err.password = t('Şifrenizi girin')
    setErrors(err)
    if (Object.keys(err).length) return
    setLoading(true)
    authService
      .login(form.email, form.password)
      .then((res) => {
        if (res.requires2fa) {
          setChallenge(res)
          setErrors({})
          return
        }
        finish(res)
      })
      .catch((err) => setErrors({ password: err.message }))
      .finally(() => setLoading(false))
  }

  return (
    <AuthLayout title={t('Tüm Hesapların Tek Panelde')} subtitle={t('Kripto borsaları, BIST ve forex hesaplarını bağlayın; emirleri, botları ve risk kurallarını tek yerden yönetin.')}>
      {challenge ? (
        <form onSubmit={verify} noValidate>
          <div className="empty-icon mb-3" style={{ color: 'var(--hn-primary)' }}><FiShield /></div>
          <h3 className="mb-1">{challenge.setupRequired ? t('İki Adımlı Doğrulamayı Kurun') : t('İki Adımlı Doğrulama')}</h3>
          {challenge.setupRequired ? (
            <>
              <p className="text-muted mb-3">{t('Hesabınız için 2FA zorunlu. Google Authenticator, Microsoft Authenticator veya Authy ile aşağıdaki QR kodu okutun, ardından uygulamanın gösterdiği 6 haneli kodu girin.')}</p>
              <div className="twofa-setup mb-3">
                {challenge.qr && <img src={challenge.qr} alt={t('2FA QR kodu')} width={180} height={180} />}
                <div className="fs-13">
                  <div className="text-muted mb-1">{t('QR okutamıyorsanız bu anahtarı elle girin:')}</div>
                  <code className="d-block text-break user-select-all">{challenge.secret}</code>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted mb-4">{t('Doğrulama uygulamanızdaki 6 haneli kodu girin.')}</p>
          )}
          <input
            className={`form-control form-control-lg text-center num mb-1 ${errors.code ? 'is-invalid' : ''}`}
            style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
          />
          <div className="invalid-feedback d-block mb-3">{errors.code}</div>
          {config.useMock && <div className="form-help mb-3">{t('Demo: herhangi bir 6 haneli kod (örn. 123456)')}</div>}
          <button className="btn btn-primary w-100 py-3" disabled={loading}>{loading ? <span className="spinner-border spinner-border-sm" /> : t('Doğrula ve Giriş Yap')}</button>
          <button type="button" className="btn btn-link w-100 mt-2" onClick={() => { setChallenge(null); setCode('') }}>{t('← Geri dön')}</button>
        </form>
      ) : (
      <>
      <h3 className="mb-1">{t('Tradepilo’e Hoş Geldiniz')}</h3>
      <p className="text-muted mb-4">{t('Aşağıdaki bilgileri girerek oturum açın')}</p>
      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label">{t('E-posta')} <span className="text-danger">*</span></label>
          <input
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            placeholder="demo@ornek.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <div className="invalid-feedback">{errors.email}</div>
        </div>
        <div className="mb-3">
          <label className="form-label">{t('Şifre')} <span className="text-danger">*</span></label>
          <div className="position-relative">
            <input
              type={show ? 'text' : 'password'}
              className={`form-control pe-5 ${errors.password ? 'is-invalid' : ''}`}
              placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button type="button" className="btn btn-sm border-0 position-absolute text-muted" style={{ right: 6, top: 8 }} onClick={() => setShow((s) => !s)} aria-label={t('Şifreyi göster')}>
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
            <div className="invalid-feedback">{errors.password}</div>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="form-check">
            <input id="remember" type="checkbox" className="form-check-input" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
            <label htmlFor="remember" className="form-check-label text-muted">{t('Beni hatırla')}</label>
          </div>
          <Link to="/forgot-password" className="fs-13">{t('Şifremi unuttum')}</Link>
        </div>
        <button className="btn btn-primary w-100 py-3" disabled={loading}>
          {loading ? <span className="spinner-border spinner-border-sm" /> : t('Giriş Yap')}
        </button>
        <p className="mt-3 mb-0 text-muted">
          {t('Hesabınız yok mu?')} <Link to="/register" className="fw-semibold">{t('Kayıt olun')}</Link>
        </p>
      </form>
      {config.useMock && (
        <div className="demo-accounts mt-4">
          <div className="fw-semibold mb-2 fs-13">{t('Demo hesaplar (şifre: 123456)')}</div>
          {[
            [t('Kullanıcı'), 'demo@tradepilo.com'],
            [t('Süper Admin'), 'admin@tradepilo.com'],
            [t('Risk Görevlisi'), 'risk@tradepilo.com'],
            [t('Destek'), 'destek@tradepilo.com'],
            [t('Finans'), 'finans@tradepilo.com'],
          ].map(([label, email]) => (
            <button key={email} type="button" className="demo-acc" onClick={() => setForm({ ...form, email, password: '123456' })}>
              <span>{label}</span>
              <span className="text-muted">{email}</span>
            </button>
          ))}
        </div>
      )}
      </>
      )}
    </AuthLayout>
  )
}
