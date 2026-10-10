import { useEffect, useState } from 'react'
import { FiPower, FiPlay, FiTool, FiX, FiPlus, FiSliders, FiSlash } from 'react-icons/fi'
import Card from '../../components/Card'
import Switch from '../../components/Switch'
import ReasonModal from '../../components/admin/ReasonModal'
import RequirePerm from '../../components/admin/RequirePerm'
import { ExchangeLogo } from '../../components/Badges'
import { HealthBadge } from '../../components/admin/AdminBadges'
import { usePlatform, usePlatformKill, useProviderHealth, useUpdatePlatform, useUpdateProvider } from '../../api/adminQueries'
import { useInstruments } from '../../api/queries'
import { useApp } from '../../context/AppContext'
import { fmtDateTime } from '../../utils/format'
import { t, tServer } from '../../i18n'

function Limits({ p }) {
  const update = useUpdatePlatform()
  const [f, setF] = useState(null)
  useEffect(() => {
    if (p && !f) setF({ maxLeverage: p.maxLeverage, maxOrderUsd: p.maxOrderUsd, registrationOpen: p.registrationOpen, requireUser2fa: p.requireUser2fa })
  }, [p, f])
  if (!f) return null
  const set = (x) => setF((v) => ({ ...v, ...x }))
  return (
    <form onSubmit={(e) => { e.preventDefault(); update.mutate({ ...f, maxLeverage: +f.maxLeverage, maxOrderUsd: +f.maxOrderUsd }) }}>
      <div className="limit-row">
        <div><div className="fw-semibold">{t('Maksimum kaldıraç')}</div><div className="fs-13 text-muted">{t('Tüm kullanıcılar için üst sınır (plan izin verse bile).')}</div></div>
        <div className="input-group input-group-sm" style={{ width: 110 }}>
          <input type="number" className="form-control" value={f.maxLeverage} onChange={(e) => set({ maxLeverage: e.target.value })} />
          <span className="input-group-text">x</span>
        </div>
      </div>
      <div className="limit-row">
        <div><div className="fw-semibold">{t('Tek emir üst limiti')}</div><div className="fs-13 text-muted">{t('Hatalı / anormal büyük emirlere karşı platform sigortası.')}</div></div>
        <div className="input-group input-group-sm" style={{ width: 150 }}>
          <span className="input-group-text">$</span>
          <input type="number" className="form-control" value={f.maxOrderUsd} onChange={(e) => set({ maxOrderUsd: e.target.value })} />
        </div>
      </div>
      <div className="limit-row">
        <div><div className="fw-semibold">{t('Yeni kayıtlar')}</div><div className="fs-13 text-muted">{t('Kapalıyken kayıt sayfası yeni hesap oluşturmaz.')}</div></div>
        <Switch checked={f.registrationOpen} onChange={(v) => set({ registrationOpen: v })} label={f.registrationOpen ? t('Açık') : t('Kapalı')} />
      </div>
      <div className="limit-row">
        <div><div className="fw-semibold">{t('Kullanıcılar için 2FA zorunlu')}</div><div className="fs-13 text-muted">{t('Açılırsa 2FA\'sız kullanıcılar ilk girişte kurmak zorunda kalır.')}</div></div>
        <Switch checked={f.requireUser2fa} onChange={(v) => set({ requireUser2fa: v })} />
      </div>
      <div className="text-end mt-3"><button className="btn btn-primary" disabled={update.isPending}>{t('Kaydet')}</button></div>
    </form>
  )
}

function Maintenance({ p }) {
  const update = useUpdatePlatform()
  const [msg, setMsg] = useState(p.maintenance.message || t('Planlı bakım çalışması yapılıyor. Kurallar ve SL/TP korumaları çalışmaya devam eder.'))
  const active = p.maintenance.active
  return (
    <>
      <p className="fs-13 text-muted">{t('Bakım modunda kullanıcılar paneli görür ama yeni emir veremez; üstte bakım mesajı gösterilir.')}</p>
      <textarea className="form-control mb-3" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} disabled={active} />
      <button className={`btn ${active ? 'btn-success' : 'btn-outline-warning'}`} disabled={update.isPending} onClick={() => update.mutate({ maintenance: { active: !active, message: msg } })}>
        <FiTool /> {active ? t('Bakım Modunu Kapat') : t('Bakım Modunu Aç')}
      </button>
    </>
  )
}

function BlockedSymbols({ p }) {
  const { data: instruments = [] } = useInstruments()
  const update = useUpdatePlatform()
  const [sym, setSym] = useState('')
  const list = p.blockedSymbols
  return (
    <>
      <p className="fs-13 text-muted">{t('Listedeki sembollerde yeni emir verilemez (ör. delist, manipülasyon şüphesi). Mevcut pozisyonlar kapatılabilir.')}</p>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {list.map((s) => (
          <span key={s} className="chip red">
            {s}
            <button className="btn btn-sm p-0 border-0 ms-1 text-reset" onClick={() => update.mutate({ blockedSymbols: list.filter((x) => x !== s) })} aria-label={t('{0} kaldır', s)}><FiX /></button>
          </span>
        ))}
        {!list.length && <span className="text-muted fs-13">{t('Yasaklı sembol yok.')}</span>}
      </div>
      <div className="input-group">
        <select className="form-select" value={sym} onChange={(e) => setSym(e.target.value)}>
          <option value="">{t('Sembol seçin…')}</option>
          {instruments.filter((i) => !list.includes(i.symbol)).map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol} – {i.name}</option>)}
        </select>
        <button className="btn btn-outline-danger" disabled={!sym} onClick={() => { update.mutate({ blockedSymbols: [...list, sym] }); setSym('') }}><FiPlus /> {t('Engelle')}</button>
      </div>
    </>
  )
}

function PlatformRiskPage() {
  const { data: p } = usePlatform()
  const { data: health } = useProviderHealth()
  const kill = usePlatformKill()
  const updateProv = useUpdateProvider()
  const { confirm, toast } = useApp()
  const [modal, setModal] = useState(null)
  if (!p) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
  const active = p.killSwitch.active

  return (
    <>
      <div className="row">
        <div className="col-xl-5">
          <div className={`hn-card kill-card ${active ? 'is-active' : ''}`}>
            <div className="hn-card-body text-center py-5">
              <div className={`kill-icon mx-auto mb-3 ${active ? 'active' : ''}`}><FiPower /></div>
              <h4 className="mb-2">{active ? t('Platform Genelinde İşlemler Durduruldu') : t('Platform İşlemleri Açık')}</h4>
              {active ? (
                <p className="text-muted mb-4">{tServer(p.killSwitch.reason)}<br /><small>{p.killSwitch.by} · {fmtDateTime(p.killSwitch.at)}</small></p>
              ) : (
                <p className="text-muted mb-4">{t('Kritik bir olayda (borsa güvenlik ihlali, sistem hatası, aşırı volatilite) tüm kullanıcılar için yeni emirleri ve botları tek seferde durdurur.')}</p>
              )}
              {active ? (
                <button className="btn btn-success btn-lg px-5" onClick={async () => (await confirm({ title: t('Platform işlemlerini aç'), message: t('Tüm kullanıcılar yeniden emir verebilecek. Botlar kullanıcılar tarafından elle başlatılmalı.'), confirmText: t('İşlemleri Aç') })) && kill.mutate({ active: false }, { onSuccess: () => toast(t('Platform işlemleri açıldı')) })}>
                  <FiPlay /> {t('İşlemleri Aç')}
                </button>
              ) : (
                <button className="btn btn-danger btn-lg px-5 kill-big" onClick={() => setModal('kill')}><FiPower /> PLATFORMU DURDUR</button>
              )}
            </div>
          </div>
        </div>
        <div className="col-xl-7">
          <Card title={<div className="d-flex align-items-center gap-2"><FiSlash /><h4>{t('Borsa Bazında Durdurma')}</h4></div>}>
            <p className="fs-13 text-muted">{t('Bir borsada sorun varsa (API kesintisi, güvenlik olayı) sadece o borsadaki tüm kullanıcı işlemlerini durdurun.')}</p>
            {health?.providers.map((h) => (
              <div key={h.id} className="d-flex align-items-center gap-3 py-2 border-bottom-dashed">
                <ExchangeLogo provider={h} size={30} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold">{tServer(h.name)}</div>
                  <div className="fs-12 text-muted">{h.accounts} {t('kullanıcı hesabı')}</div>
                </div>
                <HealthBadge status={h.status} />
                <Switch
                  checked={!h.tradingHalted}
                  onChange={(on) => (on ? updateProv.mutate({ id: h.id, tradingHalted: false }, { onSuccess: () => toast(t('{0} işlemleri açıldı', h.name)) }) : setModal({ halt: h }))}
                  label={h.tradingHalted ? t('Durduruldu') : t('Açık')}
                />
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-6">
          <Card title={<div className="d-flex align-items-center gap-2"><FiSliders /><h4>{t('Global Limitler')}</h4></div>}><Limits p={p} /></Card>
        </div>
        <div className="col-xl-6">
          <Card title={t('Bakım Modu')}><Maintenance key={String(p.maintenance.active)} p={p} /></Card>
          <Card title={t('Yasaklı Semboller')}><BlockedSymbols p={p} /></Card>
        </div>
      </div>

      {modal === 'kill' && (
        <ReasonModal
          title={t('Platformu durdur')}
          message={t('Tüm kullanıcıların yeni emirleri reddedilir ve çalışan botları duraklatılır. Zarar-kes / kâr-al korumaları çalışmaya devam eder. Kullanıcılara panelde uyarı gösterilir.')}
          confirmText={t('Platformu Durdur')}
          pending={kill.isPending}
          onClose={() => setModal(null)}
          onConfirm={(reason) => kill.mutate({ active: true, reason }, { onSuccess: () => { setModal(null); toast(t('Platform genelinde işlemler durduruldu'), 'danger') } })}
        />
      )}
      {modal?.halt && (
        <ReasonModal
          title={t('{0} – işlemleri durdur', modal.halt.name)}
          message={t('{0} kullanıcı hesabında yeni emir verilemeyecek.', modal.halt.accounts)}
          confirmText={t('Durdur')}
          pending={updateProv.isPending}
          onClose={() => setModal(null)}
          onConfirm={(reason) => updateProv.mutate({ id: modal.halt.id, tradingHalted: true, reason }, { onSuccess: () => { setModal(null); toast(t('{0} işlemleri durduruldu', modal.halt.name), 'warning') } })}
        />
      )}
    </>
  )
}

export default function PlatformRisk() {
  return <RequirePerm perm="risk.manage"><PlatformRiskPage /></RequirePerm>
}
