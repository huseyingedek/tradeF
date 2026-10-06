import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPauseCircle, FiPlayCircle, FiSlash, FiLogOut, FiShieldOff, FiMail, FiAlertTriangle, FiInfo, FiSend } from 'react-icons/fi'
import Card from '../../components/Card'
import Avatar from '../../components/Avatar'
import Segmented from '../../components/Segmented'
import EmptyState from '../../components/EmptyState'
import ReasonModal from '../../components/admin/ReasonModal'
import { ExchangeLogo, MarketBadge, SideBadge, SourceBadge, StatusBadge } from '../../components/Badges'
import { PaymentBadge, PlanBadge, UserStatusBadge } from '../../components/admin/AdminBadges'
import { useAdminPlans, useAdminUser, useCan, useUpdateUser, useUserAction } from '../../api/adminQueries'
import { useProviders } from '../../api/queries'
import { useApp } from '../../context/AppContext'
import { fmtCompact, fmtDateTime, fmtMoney, fmtNum, fmtPct, fmtQty, pnlClass, timeAgo } from '../../utils/format'
import { ORDER_TYPE_LABEL } from '../../utils/trading'

export default function UserDetail() {
  const { id } = useParams()
  const { data, isLoading, error } = useAdminUser(id)
  const { data: plans = [] } = useAdminPlans()
  const { data: providers = [] } = useProviders()
  const can = useCan()
  const { confirm, toast } = useApp()
  const update = useUpdateUser()
  const action = useUserAction()
  const [tab, setTab] = useState('accounts')
  const [modal, setModal] = useState(null)
  const [plan, setPlan] = useState('')
  const [note, setNote] = useState('')

  if (isLoading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
  if (error || !data) return <Card><EmptyState title="Kullanıcı bulunamadı" action={<Link to="/admin/users" className="btn btn-soft">Listeye dön</Link>} /></Card>

  const u = data.user
  const prov = Object.fromEntries(providers.map((p) => [p.id, p]))
  const setStatus = (status, reason) =>
    update.mutate({ id, status, reason }, { onSuccess: () => { setModal(null); toast({ suspended: 'Hesap askıya alındı', trading_halted: 'Kullanıcının işlemleri durduruldu', active: 'Hesap etkinleştirildi' }[status], status === 'active' ? 'success' : 'warning') } })

  const tabs = [
    { value: 'accounts', label: `Borsa Hesapları (${data.connections.length})` },
    { value: 'trading', label: 'Pozisyon & Emir' },
    { value: 'automation', label: `Otomasyon (${u.bots + u.rules})` },
    { value: 'activity', label: 'Aktivite' },
    { value: 'sessions', label: `Oturumlar (${data.sessions.length})` },
    { value: 'payments', label: `Ödemeler (${data.payments.length})` },
    { value: 'notes', label: `Notlar (${u.notes.length})` },
  ]

  return (
    <>
      <Link to="/admin/users" className="d-inline-flex align-items-center gap-1 mb-3 fw-500"><FiArrowLeft /> Kullanıcılar</Link>

      <div className="row">
        <div className="col-xl-8">
          <div className="hn-card">
            <div className="hn-card-body">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <Avatar name={u.name} size={72} />
                <div className="flex-grow-1 min-w-0">
                  <h3 className="mb-1 d-flex align-items-center gap-2 flex-wrap">{u.name} {u.isDemo && <span className="chip sky">demo hesap</span>}</h3>
                  <div className="text-muted fs-13">{u.email} · {u.id} · {u.city}</div>
                  <div className="d-flex gap-2 mt-2 flex-wrap">
                    <UserStatusBadge status={u.status} />
                    <PlanBadge plan={u.plan} name={data.plan?.name} />
                    <span className={`chip ${u.twoFactor ? 'green' : 'red'}`}>2FA {u.twoFactor ? 'açık' : 'kapalı'}</span>
                    <span className="chip gray">{u.billing === 'yearly' ? 'Yıllık' : 'Aylık'} ödeme</span>
                  </div>
                </div>
              </div>
              {u.riskFlags.length > 0 && (
                <div className="alert alert-warning d-flex gap-2 mt-3 mb-0 py-2 fs-13"><FiAlertTriangle className="flex-shrink-0 mt-1" /> Risk uyarıları: {u.riskFlags.join(' · ')}</div>
              )}
              <div className="row g-3 mt-1">
                {[
                  ['Yönetilen varlık', u.aumUsd ? fmtMoney(u.aumUsd, 'USD', 0) : '–'],
                  ['30g hacim', u.volume30dUsd ? `$${fmtCompact(u.volume30dUsd)}` : '–'],
                  ['Bağlı hesap', `${u.exchanges} / ${data.plan?.limits.exchanges === -1 ? '∞' : data.plan?.limits.exchanges}`],
                  ['Bot / Kural', `${u.bots} / ${u.rules}`],
                  ['Kayıt', new Date(u.createdAt).toLocaleDateString('tr-TR')],
                  ['Son giriş', u.lastLoginAt ? timeAgo(u.lastLoginAt) : '–'],
                ].map(([l, v]) => (
                  <div className="col-md-4 col-6" key={l}><div className="mini-stat"><small>{l}</small><span className="num">{v}</span></div></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <Card title="Yönetim">
            <div className="d-grid gap-2">
              {can('users.trading') && (u.status === 'trading_halted' ? (
                <button className="btn btn-success" onClick={async () => (await confirm({ title: 'İşlemleri aç', message: `${u.name} yeniden emir verebilecek ve botlarını başlatabilecek.`, confirmText: 'İşlemleri Aç' })) && setStatus('active')}>
                  <FiPlayCircle /> İşlemleri Aç
                </button>
              ) : u.status === 'active' && (
                <button className="btn btn-outline-warning" onClick={() => setModal('halt')}><FiPauseCircle /> İşlemlerini Durdur</button>
              ))}
              {can('users.manage') && (u.status === 'suspended' ? (
                <button className="btn btn-success" onClick={async () => (await confirm({ title: 'Hesabı etkinleştir', message: `${u.name} tekrar giriş yapabilecek.`, confirmText: 'Etkinleştir' })) && setStatus('active')}>
                  <FiPlayCircle /> Hesabı Etkinleştir
                </button>
              ) : u.status !== 'pending' && (
                <button className="btn btn-outline-danger" onClick={() => setModal('suspend')}><FiSlash /> Hesabı Askıya Al</button>
              ))}
              {can('users.manage') && (
                <>
                  <button className="btn btn-soft" disabled={!data.sessions.length} onClick={async () => (await confirm({ title: 'Tüm oturumları kapat', message: 'Kullanıcı tüm cihazlarda yeniden giriş yapmak zorunda kalacak.', confirmText: 'Oturumları Kapat', variant: 'danger' })) && action.mutate({ id, action: 'logoutAll' })}>
                    <FiLogOut /> Tüm Oturumları Kapat
                  </button>
                  <button className="btn btn-soft" disabled={!u.twoFactor} onClick={() => setModal('2fa')}><FiShieldOff /> 2FA Sıfırla</button>
                  {u.status === 'pending' && <button className="btn btn-soft" onClick={() => action.mutate({ id, action: 'resend' })}><FiMail /> Doğrulama E-postası Gönder</button>}
                </>
              )}
            </div>

            {can('users.manage') && (
              <div className="mt-4">
                <label className="form-label">Plan</label>
                <div className="input-group">
                  <select className="form-select" value={plan || u.plan} onChange={(e) => setPlan(e.target.value)}>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {fmtMoney(p.priceMonthly, 'TRY', 0)}/ay</option>)}
                  </select>
                  <button
                    className="btn btn-primary"
                    disabled={!plan || plan === u.plan || update.isPending}
                    onClick={async () => (await confirm({ title: 'Plan değiştir', message: `${u.name}: ${data.plan?.name} → ${plans.find((p) => p.id === plan)?.name}. Ücret farkı bir sonraki faturaya yansır.`, confirmText: 'Değiştir' })) && update.mutate({ id, plan }, { onSuccess: () => { setPlan(''); toast('Plan güncellendi') } })}
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            )}
            <div className="form-help mt-3"><FiInfo /> Yöneticiler kullanıcı adına emir veremez ve API anahtarlarını göremez; yalnızca durdurma/askıya alma yapabilir. Tüm işlemler denetim günlüğüne yazılır.</div>
          </Card>
        </div>
      </div>

      <Card title={<Segmented options={tabs} value={tab} onChange={setTab} />} bodyClass={['accounts', 'trading', 'sessions', 'payments'].includes(tab) ? 'px-0 pb-2' : ''}>
        {tab === 'accounts' && (data.connections.length ? (
          <div className="table-responsive">
            <table className="table table-trading">
              <thead><tr><th className="ps-4">Hesap</th><th>Piyasa</th><th>API Anahtarı</th><th>İzinler</th><th>Gecikme</th><th className="pe-4">Durum</th></tr></thead>
              <tbody>
                {data.connections.map((c) => (
                  <tr key={c.id}>
                    <td className="ps-4"><span className="d-inline-flex align-items-center gap-2"><ExchangeLogo provider={prov[c.provider]} size={26} /> <span><div className="fw-semibold">{c.label}</div><div className="fs-12 text-muted">{prov[c.provider]?.name}</div></span></span></td>
                    <td><MarketBadge market={c.market} /></td>
                    <td className="num fs-13">{c.apiKeyMasked}</td>
                    <td className="fs-13">{c.permissions?.join(', ')}</td>
                    <td className="num">{c.latencyMs ? `${c.latencyMs} ms` : '–'}</td>
                    <td className="pe-4"><StatusBadge status={c.status === 'connected' && c.paused ? 'paused' : c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Bağlı hesap yok" />)}

        {tab === 'trading' && (!u.isDemo ? (
          <EmptyState icon={FiInfo} title="Özet veri" text="Demo dışı kullanıcılar için pozisyon/emir detayı gerçek backend bağlandığında gelir." />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-trading">
                <thead><tr><th className="ps-4">Sembol</th><th>Yön</th><th className="text-end">Miktar</th><th className="text-end">Giriş</th><th className="text-end">Güncel</th><th className="text-end pe-4">K/Z</th></tr></thead>
                <tbody>
                  {data.positions.map((p) => (
                    <tr key={p.id}>
                      <td className="ps-4 fw-semibold">{p.symbol} {p.leverage > 1 && <span className="chip yellow">{p.leverage}x</span>}</td>
                      <td><SideBadge side={p.side} /></td>
                      <td className="text-end num">{fmtQty(p.qty)}</td>
                      <td className="text-end num">{fmtNum(p.entryPrice)}</td>
                      <td className="text-end num">{fmtNum(p.markPrice)}</td>
                      <td className={`text-end num pe-4 ${pnlClass(p.pnl)}`}>{fmtNum(p.pnl, 2)} <span className="fs-12">({fmtPct(p.pnlPct)})</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h6 className="px-4 mt-3">Son emirler</h6>
            <div className="table-responsive">
              <table className="table table-trading">
                <thead><tr><th className="ps-4">Tarih</th><th>Sembol</th><th>Tip</th><th>Yön</th><th className="text-end">Miktar</th><th>Durum</th><th className="pe-4">Kaynak</th></tr></thead>
                <tbody>
                  {data.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="ps-4 fs-13 text-muted">{fmtDateTime(o.createdAt)}</td>
                      <td className="fw-semibold">{o.symbol}</td>
                      <td>{ORDER_TYPE_LABEL[o.type]}</td>
                      <td><SideBadge side={o.side} /></td>
                      <td className="text-end num">{fmtQty(o.qty)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="pe-4"><SourceBadge source={o.source} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

        {tab === 'automation' && (!u.isDemo ? (
          <div className="row g-3">
            <div className="col-md-6"><div className="mini-stat"><small>Bot sayısı</small><span>{u.bots}</span></div></div>
            <div className="col-md-6"><div className="mini-stat"><small>Kural sayısı</small><span>{u.rules}</span></div></div>
          </div>
        ) : (
          <div className="row g-4">
            <div className="col-lg-6">
              <h6>Botlar</h6>
              {data.bots.map((b) => (
                <div key={b.id} className="d-flex justify-content-between align-items-center py-2 border-bottom-dashed">
                  <div><div className="fw-semibold">{b.name}</div><div className="fs-12 text-muted">{b.strategy.toUpperCase()} · {b.symbol}</div></div>
                  <div className="text-end"><StatusBadge status={b.status} /><div className={`fs-12 num ${pnlClass(b.pnl)}`}>{fmtNum(b.pnl, 2)}</div></div>
                </div>
              ))}
            </div>
            <div className="col-lg-6">
              <h6>Kurallar</h6>
              {data.rules.map((r) => (
                <div key={r.id} className="d-flex justify-content-between align-items-center py-2 border-bottom-dashed">
                  <div><div className="fw-semibold">{r.name}</div><div className="fs-12 text-muted">{r.trigger.type} {r.trigger.value} → {r.action.type}</div></div>
                  <span className={`chip ${r.enabled ? 'green' : 'gray'}`}>{r.enabled ? 'Aktif' : 'Pasif'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {tab === 'activity' && (
          <div className="timeline">
            {data.activity.map((a) => (
              <div key={a.id} className="timeline-item">
                <span className={`status-dot ${{ danger: 'red', warning: 'yellow', success: 'green' }[a.level] || 'sky'}`} />
                <div>
                  <div>{a.message}</div>
                  <div className="fs-12 text-muted d-flex gap-2 align-items-center mt-1">{fmtDateTime(a.ts)} <SourceBadge source={a.source} /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'sessions' && (data.sessions.length ? (
          <div className="table-responsive">
            <table className="table table-trading">
              <thead><tr><th className="ps-4">Cihaz</th><th>IP</th><th>Konum</th><th className="pe-4">Son görülme</th></tr></thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-4">{s.device} {s.current && <span className="chip green ms-1">son</span>}</td>
                    <td className="num">{s.ip}</td>
                    <td>{s.city}</td>
                    <td className="pe-4 text-muted">{timeAgo(s.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Aktif oturum yok" />)}

        {tab === 'payments' && (data.payments.length ? (
          <div className="table-responsive">
            <table className="table table-trading">
              <thead><tr><th className="ps-4">Tarih</th><th>Plan</th><th>Yöntem</th><th className="text-end">Tutar</th><th className="pe-4">Durum</th></tr></thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="ps-4 text-muted">{fmtDateTime(p.createdAt)}</td>
                    <td><PlanBadge plan={p.plan} /> <span className="fs-12 text-muted">{p.billing === 'yearly' ? 'yıllık' : 'aylık'}</span></td>
                    <td>{p.method}</td>
                    <td className="text-end num">{fmtMoney(p.amount, 'TRY', 0)}</td>
                    <td className="pe-4"><PaymentBadge status={p.status} />{p.failureReason && <div className="fs-12 text-down">{p.failureReason}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Ödeme kaydı yok" text="Ücretsiz plan kullanıcısı." />)}

        {tab === 'notes' && (
          <>
            <form
              className="d-flex gap-2 mb-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (note.trim()) action.mutate({ id, action: 'note', text: note }, { onSuccess: () => setNote('') })
              }}
            >
              <input className="form-control" placeholder="Ekip içi not ekle (kullanıcı görmez)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-primary" disabled={!note.trim()}><FiSend /></button>
            </form>
            {u.notes.map((n) => (
              <div key={n.id} className="note-item">
                <div>{n.text}</div>
                <div className="fs-12 text-muted mt-1">{n.by} · {fmtDateTime(n.at)}</div>
              </div>
            ))}
            {!u.notes.length && <p className="text-muted mb-0">Henüz not yok.</p>}
          </>
        )}
      </Card>

      {modal === 'halt' && (
        <ReasonModal
          title={`${u.name} – işlemleri durdur`}
          message="Kullanıcı panele girebilir ancak yeni emir veremez; çalışan botları duraklatılır, kuralları işlem yapamaz. Mevcut pozisyonları ve SL/TP korumaları etkilenmez."
          confirmText="İşlemleri Durdur"
          variant="warning"
          pending={update.isPending}
          onClose={() => setModal(null)}
          onConfirm={(reason) => setStatus('trading_halted', reason)}
        />
      )}
      {modal === 'suspend' && (
        <ReasonModal
          title={`${u.name} – hesabı askıya al`}
          message="Kullanıcı giriş yapamaz ve tüm otomasyonları durur. Açık pozisyonları borsada kalır."
          confirmText="Askıya Al"
          pending={update.isPending}
          onClose={() => setModal(null)}
          onConfirm={(reason) => setStatus('suspended', reason)}
        />
      )}
      {modal === '2fa' && (
        <ReasonModal
          title="2FA sıfırla"
          message="Kimlik doğrulaması yapılmadan 2FA sıfırlamayın. Kullanıcı bir sonraki girişte 2FA'yı yeniden kurmalı."
          confirmText="Sıfırla"
          pending={action.isPending}
          onClose={() => setModal(null)}
          onConfirm={(reason) => action.mutate({ id, action: 'reset2fa', reason }, { onSuccess: () => setModal(null) })}
        />
      )}
    </>
  )
}
