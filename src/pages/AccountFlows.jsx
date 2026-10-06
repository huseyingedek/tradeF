// =====================================================================
//  Hesap akışları: şifremi unuttum, şifre sıfırlama, e-posta doğrulama,
//  admin daveti kabul. Bağlantılar backend'in gönderdiği e-postadan gelir.
// =====================================================================
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiCheckCircle, FiMail, FiXCircle } from 'react-icons/fi'
import AuthLayout from '../layouts/AuthLayout'
import { authService } from '../api/services'
import { useApp } from '../context/AppContext'
import { passwordProblem } from '../utils/validation'

const SUBTITLE = 'Kripto borsaları, BIST ve forex hesaplarını bağlayın; emirleri, botları ve risk kurallarını tek yerden yönetin.'

function PasswordForm({ submitLabel, onSubmit }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const p = passwordProblem(pw) || (pw !== pw2 ? 'Şifreler eşleşmiyor' : null)
    setError(p)
    if (p) return
    setLoading(true)
    try {
      await onSubmit(pw)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-3">
        <label className="form-label">Yeni şifre</label>
        <input type="password" className="form-control" autoComplete="new-password" placeholder="En az 8 karakter, harf ve rakam" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label">Yeni şifre (tekrar)</label>
        <input type="password" className={`form-control ${error ? 'is-invalid' : ''}`} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <div className="invalid-feedback">{error}</div>
      </div>
      <button className="btn btn-primary w-100 py-3" disabled={loading}>{loading ? <span className="spinner-border spinner-border-sm" /> : submitLabel}</button>
    </form>
  )
}

function Result({ ok, title, text }) {
  return (
    <div className="text-center">
      <div className="empty-icon mb-3 mx-auto" style={{ color: ok ? 'var(--hn-success, #2bc155)' : 'var(--hn-danger, #f72b50)' }}>{ok ? <FiCheckCircle /> : <FiXCircle />}</div>
      <h3 className="mb-2">{title}</h3>
      <p className="text-muted mb-4">{text}</p>
      <Link to="/login" className="btn btn-primary w-100 py-3">Giriş sayfasına dön</Link>
    </div>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Geçerli bir e-posta adresi girin')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthLayout title="Tüm Hesapların Tek Panelde" subtitle={SUBTITLE}>
      {sent ? (
        <div className="text-center">
          <div className="empty-icon mb-3 mx-auto" style={{ color: 'var(--hn-primary)' }}><FiMail /></div>
          <h3 className="mb-2">E-postanızı kontrol edin</h3>
          <p className="text-muted mb-4">Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Bağlantı 30 dakika geçerlidir.</p>
          <Link to="/login" className="btn btn-primary w-100 py-3">Giriş sayfasına dön</Link>
        </div>
      ) : (
        <>
          <h3 className="mb-1">Şifremi Unuttum</h3>
          <p className="text-muted mb-4">Hesabınızın e-posta adresini girin, sıfırlama bağlantısı gönderelim.</p>
          <form onSubmit={submit} noValidate>
            <div className="mb-3">
              <label className="form-label">E-posta</label>
              <input type="email" className={`form-control ${error ? 'is-invalid' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" autoFocus />
              <div className="invalid-feedback">{error}</div>
            </div>
            <button className="btn btn-primary w-100 py-3" disabled={loading}>{loading ? <span className="spinner-border spinner-border-sm" /> : 'Bağlantı Gönder'}</button>
            <p className="mt-3 mb-0 text-muted"><Link to="/login" className="fw-semibold">← Girişe dön</Link></p>
          </form>
        </>
      )}
    </AuthLayout>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [done, setDone] = useState(false)
  return (
    <AuthLayout title="Tüm Hesapların Tek Panelde" subtitle={SUBTITLE}>
      {done ? (
        <Result ok title="Şifreniz güncellendi" text="Güvenliğiniz için tüm cihazlardaki oturumlar kapatıldı. Yeni şifrenizle giriş yapabilirsiniz." />
      ) : !token ? (
        <Result title="Bağlantı eksik" text="Şifre sıfırlama bağlantısı geçersiz. Yeniden talep edin." />
      ) : (
        <>
          <h3 className="mb-1">Yeni Şifre Belirleyin</h3>
          <p className="text-muted mb-4">Hesabınız için yeni bir şifre girin.</p>
          <PasswordForm submitLabel="Şifreyi Güncelle" onSubmit={async (pw) => { await authService.resetPassword(token, pw); setDone(true) }} />
        </>
      )}
    </AuthLayout>
  )
}

export function VerifyEmail() {
  const [params] = useSearchParams()
  const [state, setState] = useState({ loading: true })
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    authService
      .verifyEmail(params.get('token') || '')
      .then(() => setState({ ok: true }))
      .catch((e) => setState({ ok: false, message: e.message }))
  }, [params])
  return (
    <AuthLayout title="Tüm Hesapların Tek Panelde" subtitle={SUBTITLE}>
      {state.loading ? (
        <div className="text-center py-5"><span className="spinner-border text-primary" /></div>
      ) : state.ok ? (
        <Result ok title="E-posta doğrulandı" text="Hesabınız aktif. Giriş yapabilirsiniz." />
      ) : (
        <Result title="Doğrulanamadı" text={state.message || 'Bağlantı geçersiz veya süresi dolmuş.'} />
      )}
    </AuthLayout>
  )
}

export function AcceptInvite() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useApp()
  return (
    <AuthLayout title="Tradepilo Yönetim Paneli" subtitle="Ekibe davet edildiniz. Şifrenizi belirleyin; ilk girişte iki adımlı doğrulama kurulumu istenecek.">
      {!token ? (
        <Result title="Davet bağlantısı eksik" text="Daveti gönderen yöneticiden yeni bir bağlantı isteyin." />
      ) : (
        <>
          <h3 className="mb-1">Daveti Kabul Et</h3>
          <p className="text-muted mb-4">Yönetici hesabınız için bir şifre belirleyin.</p>
          <PasswordForm
            submitLabel="Hesabı Etkinleştir"
            onSubmit={async (pw) => {
              const r = await authService.acceptInvite(token, pw)
              toast('Hesabınız etkinleştirildi, giriş yapabilirsiniz')
              navigate('/login', { state: { email: r?.email } })
            }}
          />
        </>
      )}
    </AuthLayout>
  )
}
