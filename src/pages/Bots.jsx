import { useMemo, useState } from 'react'
import { FiPlus, FiPlay, FiPause, FiSquare, FiTrash2, FiRepeat, FiGrid, FiTrendingUp, FiCpu } from 'react-icons/fi'
import Card from '../components/Card'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import Chart from '../components/Chart'
import EmptyState from '../components/EmptyState'
import { ExchangeTag, StatusBadge } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { useBotAction, useBots, useCreateBot, useLookups, useRisk } from '../api/queries'
import { tickerStore } from '../hooks/useMarket'
import { duration, fmtMoney, fmtNum, fmtPct, fmtSignedMoney, pnlClass } from '../utils/format'

const STRATEGIES = {
  dca: { icon: FiRepeat, short: 'DCA', name: 'DCA (Kademeli Alım)', text: 'Belirli aralıklarla sabit tutarda alır, ortalama maliyeti düşürür, hedef kârda satar.' },
  grid: { icon: FiGrid, short: 'Grid', name: 'Grid (Aralık)', text: 'Belirlediğiniz fiyat aralığında kademeli al-sat yaparak yatay piyasadan kâr eder.' },
  trailing: { icon: FiTrendingUp, short: 'Trend', name: 'Trend Takip', text: 'Yükselişte pozisyonu tutar, iz süren stop ile kârı korur.' },
}

const configText = (b, quote) => {
  const c = b.config || {}
  if (b.strategy === 'dca') return [`${fmtMoney(c.amount, quote)} / ${c.intervalHours >= 24 ? `${c.intervalHours / 24} gün` : `${c.intervalHours} saat`}`, `TP %${c.takeProfitPct}`, `maks ${c.maxOrders} alım`]
  if (b.strategy === 'grid') return [`${fmtNum(c.lower)} – ${fmtNum(c.upper)}`, `${c.grids} kademe`]
  return [`İz %${c.trailingPct}`, c.takeProfitPct ? `TP %${c.takeProfitPct}` : null].filter(Boolean)
}

function BotCard({ bot: b }) {
  const lk = useLookups()
  const action = useBotAction()
  const { confirm } = useApp()
  const quote = lk.instrument[b.symbol]?.quote
  const S = STRATEGIES[b.strategy] || STRATEGIES.dca
  const pct = b.investment ? (b.pnl / b.investment) * 100 : 0
  const run = (a) => action.mutate({ id: b.id, action: a })

  return (
    <div className="hn-card bot-card h-100 mb-0">
      <div className="d-flex align-items-start gap-3">
        <span className="icon-box"><S.icon /></span>
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold text-truncate">{b.name}</div>
          <div className="fs-13 text-muted">{S.short} · {b.symbol}</div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="d-flex justify-content-between align-items-end mt-3">
        <div>
          <div className="fs-12 text-muted">Toplam K/Z</div>
          <div className={`fs-4 fw-bold num text-nowrap ${pnlClass(b.pnl)}`}>{fmtSignedMoney(b.pnl, quote)}</div>
          <div className={`fs-13 num ${pnlClass(pct)}`}>{fmtPct(pct)}</div>
        </div>
        <div style={{ width: 140 }}>
          <Chart
            type="area"
            height={60}
            series={[{ name: 'K/Z', data: b.pnlHistory }]}
            options={{
              chart: { sparkline: { enabled: true }, animations: { enabled: false } },
              stroke: { curve: 'smooth', width: 2 },
              colors: [b.pnl >= 0 ? '#1bd084' : '#f6465d'],
              fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0 } },
              tooltip: { enabled: false },
            }}
          />
        </div>
      </div>
      <div className="bot-stats">
        <div><small>Yatırım</small><span className="num">{fmtMoney(b.investment, quote, 0)}</span></div>
        <div><small>İşlem</small><span className="num">{b.trades}</span></div>
        <div><small>Süre</small><span>{b.startedAt && b.status !== 'stopped' ? duration(b.startedAt) : '–'}</span></div>
      </div>
      <div className="d-flex flex-wrap gap-1 mb-3">
        {configText(b, quote).map((x) => <span key={x} className="chip gray">{x}</span>)}
      </div>
      <div className="fs-13 mb-3"><ExchangeTag exchange={lk.exchange[b.exchangeId]} /></div>
      <div className="d-flex gap-2 mt-auto">
        {b.status !== 'running' && <button className="btn btn-sm btn-success flex-fill" onClick={() => run('start')} disabled={action.isPending}><FiPlay /> Başlat</button>}
        {b.status === 'running' && <button className="btn btn-sm btn-warning flex-fill" onClick={() => run('pause')} disabled={action.isPending}><FiPause /> Duraklat</button>}
        {b.status !== 'stopped' && (
          <button
            className="btn btn-sm btn-outline-danger flex-fill"
            onClick={async () => (await confirm({ title: 'Botu durdur', message: `${b.name} durdurulacak. Açık bot emirleri iptal edilir, mevcut pozisyon korunur.`, confirmText: 'Durdur', variant: 'danger' })) && run('stop')}
          >
            <FiSquare /> Durdur
          </button>
        )}
        {b.status === 'stopped' && (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={async () => (await confirm({ title: 'Botu sil', message: `${b.name} kalıcı olarak silinecek.`, confirmText: 'Sil', variant: 'danger' })) && run('remove')}
            aria-label="Sil"
          >
            <FiTrash2 />
          </button>
        )}
      </div>
    </div>
  )
}

function CreateBotModal({ onClose }) {
  const lk = useLookups()
  const create = useCreateBot({ success: (d) => `${d.name} oluşturuldu`, onSuccess: onClose })
  const usable = lk.exchanges.filter((e) => e.status === 'connected')
  const [f, setF] = useState(() => {
    const ex = usable[0]
    const sym = lk.instruments.find((i) => i.market === ex?.market)?.symbol || 'BTC/USDT'
    const last = tickerStore.get(sym)?.last || 100
    return {
      strategy: 'grid', name: '', exchangeId: ex?.id || '', symbol: sym, investment: '', autoStart: true,
      config: { amount: 100, intervalHours: 24, takeProfitPct: 8, maxOrders: 20, lower: +(last * 0.92).toPrecision(5), upper: +(last * 1.08).toPrecision(5), grids: 20, trailingPct: 3 },
    }
  })
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const setC = (patch) => setF((x) => ({ ...x, config: { ...x.config, ...patch } }))
  const ex = lk.exchange[f.exchangeId]
  const symbols = lk.instruments.filter((i) => i.market === ex?.market)
  const ins = lk.instrument[f.symbol]
  const last = tickerStore.get(f.symbol)?.last

  const changeSymbol = (sym) => {
    const p = tickerStore.get(sym)?.last || 100
    set({ symbol: sym })
    setC({ lower: +(p * 0.92).toPrecision(5), upper: +(p * 1.08).toPrecision(5) })
  }
  const gridProfit = useMemo(() => {
    const { lower, upper, grids } = f.config
    if (!(upper > lower && grids > 1)) return null
    return (((upper - lower) / grids) / ((upper + lower) / 2)) * 100 - 0.2
  }, [f.config])

  const submit = () => {
    const c = f.config
    const config =
      f.strategy === 'dca' ? { amount: +c.amount, intervalHours: +c.intervalHours, takeProfitPct: +c.takeProfitPct, maxOrders: +c.maxOrders }
        : f.strategy === 'grid' ? { lower: +c.lower, upper: +c.upper, grids: +c.grids }
          : { trailingPct: +c.trailingPct, takeProfitPct: +c.takeProfitPct || null }
    create.mutate({ ...f, name: f.name || `${f.symbol} ${STRATEGIES[f.strategy].short}`, investment: +f.investment, config })
  }

  return (
    <Modal
      title="Yeni Bot"
      size="modal-lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-primary" disabled={create.isPending}>{f.autoStart ? 'Oluştur ve Başlat' : 'Oluştur'}</button>
        </>
      }
    >
      <div className="row g-2 mb-3">
        {Object.entries(STRATEGIES).map(([k, s]) => (
          <div className="col-md-4" key={k}>
            <button type="button" className={`strategy-card ${f.strategy === k ? 'active' : ''}`} onClick={() => set({ strategy: k })}>
              <s.icon size={20} />
              <div className="fw-semibold mt-2">{s.name}</div>
              <div className="fs-12 text-muted">{s.text}</div>
            </button>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Hesap</label>
          <select className="form-select" value={f.exchangeId} onChange={(e) => {
            const nx = lk.exchange[e.target.value]
            const sym = lk.instruments.find((i) => i.market === nx?.market)?.symbol
            set({ exchangeId: e.target.value })
            if (sym) changeSymbol(sym)
          }}>
            {usable.map((e) => <option key={e.id} value={e.id}>{e.label}{e.paused ? ' (duraklatılmış)' : ''}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Sembol</label>
          <select className="form-select" value={f.symbol} onChange={(e) => changeSymbol(e.target.value)}>
            {symbols.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
          </select>
          {last && <div className="form-help mt-1">Güncel: {fmtNum(last)} {ins?.quote}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">Bot adı</label>
          <input className="form-control" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Otomatik" />
        </div>
        <div className="col-md-6">
          <label className="form-label">Ayrılacak tutar</label>
          <div className="input-group">
            <input type="number" className="form-control" value={f.investment} onChange={(e) => set({ investment: e.target.value })} placeholder="Örn. 1000" />
            <span className="input-group-text">{ins?.quote}</span>
          </div>
        </div>

        {f.strategy === 'dca' && (
          <>
            <div className="col-md-3 col-6">
              <label className="form-label">Alım tutarı</label>
              <input type="number" className="form-control" value={f.config.amount} onChange={(e) => setC({ amount: e.target.value })} />
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">Aralık</label>
              <select className="form-select" value={f.config.intervalHours} onChange={(e) => setC({ intervalHours: +e.target.value })}>
                <option value={1}>Saatlik</option>
                <option value={4}>4 saat</option>
                <option value={12}>12 saat</option>
                <option value={24}>Günlük</option>
                <option value={168}>Haftalık</option>
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">Hedef kâr %</label>
              <input type="number" className="form-control" value={f.config.takeProfitPct} onChange={(e) => setC({ takeProfitPct: e.target.value })} />
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">Maks. alım</label>
              <input type="number" className="form-control" value={f.config.maxOrders} onChange={(e) => setC({ maxOrders: e.target.value })} />
            </div>
          </>
        )}
        {f.strategy === 'grid' && (
          <>
            <div className="col-md-4">
              <label className="form-label">Alt fiyat</label>
              <input type="number" step="any" className="form-control" value={f.config.lower} onChange={(e) => setC({ lower: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Üst fiyat</label>
              <input type="number" step="any" className="form-control" value={f.config.upper} onChange={(e) => setC({ upper: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Kademe sayısı</label>
              <input type="number" className="form-control" value={f.config.grids} onChange={(e) => setC({ grids: e.target.value })} />
            </div>
            {gridProfit !== null && <div className="col-12 form-help">Kademe başına tahmini kâr: ~%{fmtNum(gridProfit, 2)} (komisyon sonrası)</div>}
          </>
        )}
        {f.strategy === 'trailing' && (
          <>
            <div className="col-md-6">
              <label className="form-label">İz mesafesi %</label>
              <input type="number" step="0.1" className="form-control" value={f.config.trailingPct} onChange={(e) => setC({ trailingPct: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Hedef kâr % (isteğe bağlı)</label>
              <input type="number" className="form-control" value={f.config.takeProfitPct} onChange={(e) => setC({ takeProfitPct: e.target.value })} />
            </div>
          </>
        )}
        <div className="col-12">
          <div className="form-check">
            <input id="autostart" type="checkbox" className="form-check-input" checked={f.autoStart} onChange={(e) => set({ autoStart: e.target.checked })} />
            <label htmlFor="autostart" className="form-check-label">Oluşturduktan sonra hemen başlat</label>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Bots() {
  const { data: bots = [], isLoading } = useBots()
  const { data: risk } = useRisk()
  const lk = useLookups()
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const list = bots.filter((b) => filter === 'all' || b.status === filter)
  const toUsd = (v, sym) => (lk.instrument[sym]?.quote === 'TRY' ? v / (tickerStore.get('USD/TRY')?.last || 1) : v)
  const totalPnl = bots.reduce((a, b) => a + toUsd(b.pnl, b.symbol), 0)
  const totalInv = bots.filter((b) => b.status !== 'stopped').reduce((a, b) => a + toUsd(b.investment, b.symbol), 0)

  return (
    <>
      <div className="row">
        <div className="col-md-4">
          <Card><div className="text-muted">Çalışan bot</div><div className="fs-2 fw-bold">{bots.filter((b) => b.status === 'running').length} <span className="fs-6 text-muted fw-normal">/ {bots.length}</span></div></Card>
        </div>
        <div className="col-md-4">
          <Card><div className="text-muted">Botlara ayrılan (aktif)</div><div className="fs-2 fw-bold num">{fmtMoney(totalInv, 'USD', 0)}</div></Card>
        </div>
        <div className="col-md-4">
          <Card><div className="text-muted">Toplam bot K/Z</div><div className={`fs-2 fw-bold num ${pnlClass(totalPnl)}`}>{fmtSignedMoney(totalPnl)}</div></Card>
        </div>
      </div>

      {risk?.killSwitch?.active && <div className="alert alert-danger">Acil durdurma aktif – botlar başlatılamaz.</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <Segmented
          options={[
            { value: 'all', label: 'Tümü' },
            { value: 'running', label: 'Çalışan' },
            { value: 'paused', label: 'Duraklatılan' },
            { value: 'stopped', label: 'Durdurulan' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus /> Yeni Bot</button>
      </div>

      {!isLoading && !list.length ? (
        <Card><EmptyState icon={FiCpu} title="Bot bulunamadı" text="DCA veya Grid stratejisiyle ilk botunuzu oluşturun." /></Card>
      ) : (
        <div className="row g-4 mb-4">
          {list.map((b) => (
            <div className="col-xxl-4 col-md-6" key={b.id}>
              <BotCard bot={b} />
            </div>
          ))}
        </div>
      )}

      {creating && <CreateBotModal onClose={() => setCreating(false)} />}
    </>
  )
}
