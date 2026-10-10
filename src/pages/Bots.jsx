import { useMemo, useState } from 'react'
import { FiPlus, FiPlay, FiPause, FiSquare, FiTrash2, FiRepeat, FiGrid, FiTrendingUp, FiCpu, FiList } from 'react-icons/fi'
import Card from '../components/Card'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import Chart from '../components/Chart'
import EmptyState from '../components/EmptyState'
import { ExchangeTag, StatusBadge } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { useBotAction, useBots, useCreateBot, useLookups, useRisk } from '../api/queries'
import BotDetailModal from '../components/BotDetailModal'
import { tickerStore } from '../hooks/useMarket'
import { duration, fmtMoney, fmtNum, fmtPct, fmtSignedMoney, pnlClass } from '../utils/format'
import { t, pctText } from '../i18n'

const STRATEGIES = {
  dca: { icon: FiRepeat, short: 'DCA', name: t('DCA (Kademeli Alım)'), text: t('Belirli aralıklarla sabit tutarda alır, ortalama maliyeti düşürür, hedef kârda satar.') },
  grid: { icon: FiGrid, short: t('Grid'), name: t('Grid (Aralık)'), text: t('Belirlediğiniz fiyat aralığında kademeli al-sat yaparak yatay piyasadan kâr eder.') },
  trailing: { icon: FiTrendingUp, short: t('Trend'), name: t('Trend Takip'), text: t('Yükselişte pozisyonu tutar, iz süren stop ile kârı korur.') },
}

const configText = (b, quote) => {
  const c = b.config || {}
  if (b.strategy === 'dca') return [`${fmtMoney(c.amount, quote)} / ${c.intervalHours >= 24 ? t('{0} gün', c.intervalHours / 24) : t('{0} saat', c.intervalHours)}`, `TP ${pctText(c.takeProfitPct)}`, t('maks {0} alım', c.maxOrders)]
  if (b.strategy === 'grid') return [`${fmtNum(c.lower)} – ${fmtNum(c.upper)}`, t('{0} kademe', c.grids)]
  return [t('İz %{0}', c.trailingPct), c.takeProfitPct ? `TP ${pctText(c.takeProfitPct)}` : null].filter(Boolean)
}

function BotCard({ bot: b, onOpen }) {
  const lk = useLookups()
  const action = useBotAction()
  const { confirm } = useApp()
  const quote = lk.instrument[b.symbol]?.quote
  const S = STRATEGIES[b.strategy] || STRATEGIES.dca
  const pct = b.investment ? (b.pnl / b.investment) * 100 : 0
  const run = (a) => action.mutate({ id: b.id, action: a })

  return (
    <div className="hn-card bot-card h-100 mb-0">
      <div className="d-flex align-items-start gap-3 bot-card-head" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} title={t('Detayları göster')}>
        <span className="icon-box"><S.icon /></span>
        <div className="flex-grow-1 min-w-0">
          <div className="fw-semibold text-truncate">{b.name}</div>
          <div className="fs-13 text-muted">{S.short} · {b.symbol}</div>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="d-flex justify-content-between align-items-end mt-3">
        <div>
          <div className="fs-12 text-muted">{t('Toplam K/Z')}</div>
          <div className={`fs-4 fw-bold num text-nowrap ${pnlClass(b.pnl)}`}>{fmtSignedMoney(b.pnl, quote)}</div>
          <div className={`fs-13 num ${pnlClass(pct)}`}>{fmtPct(pct)}</div>
        </div>
        <div style={{ width: 140 }}>
          <Chart
            type="area"
            height={60}
            series={[{ name: t('K/Z'), data: b.pnlHistory }]}
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
        <div><small>{t('Yatırım')}</small><span className="num">{fmtMoney(b.investment, quote, 0)}</span></div>
        <div><small>{t('İşlem@@sayı')}</small><span className="num">{b.trades}</span></div>
        <div><small>{t('Süre')}</small><span>{b.startedAt && b.status !== 'stopped' ? duration(b.startedAt) : '–'}</span></div>
      </div>
      <div className="d-flex flex-wrap gap-1 mb-3">
        {configText(b, quote).map((x) => <span key={x} className="chip gray">{x}</span>)}
      </div>
      <div className="fs-13 mb-3"><ExchangeTag exchange={lk.exchange[b.exchangeId]} /></div>
      <div className="d-flex gap-2 mt-auto">
        <button className="btn btn-sm btn-soft" onClick={onOpen} title={t('Alım-satımlar ve bot durumu')}><FiList /> {t('Detay')}</button>
        {b.status !== 'running' && <button className="btn btn-sm btn-success flex-fill" onClick={() => run('start')} disabled={action.isPending}><FiPlay /> {t('Başlat')}</button>}
        {b.status === 'running' && <button className="btn btn-sm btn-warning flex-fill" onClick={() => run('pause')} disabled={action.isPending}><FiPause /> {t('Duraklat')}</button>}
        {b.status !== 'stopped' && (
          <button
            className="btn btn-sm btn-outline-danger flex-fill"
            onClick={async () => (await confirm({ title: t('Botu durdur'), message: t('{0} durdurulacak. Açık bot emirleri iptal edilir, mevcut pozisyon korunur.', b.name), confirmText: t('Durdur'), variant: 'danger' })) && run('stop')}
          >
            <FiSquare /> {t('Durdur')}
          </button>
        )}
        {b.status === 'stopped' && (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={async () => (await confirm({ title: t('Botu sil'), message: t('{0} kalıcı olarak silinecek.', b.name), confirmText: t('Sil'), variant: 'danger' })) && run('remove')}
            aria-label={t('Sil')}
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
  const create = useCreateBot({ success: (d) => t('{0} oluşturuldu', d.name), onSuccess: onClose })
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
  // Form alanları metin tutar ("2386"); toplama yapmadan önce sayıya çevir (yoksa "2637"+"2386" birleşir)
  const gridProfit = useMemo(() => {
    const lower = +f.config.lower
    const upper = +f.config.upper
    const grids = +f.config.grids
    if (!(upper > lower && lower > 0 && grids > 1)) return null
    return (((upper - lower) / grids) / ((upper + lower) / 2)) * 100 - 0.2 // alış + satış komisyonu ~%0,2
  }, [f.config])
  // Güncel fiyat aralığın dışındaysa grid bot fiyat aralığa girene kadar işlem yapmaz
  const gridOutOfRange = f.strategy === 'grid' && last > 0 && +f.config.upper > +f.config.lower && (last < +f.config.lower || last > +f.config.upper)

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
      title={t('Yeni Bot')}
      size="modal-lg"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-soft" onClick={onClose}>{t('Vazgeç')}</button>
          <button className="btn btn-primary" disabled={create.isPending}>{f.autoStart ? t('Oluştur ve Başlat') : t('Oluştur')}</button>
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
          <label className="form-label">{t('Hesap')}</label>
          <select className="form-select" value={f.exchangeId} onChange={(e) => {
            const nx = lk.exchange[e.target.value]
            const sym = lk.instruments.find((i) => i.market === nx?.market)?.symbol
            set({ exchangeId: e.target.value })
            if (sym) changeSymbol(sym)
          }}>
            {usable.map((e) => <option key={e.id} value={e.id}>{e.label}{e.paused ? t(' (duraklatılmış)') : ''}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">{t('Sembol')}</label>
          <select className="form-select" value={f.symbol} onChange={(e) => changeSymbol(e.target.value)}>
            {symbols.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
          </select>
          {last && <div className="form-help mt-1">{t('Güncel:')} {fmtNum(last)} {ins?.quote}</div>}
        </div>
        <div className="col-md-6">
          <label className="form-label">{t('Bot adı')}</label>
          <input className="form-control" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('Otomatik')} />
        </div>
        <div className="col-md-6">
          <label className="form-label">{t('Ayrılacak tutar')}</label>
          <div className="input-group">
            <input type="number" className="form-control" value={f.investment} onChange={(e) => set({ investment: e.target.value })} placeholder={t('Örn. 1000')} />
            <span className="input-group-text">{ins?.quote}</span>
          </div>
        </div>

        {f.strategy === 'dca' && (
          <>
            <div className="col-md-3 col-6">
              <label className="form-label">{t('Alım tutarı')}</label>
              <input type="number" className="form-control" value={f.config.amount} onChange={(e) => setC({ amount: e.target.value })} />
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">{t('Aralık')}</label>
              <select className="form-select" value={f.config.intervalHours} onChange={(e) => setC({ intervalHours: +e.target.value })}>
                <option value={1}>{t('Saatlik')}</option>
                <option value={4}>{t('4 saat')}</option>
                <option value={12}>{t('12 saat')}</option>
                <option value={24}>{t('Günlük')}</option>
                <option value={168}>{t('Haftalık')}</option>
              </select>
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">{t('Hedef kâr %')}</label>
              <input type="number" className="form-control" value={f.config.takeProfitPct} onChange={(e) => setC({ takeProfitPct: e.target.value })} />
            </div>
            <div className="col-md-3 col-6">
              <label className="form-label">{t('Maks. alım')}</label>
              <input type="number" className="form-control" value={f.config.maxOrders} onChange={(e) => setC({ maxOrders: e.target.value })} />
            </div>
          </>
        )}
        {f.strategy === 'grid' && (
          <>
            <div className="col-md-4">
              <label className="form-label">{t('Alt fiyat')}</label>
              <input type="number" step="any" className="form-control" value={f.config.lower} onChange={(e) => setC({ lower: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('Üst fiyat')}</label>
              <input type="number" step="any" className="form-control" value={f.config.upper} onChange={(e) => setC({ upper: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t('Kademe sayısı')}</label>
              <input type="number" className="form-control" value={f.config.grids} onChange={(e) => setC({ grids: e.target.value })} />
            </div>
            {gridProfit !== null && <div className="col-12 form-help">{t('Kademe başına tahmini kâr: ~{0}', pctText(fmtNum(gridProfit, 2)))} {t('(komisyon sonrası)')}</div>}
            {gridOutOfRange && <div className="col-12 form-help text-warning">{t('Güncel fiyat bu aralığın dışında: bot, fiyat aralığa girene kadar işlem yapmaz.')}</div>}
          </>
        )}
        {f.strategy === 'trailing' && (
          <>
            <div className="col-md-6">
              <label className="form-label">{t('İz mesafesi %')}</label>
              <input type="number" step="0.1" className="form-control" value={f.config.trailingPct} onChange={(e) => setC({ trailingPct: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label">{t('Hedef kâr % (isteğe bağlı)')}</label>
              <input type="number" className="form-control" value={f.config.takeProfitPct} onChange={(e) => setC({ takeProfitPct: e.target.value })} />
            </div>
          </>
        )}
        <div className="col-12">
          <div className="form-check">
            <input id="autostart" type="checkbox" className="form-check-input" checked={f.autoStart} onChange={(e) => set({ autoStart: e.target.checked })} />
            <label htmlFor="autostart" className="form-check-label">{t('Oluşturduktan sonra hemen başlat')}</label>
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
  const [detailId, setDetailId] = useState(null)
  const list = bots.filter((b) => filter === 'all' || b.status === filter)
  const toUsd = (v, sym) => (lk.instrument[sym]?.quote === 'TRY' ? v / (tickerStore.get('USD/TRY')?.last || 1) : v)
  const totalPnl = bots.reduce((a, b) => a + toUsd(b.pnl, b.symbol), 0)
  const totalInv = bots.filter((b) => b.status !== 'stopped').reduce((a, b) => a + toUsd(b.investment, b.symbol), 0)

  return (
    <>
      <div className="row">
        <div className="col-md-4">
          <Card><div className="text-muted">{t('Çalışan bot')}</div><div className="fs-2 fw-bold">{bots.filter((b) => b.status === 'running').length} <span className="fs-6 text-muted fw-normal">/ {bots.length}</span></div></Card>
        </div>
        <div className="col-md-4">
          <Card><div className="text-muted">{t('Botlara ayrılan (aktif)')}</div><div className="fs-2 fw-bold num">{fmtMoney(totalInv, 'USD', 0)}</div></Card>
        </div>
        <div className="col-md-4">
          <Card><div className="text-muted">{t('Toplam bot K/Z')}</div><div className={`fs-2 fw-bold num ${pnlClass(totalPnl)}`}>{fmtSignedMoney(totalPnl)}</div></Card>
        </div>
      </div>

      {risk?.killSwitch?.active && <div className="alert alert-danger">{t('Acil durdurma aktif – botlar başlatılamaz.')}</div>}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <Segmented
          options={[
            { value: 'all', label: t('Tümü') },
            { value: 'running', label: t('Çalışan') },
            { value: 'paused', label: t('Duraklatılan') },
            { value: 'stopped', label: t('Durdurulan') },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button className="btn btn-primary" onClick={() => setCreating(true)}><FiPlus /> {t('Yeni Bot')}</button>
      </div>

      {!isLoading && !list.length ? (
        <Card><EmptyState icon={FiCpu} title={t('Bot bulunamadı')} text={t('DCA veya Grid stratejisiyle ilk botunuzu oluşturun.')} /></Card>
      ) : (
        <div className="row g-4 mb-4">
          {list.map((b) => (
            <div className="col-xxl-4 col-md-6" key={b.id}>
              <BotCard bot={b} onOpen={() => setDetailId(b.id)} />
            </div>
          ))}
        </div>
      )}

      {creating && <CreateBotModal onClose={() => setCreating(false)} />}
      {detailId && <BotDetailModal botId={detailId} onClose={() => setDetailId(null)} />}
    </>
  )
}
