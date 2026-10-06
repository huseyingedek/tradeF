import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiDatabase, FiRefreshCw, FiServer, FiAward, FiShield, FiKey, FiMonitor } from 'react-icons/fi'
import Card from '../components/Card'
import Switch from '../components/Switch'
import Modal from '../components/Modal'
import { useApp } from '../context/AppContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authService, billingService, devService, metaService } from '../api/services'
import { qk, useUpdateMe } from '../api/queries'
import { config } from '../api/config'
import { useRealtimeStatus } from '../hooks/useMarket'
import PasswordModal from '../components/PasswordModal'
import { fmtDateTime } from '../utils/format'

const tl = (v) => `₺${Number(v || 0).toLocaleString('tr-TR')}`
const PAY_STATUS = { pending: ['yellow', 'Onay bekliyor'], paid: ['green', 'Ödendi'], failed: ['red', 'Başarısız'], refunded: ['gray', 'İade'] }

// ---------------------------------------------------------------- 2FA
function TwoFactorModal({ mode, onClose, onDone }) {
  const [setup, setSetup] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (mode === 'enable') authService.setup2fa().then(setSetup).catch((e) => setError(e.message))
  }, [mode])
  const submit = async () => {
    if (!/^\d{6}$/.test(code)) return setError('6 haneli kodu girin')
    setLoading(true)
    try {
      const me = mode === 'enable' ? await authService.enable2fa(setup.challengeId, code) : await authService.disable2fa(code)
      onDone(me)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal
      title={mode === 'enable' ? 'İki adımlı doğrulamayı aç' : 'İki adımlı doğrulamayı kapat'}
      onClose={onClose}
      onSubmit={submit}
      footer={<><button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button><button className={`btn ${mode === 'enable' ? 'btn-primary' : 'btn-danger'}`} disabled={loading || (mode === 'enable' && !setup)}>{mode === 'enable' ? 'Etkinleştir' : 'Kapat'}</button></>}
    >
      {mode === 'enable' && !setup && !error && <div className="text-center py-4"><span className="spinner-border text-primary" /></div>}
      {mode === 'enable' && setup && (
        <>
          <p className="fs-13 text-muted">Google Authenticator, Microsoft Authenticator veya Authy ile QR kodu okutun.</p>
          <div className="twofa-setup mb-3">
            {setup.qr && <img src={setup.qr} alt="2FA QR kodu" width={170} height={170} />}
            <div className="fs-13"><div className="text-muted mb-1">Elle giriş anahtarı:</div><code className="d-block text-break user-select-all">{setup.secret}</code></div>
          </div>
        </>
      )}
      {mode === 'disable' && <p className="fs-13 text-muted">Onaylamak için doğrulama uygulamanızdaki güncel kodu girin. 2FA kapalıyken hesabınız yalnızca şifreyle korunur.</p>}
      <label className="form-label">Doğrulama kodu</label>
      <input className={`form-control text-center num ${error ? 'is-invalid' : ''}`} style={{ letterSpacing: '0.4em', fontSize: '1.3rem' }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
      <div className="invalid-feedback">{error}</div>
    </Modal>
  )
}

// ---------------------------------------------------------------- hesap silme
function DeleteAccountModal({ me, onClose }) {
  const { logout, toast } = useApp()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const ok = confirmText.trim().toLocaleUpperCase('tr-TR') === 'SİL' && password && (!me.twoFactor || /^\d{6}$/.test(code))
  const submit = async () => {
    if (!ok) return
    setLoading(true)
    try {
      await authService.deleteAccount(password, me.twoFactor ? code : undefined)
      logout()
      toast('Hesabınız ve tüm verileriniz silindi', 'info')
      navigate('/login', { replace: true })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }
  return (
    <Modal title="Hesabı kalıcı olarak sil" onClose={onClose} onSubmit={submit} footer={<><button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button><button className="btn btn-danger" disabled={!ok || loading}>{loading ? 'Siliniyor…' : 'Hesabımı Sil'}</button></>}>
      <div className="alert alert-danger fs-13">Bu işlem geri alınamaz. Borsa bağlantılarınız, sanal bakiyeleriniz, emir geçmişiniz, kurallarınız, botlarınız ve ödeme kayıtlarınız silinir.</div>
      <div className="mb-3">
        <label className="form-label">Şifreniz</label>
        <input type="password" className="form-control" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {me.twoFactor && (
        <div className="mb-3">
          <label className="form-label">Doğrulama kodu (2FA)</label>
          <input className="form-control num" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
      )}
      <div className="mb-2">
        <label className="form-label">Onaylamak için <strong>SİL</strong> yazın</label>
        <input className="form-control" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </div>
      {error && <div className="alert alert-danger py-2 fs-13 mb-0 mt-2">{error}</div>}
    </Modal>
  )
}

// ---------------------------------------------------------------- plan
function PlanModal({ me, onClose }) {
  const { toast, refreshUser } = useApp()
  const qc = useQueryClient()
  const { data: plans = [] } = useQuery({ queryKey: ['billing-plans'], queryFn: billingService.plans })
  const [planId, setPlanId] = useState(me.plan?.id)
  const [billing, setBilling] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    setLoading(true)
    try {
      const r = await billingService.subscribe(planId, billing)
      if (r.status === 'pending') toast(`Ödeme talebiniz alındı (${tl(r.amount)}). Ödeme onaylanınca planınız aktifleşecek.`, 'info')
      else toast('Planınız güncellendi')
      await Promise.all([qc.invalidateQueries({ queryKey: qk.me }), qc.invalidateQueries({ queryKey: ['billing-payments'] }), refreshUser()])
      onClose()
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal title="Plan seçin" size="modal-lg" onClose={onClose} onSubmit={submit} footer={<><button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" disabled={loading || !planId}>Devam</button></>}>
      <div className="btn-group mb-3" role="group">
        <button type="button" className={`btn btn-sm ${billing === 'monthly' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setBilling('monthly')}>Aylık</button>
        <button type="button" className={`btn btn-sm ${billing === 'yearly' ? 'btn-primary' : 'btn-soft'}`} onClick={() => setBilling('yearly')}>Yıllık (2 ay hediye)</button>
      </div>
      <div className="row g-2">
        {plans.map((p) => {
          const price = billing === 'yearly' ? p.priceYearly : p.priceMonthly
          const lim = (v) => (v === -1 ? 'Sınırsız' : v)
          return (
            <div key={p.id} className="col-sm-6">
              <button type="button" className={`plan-pick ${planId === p.id ? 'active' : ''}`} onClick={() => setPlanId(p.id)}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-bold">{p.name}</span>
                  {me.plan?.id === p.id && <span className="chip green">Mevcut</span>}
                  {p.highlighted && me.plan?.id !== p.id && <span className="chip">Önerilen</span>}
                </div>
                <div className="fs-4 fw-bold">{price ? tl(price) : 'Ücretsiz'}<small className="fs-13 text-muted fw-normal">{price ? (billing === 'yearly' ? ' / yıl' : ' / ay') : ''}</small></div>
                <div className="fs-13 text-muted">{lim(p.limits.exchanges)} borsa · {lim(p.limits.bots)} bot · {lim(p.limits.rules)} kural{p.features.futures ? ' · vadeli' : ''}</div>
              </button>
            </div>
          )
        })}
      </div>
      <p className="fs-13 text-muted mt-3 mb-0">Ücretli planlarda ödeme talebiniz oluşturulur; ödeme ekibimiz onayladığında plan hemen aktifleşir.</p>
    </Modal>
  )
}

export default function Settings() {
  const { user, login, theme, setTheme, confirm, toast } = useApp()
  const { data: me } = useQuery({ queryKey: qk.me, queryFn: authService.me })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: metaService.get, staleTime: 60_000 })
  const { data: sessions = [], refetch: refetchSessions } = useQuery({ queryKey: ['sessions'], queryFn: authService.sessions, enabled: !config.useMock })
  const { data: payments = [] } = useQuery({ queryKey: ['billing-payments'], queryFn: billingService.payments, enabled: !!me?.plan })
  const update = useUpdateMe()
  const qc = useQueryClient()
  const rt = useRealtimeStatus()
  const [f, setF] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    if (me && !f) setF({ name: me.name, email: me.email, baseCurrency: me.baseCurrency, notifications: { ...me.notifications } })
  }, [me, f])

  if (!f) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const setN = (patch) => setF((x) => ({ ...x, notifications: { ...x.notifications, ...patch } }))

  const save = (e) => {
    e.preventDefault()
    if (f.name.trim().length < 2) return toast('Ad en az 2 karakter olmalı', 'danger')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast('Geçerli bir e-posta girin', 'danger')
    if (f.notifications.telegram && !f.notifications.telegramChatId.trim()) return toast('Telegram bildirimleri için Chat ID girin', 'danger')
    update.mutate(f, { onSuccess: (u) => login({ ...user, ...u }) })
  }
  const after2fa = (u) => {
    qc.setQueryData(qk.me, u)
    login({ ...user, ...u })
    toast(u.twoFactor ? 'İki adımlı doğrulama açıldı' : 'İki adımlı doğrulama kapatıldı', u.twoFactor ? 'success' : 'warning')
    setModal(null)
  }
  const pending = payments.find((p) => p.status === 'pending')

  return (
    <>
      <form className="row" onSubmit={save} noValidate>
        <div className="col-xl-7">
          <Card title="Profil">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Ad Soyad</label>
                <input className="form-control" value={f.name} onChange={(e) => set({ name: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">E-posta</label>
                <input type="email" className="form-control" value={f.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Raporlama para birimi</label>
                <select className="form-select" value={f.baseCurrency} onChange={(e) => set({ baseCurrency: e.target.value })}>
                  <option value="USD">USD ($)</option>
                  <option value="TRY">TRY (₺)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Tema</label>
                <select className="form-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="dark">Koyu</option>
                  <option value="light">Açık</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Bildirimler">
            <p className="fs-13 text-muted">Kural tetiklenmeleri, gerçekleşen emirler, SL/TP ve acil durdurma olayları için.</p>
            <div className="limit-row"><span>Uygulama içi bildirim</span><Switch checked={f.notifications.app} onChange={(v) => setN({ app: v })} /></div>
            <div className="limit-row"><span>E-posta</span><Switch checked={f.notifications.email} onChange={(v) => setN({ email: v })} /></div>
            <div className="limit-row">
              <span>Telegram{me.plan && !me.plan.features.telegram && <span className="chip gray ms-2">Planınızda yok</span>}</span>
              <div className="d-flex gap-2 align-items-center">
                {f.notifications.telegram && <input className="form-control form-control-sm" style={{ width: 160 }} placeholder="Chat ID" value={f.notifications.telegramChatId} onChange={(e) => setN({ telegramChatId: e.target.value })} />}
                <Switch checked={f.notifications.telegram} onChange={(v) => setN({ telegram: v })} />
              </div>
            </div>
          </Card>
          <div className="text-end mb-4">
            <button className="btn btn-primary px-4" disabled={update.isPending}>Kaydet</button>
          </div>

          <Card title={<div className="d-flex align-items-center gap-2"><FiShield /><h4>Güvenlik</h4></div>}>
            <div className="limit-row">
              <div>
                <div className="fw-semibold">İki adımlı doğrulama (2FA) <span className={`chip ${me.twoFactor ? 'green' : 'gray'} ms-1`}>{me.twoFactor ? 'Açık' : 'Kapalı'}</span></div>
                <div className="fs-13 text-muted">Girişte şifreye ek olarak doğrulama uygulamanızdaki kod istenir.</div>
              </div>
              {me.twoFactor ? (
                me.kind !== 'admin' && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setModal('2fa-disable')}>Kapat</button>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setModal('2fa-enable')}>Etkinleştir</button>
              )}
            </div>
            <div className="limit-row">
              <div>
                <div className="fw-semibold">Şifre</div>
                <div className="fs-13 text-muted">Değiştirdiğinizde diğer cihazlardaki oturumlar kapatılır.</div>
              </div>
              <button type="button" className="btn btn-sm btn-soft" onClick={() => setModal('password')}><FiKey /> Değiştir</button>
            </div>
            {sessions.length > 0 && (
              <>
                <div className="fw-semibold mt-3 mb-2 d-flex align-items-center gap-2"><FiMonitor /> Aktif oturumlar</div>
                {sessions.map((s) => (
                  <div key={s.id} className="limit-row">
                    <div className="fs-13">
                      <div>{s.userAgent?.slice(0, 70) || 'Bilinmeyen cihaz'} {s.current && <span className="chip green ms-1">Bu cihaz</span>}</div>
                      <div className="text-muted">{s.ip || '—'} · son görülme {fmtDateTime(s.lastSeenAt)}</div>
                    </div>
                    {!s.current && (
                      <button type="button" className="btn btn-sm btn-soft" onClick={async () => { await authService.revokeSession(s.id); refetchSessions(); toast('Oturum kapatıldı', 'info') }}>Kapat</button>
                    )}
                  </div>
                ))}
              </>
            )}
          </Card>
          {me.kind !== 'admin' && (
            <Card title={<h4 className="text-danger">Hesabı Sil</h4>}>
              <div className="limit-row">
                <div className="fs-13 text-muted">Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.</div>
                <button type="button" className="btn btn-sm btn-outline-danger flex-shrink-0" onClick={() => setModal('delete')}>Hesabımı Sil</button>
              </div>
            </Card>
          )}
        </div>

        <div className="col-xl-5">
          {me.plan && (
            <Card title={<div className="d-flex align-items-center gap-2"><FiAward /><h4>Aboneliğiniz</h4></div>} actions={<span className="chip">{me.plan.name}</span>}>
              <div className="fs-3 fw-bold mb-3">{me.plan.priceMonthly ? tl(me.plan.priceMonthly) : 'Ücretsiz'}<span className="fs-6 text-muted fw-normal">{me.plan.priceMonthly ? ' / ay' : ''}</span></div>
              {[['exchanges', 'Borsa hesabı'], ['bots', 'Bot'], ['rules', 'Kural & alarm']].map(([k, l]) => {
                const limit = me.plan.limits[k]
                const used = me.usage?.[k] || 0
                const pct = limit === -1 ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100)
                return (
                  <div key={k} className="mb-3">
                    <div className="d-flex justify-content-between fs-13 mb-1"><span>{l}</span><span className="num">{used} / {limit === -1 ? '∞' : limit}</span></div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: pct >= 100 ? '#f6465d' : pct > 75 ? '#ffb800' : '#8c62ff' }} /></div>
                  </div>
                )
              })}
              <div className="d-flex flex-wrap gap-1 mb-3">
                <span className={`chip ${me.plan.features.futures ? 'green' : 'gray'}`}>Vadeli {me.plan.features.futures ? '✓' : '✕'}</span>
                <span className={`chip ${me.plan.features.telegram ? 'green' : 'gray'}`}>Telegram {me.plan.features.telegram ? '✓' : '✕'}</span>
                <span className={`chip ${me.plan.features.apiAccess ? 'green' : 'gray'}`}>API {me.plan.features.apiAccess ? '✓' : '✕'}</span>
              </div>
              {pending && <div className="alert alert-warning py-2 fs-13">{pending.planName || pending.plan} planı için {tl(pending.amount)} tutarındaki ödeme talebiniz onay bekliyor.</div>}
              <button type="button" className="btn btn-primary w-100" disabled={!!pending} onClick={() => setModal('plan')}>Planı değiştir</button>
              {payments.length > 0 && (
                <div className="mt-3">
                  <div className="fw-semibold fs-13 mb-2">Ödeme geçmişi</div>
                  {payments.slice(0, 6).map((p) => (
                    <div key={p.id} className="d-flex justify-content-between align-items-center fs-13 py-1">
                      <span>{fmtDateTime(p.createdAt)} · {p.planName || p.plan}</span>
                      <span className="d-flex align-items-center gap-2"><span className="num">{tl(p.amount)}</span><span className={`chip ${PAY_STATUS[p.status]?.[0]}`}>{PAY_STATUS[p.status]?.[1]}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
          <Card title={<div className="d-flex align-items-center gap-2"><FiServer /><h4>Sistem Durumu</h4></div>}>
            <div className="mini-stat mb-2"><small>Mod</small><span>{config.useMock ? 'Mock (tarayıcı içi demo backend)' : 'Gerçek API'}</span></div>
            {!config.useMock && <div className="mini-stat mb-2"><small>REST API</small><span className="text-break">{config.apiUrl}</span></div>}
            <div className="mini-stat mb-2"><small>Canlı veri bağlantısı</small><span>{{ open: 'Bağlı (WebSocket)', connecting: 'Bağlanıyor…', reconnecting: 'Yeniden bağlanıyor…', closed: 'Kapalı', idle: 'Bekliyor' }[rt] || rt}</span></div>
            {meta && (
              <>
                <div className="mini-stat mb-2"><small>Kripto fiyatları</small><span>{meta.marketData?.connected ? `Gerçek (${meta.marketData.exchange})` : 'Simülasyon (kaynağa ulaşılamıyor)'}</span></div>
                <div className="mini-stat mb-2"><small>BIST / Forex</small><span>Simülasyon / ECB referanslı</span></div>
                <div className="mini-stat mb-2"><small>İşlem modu</small><span>{meta.liveTradingEnabled ? 'Canlı işlem açık' : 'Paper (sanal) – gerçek emir gönderilmez'}</span></div>
              </>
            )}
          </Card>
          {config.useMock && (
            <Card title={<div className="d-flex align-items-center gap-2"><FiDatabase /><h4>Demo Verisi</h4></div>}>
              <p className="fs-13 text-muted">Mock modda yaptığınız tüm işlemler tarayıcıda saklanır. Başlangıç durumuna dönmek için sıfırlayın.</p>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={async () => {
                  if (!(await confirm({ title: 'Demo verisini sıfırla', message: 'Tüm demo işlemleri silinip başlangıç verisi yüklenecek.', confirmText: 'Sıfırla', variant: 'danger' }))) return
                  await devService.resetMock()
                  await qc.invalidateQueries()
                  toast('Demo verisi sıfırlandı')
                }}
              >
                <FiRefreshCw /> Demo verisini sıfırla
              </button>
            </Card>
          )}
        </div>
      </form>
      {(modal === '2fa-enable' || modal === '2fa-disable') && <TwoFactorModal mode={modal === '2fa-enable' ? 'enable' : 'disable'} onClose={() => setModal(null)} onDone={after2fa} />}
      {modal === 'password' && <PasswordModal onClose={() => setModal(null)} />}
      {modal === 'plan' && <PlanModal me={me} onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteAccountModal me={me} onClose={() => setModal(null)} />}
    </>
  )
}
