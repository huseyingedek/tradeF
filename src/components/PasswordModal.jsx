import { useState } from 'react'
import Modal from './Modal'
import { useApp } from '../context/AppContext'
import { authService } from '../api/services'
import { passwordProblem } from '../utils/validation'
import { t } from '../i18n'

export default function PasswordModal({ onClose }) {
  const { toast } = useApp()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    const p = !f.current ? t('Mevcut şifrenizi girin') : passwordProblem(f.next) || (f.next !== f.confirm ? t('Yeni şifreler eşleşmiyor') : null)
    setError(p)
    if (p) return
    setLoading(true)
    try {
      await authService.changePassword(f.current, f.next)
      toast(t('Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.'))
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  const inp = (k, label, ac) => (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input type="password" autoComplete={ac} className="form-control" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  )
  return (
    <Modal title={t('Şifre değiştir')} onClose={onClose} onSubmit={submit} footer={<><button type="button" className="btn btn-soft" onClick={onClose}>{t('Vazgeç')}</button><button className="btn btn-primary" disabled={loading}>{t('Güncelle')}</button></>}>
      {inp('current', t('Mevcut şifre'), 'current-password')}
      {inp('next', t('Yeni şifre (en az 8 karakter, harf ve rakam)'), 'new-password')}
      {inp('confirm', t('Yeni şifre (tekrar)'), 'new-password')}
      {error && <div className="alert alert-danger py-2 fs-13 mb-0">{error}</div>}
    </Modal>
  )
}

