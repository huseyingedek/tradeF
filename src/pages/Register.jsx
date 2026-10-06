import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useApp } from '../context/AppContext'
import { authService } from '../api/services'
import { passwordProblem } from '../utils/validation'

export default function Register() {
  const { login, toast } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const strength = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length
  const strengthLabel = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'][strength]
  const strengthColor = ['#f72b50', '#f72b50', '#ffb800', '#48a9f8', '#2bc155'][strength]

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (form.name.trim().length < 3) err.name = 'Ad soyad en az 3 karakter olmalı'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) err.email = 'Geçerli bir e-posta adresi girin'
    const pwErr = passwordProblem(form.password)
    if (pwErr) err.password = pwErr
    if (form.confirm !== form.password) err.confirm = 'Şifreler eşleşmiyor'
    if (!form.terms) err.terms = 'Devam etmek için koşulları kabul edin'
    setErrors(err)
    if (Object.keys(err).length) return
    authService
      .register({ name: form.name.trim(), email: form.email, password: form.password })
      .then((res) => {
        if (res.requiresVerification) {
          toast('Hesabınız oluşturuldu. E-postanıza gelen bağlantı ile doğrulayın.', 'info')
          return navigate('/login')
        }
        login(res.user, res.token)
        toast('Hesabınız oluşturuldu')
        navigate('/exchanges')
      })
      .catch((err) => toast(err.message, 'danger'))
  }

  const input = (k, label, type = 'text', placeholder = '') => (
    <div className="mb-3">
      <label className="form-label">{label} <span className="text-danger">*</span></label>
      <input type={type} className={`form-control ${errors[k] ? 'is-invalid' : ''}`} placeholder={placeholder} value={form[k]} onChange={set(k)} />
      <div className="invalid-feedback">{errors[k]}</div>
    </div>
  )

  return (
    <AuthLayout title="Zamanınız Yoksa Bile Piyasada Kalın" subtitle="Hesabınızı oluşturun, borsalarınızı bağlayın; kurallar ve botlar sizin yerinize piyasayı takip etsin.">
      <h3 className="mb-1">Hesap Oluştur</h3>
      <p className="text-muted mb-4">Birkaç saniyede kayıt olun</p>
      <form onSubmit={submit} noValidate>
        {input('name', 'Ad Soyad', 'text', 'Adınız Soyadınız')}
        {input('email', 'E-posta', 'email', 'ornek@mail.com')}
        {input('password', 'Şifre', 'password', 'En az 8 karakter, harf ve rakam')}
        {form.password && (
          <div className="mb-3 mt-n2">
            <div className="progress" style={{ height: 5 }}>
              <div className="progress-bar" style={{ width: `${(strength / 4) * 100}%`, background: strengthColor }} />
            </div>
            <small style={{ color: strengthColor }}>{strengthLabel}</small>
          </div>
        )}
        {input('confirm', 'Şifre Tekrar', 'password', 'Şifrenizi tekrar girin')}
        <div className="form-check mb-4">
          <input id="terms" type="checkbox" className={`form-check-input ${errors.terms ? 'is-invalid' : ''}`} checked={form.terms} onChange={set('terms')} />
          <label htmlFor="terms" className="form-check-label text-muted">Kullanım koşullarını kabul ediyorum</label>
          <div className="invalid-feedback">{errors.terms}</div>
        </div>
        <button className="btn btn-primary w-100 py-3">Kayıt Ol</button>
        <p className="mt-3 mb-0 text-muted">
          Zaten hesabınız var mı? <Link to="/login" className="fw-semibold">Giriş yapın</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
