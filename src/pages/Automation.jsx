import { useMemo, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiBell, FiShield, FiTrendingDown, FiTrendingUp, FiZap, FiArrowRight } from 'react-icons/fi'
import Card from '../components/Card'
import Modal from '../components/Modal'
import Switch from '../components/Switch'
import EmptyState from '../components/EmptyState'
import { ExchangeTag } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { useDeleteRule, useLookups, useRules, useSaveRule, useToggleRule } from '../api/queries'
import { tickerStore, useTickerVersion } from '../hooks/useMarket'
import { fmtNum, fmtPct, timeAgo } from '../utils/format'
import { describeRule } from '../utils/trading'
import { t as tr } from '../i18n'

const TRIGGERS = [
  { value: 'price_above', label: tr('Fiyat şunun üzerine çıkarsa'), unit: 'price' },
  { value: 'price_below', label: tr('Fiyat şunun altına düşerse'), unit: 'price' },
  { value: 'change_above', label: tr('24s değişim % şunun üzerindeyse'), unit: '%' },
  { value: 'change_below', label: tr('24s değişim % şunun altındaysa'), unit: '%' },
  { value: 'position_pnl_below', label: tr('Pozisyon K/Z % şunun altına düşerse'), unit: '%' },
  { value: 'portfolio_drawdown', label: tr('Günlük portföy K/Z % şunun altına düşerse'), unit: '%' },
]
const ACTIONS = [
  { value: 'notify', label: tr('Bildirim gönder') },
  { value: 'market_buy', label: tr('Piyasa fiyatından al') },
  { value: 'market_sell', label: tr('Pozisyonun bir kısmını sat') },
  { value: 'close_position', label: tr('Pozisyonu tamamen kapat') },
  { value: 'cancel_orders', label: tr('Açık emirleri iptal et') },
  { value: 'pause_exchange', label: tr('Hesapta işlemleri duraklat') },
  { value: 'kill_switch', label: tr('TÜM işlemleri durdur (kill switch)') },
]
const NEEDS_EXCHANGE = ['market_buy', 'market_sell', 'close_position', 'pause_exchange']

const empty = {
  name: '', enabled: true, symbol: 'BTC/USDT', exchangeId: '',
  trigger: { type: 'price_below', value: '' }, action: { type: 'notify', percent: 100, qty: '' },
  repeat: 'once', cooldownSec: 3600,
}

function RuleModal({ initial, onClose }) {
  const lk = useLookups()
  const save = useSaveRule({ success: (d) => tr('Kural kaydedildi: {0}', d.name), onSuccess: onClose })
  const [r, setR] = useState(() => ({
    ...empty,
    ...initial,
    symbol: initial?.symbol || empty.symbol,
    trigger: { ...empty.trigger, ...initial?.trigger },
    action: { type: 'notify', percent: initial?.action?.qty ? '' : 100, qty: '', ...initial?.action },
  }))
  const set = (patch) => setR((x) => ({ ...x, ...patch }))
  const setT = (patch) => setR((x) => ({ ...x, trigger: { ...x.trigger, ...patch } }))
  const setA = (patch) => setR((x) => ({ ...x, action: { ...x.action, ...patch } }))

  const portfolioRule = r.trigger.type === 'portfolio_drawdown'
  const ins = lk.instrument[r.symbol]
  const accounts = lk.exchanges.filter((e) => !ins || e.market === ins.market)
  const t = tickerStore.get(r.symbol)
  const unit = TRIGGERS.find((x) => x.value === r.trigger.type)?.unit
  const preview = describeRule({ ...r, symbol: portfolioRule ? null : r.symbol, trigger: { ...r.trigger, value: r.trigger.value || '…' } }, lk.exchange[r.exchangeId]?.label)
  const sellMode = r.action.qty && !r.action.percent ? 'qty' : 'percent'

  const submit = () => {
    const payload = {
      ...r,
      symbol: portfolioRule ? null : r.symbol,
      exchangeId: r.exchangeId || null,
      trigger: { type: r.trigger.type, value: +r.trigger.value },
      action:
        r.action.type === 'market_buy' ? { type: 'market_buy', qty: +r.action.qty }
          : r.action.type === 'market_sell' ? (sellMode === 'qty' ? { type: 'market_sell', qty: +r.action.qty } : { type: 'market_sell', percent: +r.action.percent })
            : { type: r.action.type },
      cooldownSec: r.repeat === 'always' ? +r.cooldownSec : 0,
    }
    delete payload.triggerCount
    delete payload.lastTriggeredAt
    delete payload.createdAt
    save.mutate(payload)
  }

  return (
    <Modal
      title={r.id ? tr('Kuralı Düzenle') : tr('Yeni Kural')}
      size="modal-lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>{tr('Vazgeç')}</button>
          <button className="btn btn-primary" disabled={save.isPending}>{tr('Kaydet')}</button>
        </>
      }
    >
      <div className="mb-3">
        <label className="form-label">{tr('Kural adı')}</label>
        <input className="form-control" value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder={tr('Örn. BTC zarar kes')} />
      </div>

      <div className="rule-step">
        <div className="rule-step-title"><span>1</span> {tr('EĞER (koşul)')}</div>
        <div className="row g-2">
          <div className="col-md-6">
            <select className="form-select" value={r.trigger.type} onChange={(e) => setT({ type: e.target.value })}>
              {TRIGGERS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          {!portfolioRule && (
            <div className="col-md-3 col-6">
              <select className="form-select" value={r.symbol} onChange={(e) => set({ symbol: e.target.value, exchangeId: '' })}>
                {lk.instruments.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
              </select>
            </div>
          )}
          <div className={portfolioRule ? 'col-md-6' : 'col-md-3 col-6'}>
            <div className="input-group">
              <input type="number" step="any" className="form-control" value={r.trigger.value} onChange={(e) => setT({ value: e.target.value })} placeholder={tr('Değer')} />
              <span className="input-group-text">{unit === 'price' ? ins?.quote : '%'}</span>
            </div>
          </div>
        </div>
        {!portfolioRule && t && (
          <div className="form-help mt-2">
            {tr('Şu an:')} {fmtNum(t.last)} {ins?.quote} {tr('· 24s')} {fmtPct(t.changePct)}
            {unit === 'price' && (
              <span className="ms-2">
                {tr('Hızlı:')}{' '}
                {[-10, -5, -2, 2, 5, 10].map((p) => (
                  <button type="button" key={p} className="btn btn-link btn-sm p-0 mx-1" onClick={() => setT({ value: +(t.last * (1 + p / 100)).toPrecision(6) })}>{p > 0 ? '+' : ''}{p}%</button>
                ))}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rule-step">
        <div className="rule-step-title"><span>2</span> {tr('O ZAMAN (aksiyon)')}</div>
        <div className="row g-2">
          <div className="col-md-6">
            <select className="form-select" value={r.action.type} onChange={(e) => setA({ type: e.target.value })}>
              {ACTIONS.filter((a) => !(portfolioRule && ['market_buy', 'market_sell', 'close_position'].includes(a.value))).map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
          {(NEEDS_EXCHANGE.includes(r.action.type) || r.action.type === 'cancel_orders') && (
            <div className="col-md-6">
              <select className="form-select" value={r.exchangeId || ''} onChange={(e) => set({ exchangeId: e.target.value })}>
                <option value="">{r.action.type === 'cancel_orders' ? tr('Tüm hesaplar') : tr('Hesap seçin…')}</option>
                {(r.action.type === 'pause_exchange' || portfolioRule ? lk.exchanges : accounts).map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
          )}
          {r.action.type === 'market_buy' && (
            <div className="col-md-6">
              <div className="input-group">
                <input type="number" step="any" className="form-control" value={r.action.qty} onChange={(e) => setA({ qty: e.target.value })} placeholder={tr('Miktar')} />
                <span className="input-group-text">{ins?.base}</span>
              </div>
            </div>
          )}
          {r.action.type === 'market_sell' && (
            <div className="col-md-6">
              <div className="input-group">
                <select className="form-select" style={{ maxWidth: 130 }} value={sellMode} onChange={(e) => (e.target.value === 'qty' ? setA({ percent: '', qty: r.action.qty || 1 }) : setA({ percent: 100, qty: '' }))}>
                  <option value="percent">{tr('Yüzde')}</option>
                  <option value="qty">{tr('Miktar')}</option>
                </select>
                {sellMode === 'percent' ? (
                  <>
                    <input type="number" min="1" max="100" className="form-control" value={r.action.percent} onChange={(e) => setA({ percent: e.target.value })} />
                    <span className="input-group-text">%</span>
                  </>
                ) : (
                  <>
                    <input type="number" step="any" className="form-control" value={r.action.qty} onChange={(e) => setA({ qty: e.target.value })} />
                    <span className="input-group-text">{ins?.base}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {r.action.type === 'kill_switch' && <div className="form-help mt-2 text-down">{tr('Tetiklenince tüm botlar duraklar, açık emirler iptal edilir ve yeni emir girişi engellenir.')}</div>}
      </div>

      <div className="rule-step">
        <div className="rule-step-title"><span>3</span> TEKRAR</div>
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <div className="form-check">
            <input id="rep-once" type="radio" className="form-check-input" checked={r.repeat === 'once'} onChange={() => set({ repeat: 'once' })} />
            <label htmlFor="rep-once" className="form-check-label">{tr('Bir kez çalış, sonra pasifleş')}</label>
          </div>
          <div className="form-check">
            <input id="rep-always" type="radio" className="form-check-input" checked={r.repeat === 'always'} onChange={() => set({ repeat: 'always' })} />
            <label htmlFor="rep-always" className="form-check-label">{tr('Her seferinde çalış')}</label>
          </div>
          {r.repeat === 'always' && (
            <div className="input-group" style={{ maxWidth: 230 }}>
              <span className="input-group-text">{tr('Bekleme')}</span>
              <select className="form-select" value={r.cooldownSec} onChange={(e) => set({ cooldownSec: +e.target.value })}>
                <option value={60}>{tr('1 dk')}</option>
                <option value={900}>{tr('15 dk')}</option>
                <option value={3600}>{tr('1 saat')}</option>
                <option value={21600}>{tr('6 saat')}</option>
                <option value={86400}>{tr('1 gün')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="rule-preview">
        <FiZap className="flex-shrink-0" />
        <span><strong>{preview.cond}</strong> <FiArrowRight /> {preview.act}</span>
      </div>
    </Modal>
  )
}

export default function Automation() {
  useTickerVersion()
  const lk = useLookups()
  const { data: rules = [], isLoading } = useRules()
  const toggle = useToggleRule()
  const del = useDeleteRule()
  const { confirm } = useApp()
  const [editing, setEditing] = useState(null)

  const templates = useMemo(() => {
    const btc = tickerStore.get('BTC/USDT')?.last || 64000
    const r6 = (v) => +v.toPrecision(6)
    return [
      { icon: FiShield, title: tr('Zarar Kes'), text: tr('Fiyat %5 düşerse pozisyonu kapat'), rule: { name: tr('BTC zarar kes %5'), symbol: 'BTC/USDT', exchangeId: 'cx_binance', trigger: { type: 'price_below', value: r6(btc * 0.95) }, action: { type: 'close_position' } } },
      { icon: FiTrendingUp, title: tr('Kâr Al'), text: tr('Fiyat %10 yükselirse yarısını sat'), rule: { name: tr('BTC kâr al %10'), symbol: 'BTC/USDT', exchangeId: 'cx_binance', trigger: { type: 'price_above', value: r6(btc * 1.1) }, action: { type: 'market_sell', percent: 50 } } },
      { icon: FiBell, title: tr('Fiyat Alarmı'), text: tr('Belirli seviyede bildirim al'), rule: { name: tr('BTC alarmı'), symbol: 'BTC/USDT', trigger: { type: 'price_above', value: r6(btc * 1.03) }, action: { type: 'notify' }, repeat: 'always', cooldownSec: 3600 } },
      { icon: FiTrendingDown, title: tr('Günlük Koruma'), text: tr('Günlük zarar %3 olursa her şeyi durdur'), rule: { name: tr('Günlük zarar koruması'), symbol: null, trigger: { type: 'portfolio_drawdown', value: -3 }, action: { type: 'kill_switch' } } },
    ]
  }, [])

  const onDelete = async (r) => {
    if (await confirm({ title: tr('Kuralı sil'), message: tr('"{0}" kalıcı olarak silinecek.', r.name), confirmText: tr('Sil'), variant: 'danger' })) del.mutate(r.id)
  }

  return (
    <>
      <div className="row">
        {templates.map((tpl) => (
          <div className="col-xl-3 col-sm-6" key={tpl.title}>
            <button className="hn-card template-card w-100 text-start" onClick={() => setEditing(tpl.rule)}>
              <span className="icon-box"><tpl.icon /></span>
              <div>
                <div className="fw-semibold">{tpl.title}</div>
                <div className="fs-13 text-muted">{tpl.text}</div>
              </div>
              <FiPlus className="ms-auto text-primary" />
            </button>
          </div>
        ))}
      </div>

      <Card
        title={<div><h4>{tr('Kurallar & Alarmlar')}</h4><small className="text-muted">{tr('Siz ekran başında değilken koşullar gerçekleşince otomatik çalışır.')}</small></div>}
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><FiPlus /> {tr('Yeni Kural')}</button>}
        bodyClass="px-0 pb-2"
      >
        {!isLoading && !rules.length ? (
          <EmptyState icon={FiZap} title={tr('Henüz kural yok')} text={tr('Hazır şablonlardan biriyle başlayabilirsiniz.')} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-trading">
              <thead>
                <tr>
                  <th className="ps-4">{tr('Aktif')}</th>
                  <th>{tr('Kural')}</th>
                  <th className="d-none d-lg-table-cell">{tr('Hesap')}</th>
                  <th className="text-end d-none d-md-table-cell">{tr('Güncel')}</th>
                  <th className="text-center">{tr('Tetiklenme')}</th>
                  <th className="pe-4 text-end">{tr('İşlem')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const d = describeRule(r, lk.exchange[r.exchangeId]?.label)
                  const tk = r.symbol && tickerStore.get(r.symbol)
                  const priceRule = ['price_above', 'price_below'].includes(r.trigger.type)
                  const dist = priceRule && tk ? ((r.trigger.value - tk.last) / tk.last) * 100 : null
                  return (
                    <tr key={r.id} className={r.enabled ? '' : 'opacity-50'}>
                      <td className="ps-4"><Switch checked={r.enabled} onChange={(v) => toggle.mutate({ id: r.id, enabled: v })} /></td>
                      <td style={{ minWidth: 260 }}>
                        <div className="fw-semibold">{r.name} {r.repeat === 'always' && <span className="chip gray ms-1">{tr('tekrarlı')}</span>}</div>
                        <div className="fs-13 text-muted">{d.cond} → <span className={r.action.type === 'kill_switch' ? 'text-down fw-semibold' : ''}>{d.act}</span></div>
                      </td>
                      <td className="d-none d-lg-table-cell">{r.exchangeId ? <ExchangeTag exchange={lk.exchange[r.exchangeId]} /> : <span className="text-muted">{tr('Tümü')}</span>}</td>
                      <td className="text-end d-none d-md-table-cell num">
                        {tk ? (
                          <>
                            <div>{fmtNum(tk.last)}</div>
                            {dist !== null && <div className="fs-12 text-muted">{tr('hedefe')} {fmtPct(dist, 1)}</div>}
                          </>
                        ) : '–'}
                      </td>
                      <td className="text-center">
                        <div className="fw-semibold">{r.triggerCount}</div>
                        <div className="fs-12 text-muted">{r.lastTriggeredAt ? timeAgo(r.lastTriggeredAt) : tr('hiç')}</div>
                      </td>
                      <td className="pe-4 text-end text-nowrap">
                        <button className="btn btn-sm btn-soft me-1" onClick={() => setEditing(r)} aria-label={tr('Düzenle')}><FiEdit2 /></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(r)} aria-label={tr('Sil')}><FiTrash2 /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <RuleModal initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
