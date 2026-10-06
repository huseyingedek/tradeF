import { useEffect, useState } from 'react'
import { FiPower, FiPlay, FiXCircle, FiLogOut, FiShield } from 'react-icons/fi'
import Card from '../components/Card'
import Switch from '../components/Switch'
import { KillSwitchModal } from '../components/KillSwitch'
import { ExchangeLogo, MarketBadge, StatusBadge } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { useCancelAll, useKillSwitch, useLookups, useOrders, usePositions, useRisk, useUpdateExchange, useUpdateRisk } from '../api/queries'
import { positionService } from '../api/services'
import { useQueryClient } from '@tanstack/react-query'
import { fmtDateTime, fmtMoney, fmtPct, fmtSignedMoney, pnlClass } from '../utils/format'

function LimitsForm({ risk }) {
  const update = useUpdateRisk()
  const [f, setF] = useState(null)
  useEffect(() => {
    if (risk && !f) setF({ dailyEnabled: risk.dailyLossLimit.enabled, dailyPct: risk.dailyLossLimit.pct, maxPositionPct: risk.maxPositionPct, maxOpenOrders: risk.maxOpenOrders, requireConfirm: risk.requireConfirm })
  }, [risk, f])
  if (!f) return null
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        update.mutate({ dailyLossLimit: { enabled: f.dailyEnabled, pct: +f.dailyPct }, maxPositionPct: +f.maxPositionPct, maxOpenOrders: +f.maxOpenOrders, requireConfirm: f.requireConfirm })
      }}
    >
      <div className="limit-row">
        <div>
          <div className="fw-semibold">Günlük zarar limiti</div>
          <div className="fs-13 text-muted">Portföy gün içinde bu oranda değer kaybederse tüm işlemler otomatik durdurulur.</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Switch checked={f.dailyEnabled} onChange={(v) => set({ dailyEnabled: v })} />
          <div className="input-group input-group-sm" style={{ width: 110 }}>
            <input type="number" step="0.5" className="form-control" value={f.dailyPct} onChange={(e) => set({ dailyPct: e.target.value })} disabled={!f.dailyEnabled} />
            <span className="input-group-text">%</span>
          </div>
        </div>
      </div>
      <div className="limit-row">
        <div>
          <div className="fw-semibold">Tek emir için maks. tutar</div>
          <div className="fs-13 text-muted">Bir emrin teminatı portföyün bu oranını aşamaz (yanlışlıkla büyük emir koruması).</div>
        </div>
        <div className="input-group input-group-sm" style={{ width: 110 }}>
          <input type="number" className="form-control" value={f.maxPositionPct} onChange={(e) => set({ maxPositionPct: e.target.value })} />
          <span className="input-group-text">%</span>
        </div>
      </div>
      <div className="limit-row">
        <div>
          <div className="fw-semibold">Maks. açık emir</div>
          <div className="fs-13 text-muted">Tüm hesaplarda aynı anda bekleyebilecek emir sayısı.</div>
        </div>
        <input type="number" className="form-control form-control-sm" style={{ width: 110 }} value={f.maxOpenOrders} onChange={(e) => set({ maxOpenOrders: e.target.value })} />
      </div>
      <div className="limit-row">
        <div>
          <div className="fw-semibold">Emir onayı iste</div>
          <div className="fs-13 text-muted">Her manuel emirden önce özet ve onay penceresi gösterilir.</div>
        </div>
        <Switch checked={f.requireConfirm} onChange={(v) => set({ requireConfirm: v })} />
      </div>
      <div className="text-end mt-3">
        <button className="btn btn-primary" disabled={update.isPending}>Kaydet</button>
      </div>
    </form>
  )
}

export default function Risk() {
  const { data: risk } = useRisk()
  const lk = useLookups()
  const kill = useKillSwitch()
  const cancelAll = useCancelAll()
  const updateEx = useUpdateExchange()
  const { data: positions = [] } = usePositions()
  const { data: openOrders = [] } = useOrders('open')
  const { confirm, toast } = useApp()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const active = risk?.killSwitch?.active
  const s = risk?.state

  const closeAll = async () => {
    const ok = await confirm({
      title: 'Tüm pozisyonları kapat',
      message: `${positions.length} açık pozisyon piyasa fiyatından kapatılacak. Bu işlem geri alınamaz.`,
      confirmText: 'Hepsini Kapat',
      variant: 'danger',
      requireText: 'KAPAT',
    })
    if (!ok) return
    setClosing(true)
    const results = await Promise.allSettled(positions.map((p) => positionService.close(p.id, 100)))
    setClosing(false)
    const failed = results.filter((r) => r.status === 'rejected')
    qc.invalidateQueries()
    toast(failed.length ? `${results.length - failed.length} pozisyon kapatıldı, ${failed.length} başarısız: ${failed[0].reason.message}` : 'Tüm pozisyonlar kapatıldı', failed.length ? 'warning' : 'success')
  }

  return (
    <>
      <div className="row">
        <div className="col-xl-5">
          <div className={`hn-card kill-card ${active ? 'is-active' : ''}`}>
            <div className="hn-card-body text-center py-5">
              <div className={`kill-icon mx-auto mb-3 ${active ? 'active' : ''}`}><FiPower /></div>
              <h4 className="mb-2">{active ? 'İşlemler Durduruldu' : 'Tüm Sistemler Aktif'}</h4>
              {active ? (
                <p className="text-muted mb-4">
                  {risk.killSwitch.reason}<br />
                  <small>{fmtDateTime(risk.killSwitch.at)} · {risk.killSwitch.by === 'manual' ? 'manuel' : risk.killSwitch.by === 'rule' ? 'kural ile' : 'risk limiti ile'}</small>
                </p>
              ) : (
                <p className="text-muted mb-4">Acil bir durumda tek tıkla tüm hesaplarda emir girişini, botları ve otomatik kuralları durdurabilirsiniz.</p>
              )}
              {active ? (
                <button
                  className="btn btn-success btn-lg px-5"
                  onClick={async () => (await confirm({ title: 'İşlemleri etkinleştir', message: 'Emir girişi ve kurallar yeniden açılacak. Botlar elle başlatılmalı.', confirmText: 'Etkinleştir' })) && kill.mutate({ active: false })}
                >
                  <FiPlay /> İşlemleri Etkinleştir
                </button>
              ) : (
                <button className="btn btn-danger btn-lg px-5 kill-big" onClick={() => setModal(true)}>
                  <FiPower /> ACİL DURDUR
                </button>
              )}
              <div className="d-flex justify-content-center gap-2 mt-4 flex-wrap">
                <button
                  className="btn btn-sm btn-outline-danger"
                  disabled={!openOrders.length}
                  onClick={async () => (await confirm({ title: 'Tüm emirleri iptal et', message: `${openOrders.length} açık emir iptal edilecek.`, confirmText: 'İptal Et', variant: 'danger' })) && cancelAll.mutate({})}
                >
                  <FiXCircle /> Tüm emirleri iptal et ({openOrders.length})
                </button>
                <button className="btn btn-sm btn-outline-danger" disabled={!positions.length || closing} onClick={closeAll}>
                  <FiLogOut /> {closing ? 'Kapatılıyor…' : `Tüm pozisyonları kapat (${positions.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <Card title="Bugünkü Risk Durumu">
            <div className="row g-3 mb-4">
              <div className="col-sm-4"><div className="mini-stat"><small>Gün başı değer</small><span className="num">{fmtMoney(s?.dayStartValue, 'USD', 0)}</span></div></div>
              <div className="col-sm-4"><div className="mini-stat"><small>Güncel değer</small><span className="num">{fmtMoney(s?.totalValue, 'USD', 0)}</span></div></div>
              <div className="col-sm-4"><div className="mini-stat"><small>Günlük K/Z</small><span className={`num ${pnlClass(s?.dayPnl)}`}>{fmtSignedMoney(s?.dayPnl)} ({fmtPct(s?.dayPnlPct)})</span></div></div>
            </div>
            <div className="d-flex justify-content-between fs-13 mb-1">
              <span>Günlük zarar limiti kullanımı</span>
              <span className="fw-semibold">{risk?.dailyLossLimit?.enabled ? `%${Math.round(s?.lossLimitUsedPct || 0)} / limit %${risk.dailyLossLimit.pct}` : 'Kapalı'}</span>
            </div>
            <div className="progress mb-4" style={{ height: 10 }}>
              <div className="progress-bar" style={{ width: `${s?.lossLimitUsedPct || 0}%`, background: (s?.lossLimitUsedPct || 0) > 70 ? '#f6465d' : (s?.lossLimitUsedPct || 0) > 40 ? '#ffb800' : '#1bd084' }} />
            </div>
            <div className="row g-3">
              <div className="col-4"><div className="mini-stat"><small>Açık emir</small><span>{s?.openOrders} / {risk?.maxOpenOrders}</span></div></div>
              <div className="col-4"><div className="mini-stat"><small>Çalışan bot</small><span>{s?.runningBots}</span></div></div>
              <div className="col-4"><div className="mini-stat"><small>Aktif kural</small><span>{s?.activeRules}</span></div></div>
            </div>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-7">
          <Card title={<div className="d-flex align-items-center gap-2"><FiShield /> <h4>Risk Limitleri</h4></div>}>
            <LimitsForm risk={risk} />
          </Card>
        </div>
        <div className="col-xl-5">
          <Card title="Hesap Bazında Kontrol">
            <p className="fs-13 text-muted">Bir hesabı duraklatmak o hesapta yeni emir ve bot işlemlerini engeller; diğer hesaplar çalışmaya devam eder.</p>
            {lk.exchanges.map((e) => (
              <div key={e.id} className="d-flex align-items-center gap-3 py-2 border-bottom-dashed">
                <ExchangeLogo provider={lk.provider[e.provider]} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{e.label}</div>
                  <div className="d-flex gap-1 align-items-center"><MarketBadge market={e.market} /> {e.status !== 'connected' && <StatusBadge status={e.status} />}</div>
                </div>
                <Switch
                  checked={!e.paused}
                  disabled={updateEx.isPending}
                  onChange={(on) => updateEx.mutate({ id: e.id, paused: !on }, { onSuccess: () => toast(`${e.label} ${on ? 'aktif' : 'duraklatıldı'}`, on ? 'success' : 'warning') })}
                  label={e.paused ? 'Duraklatıldı' : 'Aktif'}
                />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {modal && <KillSwitchModal onClose={() => setModal(false)} />}
    </>
  )
}
