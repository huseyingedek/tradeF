import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiChevronDown, FiSearch, FiStar } from 'react-icons/fi'
import Card from '../components/Card'
import Dropdown from '../components/Dropdown'
import Segmented from '../components/Segmented'
import Switch from '../components/Switch'
import { ExchangeLogo, MarketBadge, StatusBadge } from '../components/Badges'
import { FlashNumber } from '../components/Live'
import PriceChart from '../components/trading/PriceChart'
import { OrderBook, RecentTrades } from '../components/trading/OrderBook'
import OrderForm from '../components/trading/OrderForm'
import PositionsTable from '../components/trading/PositionsTable'
import OrdersTable from '../components/trading/OrdersTable'
import { useApp } from '../context/AppContext'
import { useBalances, useCancelAll, useLookups, useOrders, usePositions } from '../api/queries'
import { useTicker } from '../hooks/useMarket'
import { fmtCompact, fmtNum, fmtPct, pnlClass, stepDecimals } from '../utils/format'
import { t as tr } from '../i18n'

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d']
const INTERVAL_TR = { '1m': tr('1dk'), '5m': tr('5dk'), '15m': tr('15dk'), '1h': tr('1s'), '4h': tr('4s'), '1d': tr('1G') }
const decimalsOf = (step) => stepDecimals(step)

function SymbolPicker({ value, instruments, onChange }) {
  const [q, setQ] = useState('')
  // yüzlerce sembol: arama yoksa ilk 100, aramada eşleşenlerin ilk 100'ü (önce sembolü aranan kelimeyle başlayanlar)
  const Q = q.trim().toUpperCase()
  const list = instruments
    .filter((i) => !Q || i.symbol.includes(Q) || i.name.toUpperCase().includes(Q))
    .sort((a, b) => (Q ? (b.symbol.startsWith(Q) ? 1 : 0) - (a.symbol.startsWith(Q) ? 1 : 0) : 0))
    .slice(0, 100)
  return (
    <Dropdown
      caret={false}
      align="start"
      toggleClass="symbol-picker"
      menuClass="p-2 symbol-menu"
      toggle={<><span className="fs-4 fw-bold">{value}</span><FiChevronDown /></>}
    >
      <div className="position-relative mb-2">
        <input className="form-control form-control-sm pe-4" placeholder={tr('Ara…')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <FiSearch className="position-absolute text-muted" style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }} />
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {list.map((i) => (
          <button key={i.symbol} className={`dropdown-item d-flex justify-content-between gap-3 ${i.symbol === value ? 'active' : ''}`} data-close onClick={() => onChange(i.symbol)}>
            <span className="fw-semibold">{i.symbol}</span>
            <small className="opacity-75">{i.name}</small>
          </button>
        ))}
      </div>
    </Dropdown>
  )
}

export default function Trade() {
  const [params, setParams] = useSearchParams()
  const lk = useLookups()
  const { watchlist, toggleWatch } = useApp()
  const symbol = params.get('symbol') || 'BTC/USDT'
  const ins = lk.instrument[symbol]
  const t = useTicker(symbol)
  const [interval, setChartInterval] = useState('15m')
  const [bookTab, setBookTab] = useState('book')
  const [bottomTab, setBottomTab] = useState('positions')
  const [onlyThis, setOnlyThis] = useState(false)
  const [pickedPrice, setPickedPrice] = useState(null)

  const { data: positions = [] } = usePositions()
  const { data: openOrders = [] } = useOrders('open')
  const { data: history = [] } = useOrders('history')
  const { data: balances = [] } = useBalances()
  const cancelAll = useCancelAll()
  const { confirm } = useApp()

  // Bu sembolün piyasasını destekleyen hesaplar
  const accounts = useMemo(() => lk.exchanges.filter((e) => ins && e.market === ins.market), [lk.exchanges, ins])
  const exParam = params.get('ex')
  const exchange = accounts.find((e) => e.id === exParam) || accounts.find((e) => e.status === 'connected' && !e.paused) || accounts[0]
  const provider = exchange ? lk.provider[exchange.provider] : null
  const position = positions.find((p) => p.exchangeId === exchange?.id && p.symbol === symbol)
  // Kullanılabilir nakit: sanal hesapta hesabın para birimi, canlı hesapta sembolün karşı varlığı (ör. USDT).
  // (Canlı hesapta birden çok varlık olduğundan "ilk bakiye" yanlış varlığı gösterebiliyordu.)
  const cashAsset = exchange?.mode === 'live' ? ins?.quote : { crypto: 'USDT', bist: 'TRY', forex: 'USD' }[exchange?.market]
  const cash = balances.find((b) => b.exchangeId === exchange?.id && b.asset === cashAsset) ?? (exchange ? { asset: cashAsset, available: 0, free: 0 } : undefined)

  useEffect(() => setPickedPrice(null), [symbol])

  const setParam = (k, v) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    if (k === 'symbol') next.delete('side')
    setParams(next, { replace: true })
  }

  const lines = useMemo(() => {
    const l = []
    if (position) {
      l.push({ price: position.entryPrice, color: '#8c62ff', title: tr('Giriş {0}', position.side === 'long' ? 'L' : 'S'), style: 0 })
      if (position.stopLoss) l.push({ price: position.stopLoss, color: '#f6465d', title: 'SL' })
      if (position.takeProfit) l.push({ price: position.takeProfit, color: '#1bd084', title: 'TP' })
    }
    openOrders
      .filter((o) => o.symbol === symbol && o.exchangeId === exchange?.id)
      .forEach((o) => {
        const c = o.side === 'buy' ? '#48a9f8' : '#ff9b52'
        if (o.price) l.push({ price: o.price, color: c, title: `${o.side === 'buy' ? tr('Alış') : tr('Satış')} ${o.type === 'oco' ? 'TP' : ''}`.trim() })
        if (o.stopPrice) l.push({ price: o.stopPrice, color: c, title: tr('Stop') })
      })
    return l
  }, [position, openOrders, symbol, exchange?.id])

  const filt = (list) => (onlyThis ? list.filter((x) => x.symbol === symbol) : list)
  const fav = watchlist.includes(symbol)
  const precision = ins ? Math.min(decimalsOf(ins.tickSize), 8) : 2

  if (lk.instruments.length && !ins) {
    return <Card><div className="text-center py-5">{tr('Sembol bulunamadı:')} {symbol}</div></Card>
  }

  return (
    <>
      {/* Üst bilgi şeridi */}
      <div className="hn-card trade-head">
        <div className="d-flex align-items-center gap-2">
          <SymbolPicker value={symbol} instruments={lk.instruments} onChange={(s) => setParam('symbol', s)} />
          <button className={`btn btn-sm p-1 border-0 ${fav ? 'text-warning' : 'text-muted'}`} onClick={() => toggleWatch(symbol)} aria-label={tr('Favori')}><FiStar fill={fav ? 'currentColor' : 'none'} /></button>
          {ins && <MarketBadge market={ins.market} />}
        </div>
        <div className="trade-stats">
          <div>
            <FlashNumber value={t?.last} className={`fs-4 fw-bold num ${pnlClass(t?.changePct)}`}>{t ? fmtNum(t.last) : '–'}</FlashNumber>
            <div className="fs-12 text-muted">{ins?.name}</div>
          </div>
          <div><small>{tr('24s Değişim')}</small><span className={`num ${pnlClass(t?.changePct)}`}>{t ? `${fmtNum(t.change)} (${fmtPct(t.changePct)})` : '–'}</span></div>
          <div><small>{tr('24s Yüksek')}</small><span className="num">{fmtNum(t?.high)}</span></div>
          <div><small>{tr('24s Düşük')}</small><span className="num">{fmtNum(t?.low)}</span></div>
          <div className="d-none d-md-flex"><small>{tr('Hacim')}</small><span className="num">{fmtCompact(t?.volume)}</span></div>
        </div>
        <div className="ms-xl-auto">
          <Dropdown
            caret={false}
            toggleClass="exchange-picker"
            toggle={
              exchange ? (
                <><ExchangeLogo provider={provider} size={28} /><span className="text-start"><small className="d-block text-muted lh-1">{tr('Hesap')}</small><span className="fw-semibold">{exchange.label}</span></span><FiChevronDown /></>
              ) : (
                <span className="text-down">{tr('Bağlı hesap yok')}</span>
              )
            }
          >
            {accounts.map((e) => (
              <button key={e.id} className={`dropdown-item d-flex align-items-center gap-2 ${e.id === exchange?.id ? 'active' : ''}`} data-close onClick={() => setParam('ex', e.id)}>
                <ExchangeLogo provider={lk.provider[e.provider]} size={24} />
                <span className="flex-grow-1">{e.label}</span>
                <StatusBadge status={e.status === 'connected' && e.paused ? 'paused' : e.status} />
              </button>
            ))}
            {!accounts.length && <div className="dropdown-item-text text-muted">{tr('Bu piyasa için hesap yok')}</div>}
          </Dropdown>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xxl-6 col-xl-8">
          <div className="hn-card mb-0 h-100">
            <div className="d-flex justify-content-between align-items-center px-3 pt-3 flex-wrap gap-2">
              <Segmented options={INTERVALS.map((i) => ({ value: i, label: INTERVAL_TR[i] }))} value={interval} onChange={setChartInterval} />
              <div className="fs-12 text-muted d-flex gap-3">
                <span><span className="legend-line" style={{ background: '#8c62ff' }} /> {tr('Giriş')}</span>
                <span><span className="legend-line" style={{ background: '#f6465d' }} /> SL</span>
                <span><span className="legend-line" style={{ background: '#1bd084' }} /> TP</span>
                <span><span className="legend-line" style={{ background: '#48a9f8' }} /> {tr('Emir')}</span>
              </div>
            </div>
            <div className="p-2">
              {ins && <PriceChart symbol={symbol} interval={interval} lines={lines} precision={precision} height={typeof window !== 'undefined' && window.innerWidth < 768 ? 360 : 540} />}
            </div>
          </div>
        </div>

        <div className="col-xxl-6 col-xl-4">
          <div className="row g-4 h-100">
            <div className="col-xxl-6 col-md-6 col-xl-12 order-2 order-md-1 order-xl-2 order-xxl-1">
              <div className="hn-card mb-0 h-100">
                <div className="px-3 pt-3">
                  <Segmented options={[{ value: 'book', label: tr('Emir Defteri') }, { value: 'trades', label: tr('İşlemler') }]} value={bookTab} onChange={setBookTab} className="w-100" />
                </div>
                <div className="p-2">{bookTab === 'book' ? <OrderBook symbol={symbol} onPick={setPickedPrice} /> : <RecentTrades symbol={symbol} />}</div>
              </div>
            </div>
            <div className="col-xxl-6 col-md-6 col-xl-12 order-1 order-md-2 order-xl-1 order-xxl-2">
              <div className="hn-card mb-0 h-100 p-3">
                <OrderForm instrument={ins} exchange={exchange} provider={provider} position={position} cash={cash} initialSide={params.get('side') || 'buy'} presetPrice={pickedPrice} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card
        title={
          <Segmented
            options={[
              { value: 'positions', label: tr('Pozisyonlar ({0})', filt(positions).length) },
              { value: 'open', label: tr('Açık Emirler ({0})', filt(openOrders).length) },
              { value: 'history', label: tr('Emir Geçmişi') },
            ]}
            value={bottomTab}
            onChange={setBottomTab}
          />
        }
        actions={
          <div className="d-flex align-items-center gap-3">
            <Switch checked={onlyThis} onChange={setOnlyThis} label={tr('Sadece bu sembol')} />
            {bottomTab === 'open' && filt(openOrders).length > 0 && (
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={async () => {
                  const ok = await confirm({ title: tr('Tüm açık emirleri iptal et'), message: onlyThis ? tr('{0} için tüm açık emirler iptal edilecek.', symbol) : tr('Tüm hesaplardaki açık emirler iptal edilecek.'), confirmText: tr('Hepsini İptal Et'), variant: 'danger' })
                  if (ok) cancelAll.mutate(onlyThis ? { symbol } : {})
                }}
              >
                {tr('Tümünü iptal et')}
              </button>
            )}
          </div>
        }
        bodyClass="px-0 pb-2"
      >
        {bottomTab === 'positions' && <PositionsTable positions={filt(positions)} />}
        {bottomTab === 'open' && <OrdersTable orders={filt(openOrders)} />}
        {bottomTab === 'history' && <OrdersTable orders={filt(history).slice(0, 50)} history />}
      </Card>
    </>
  )
}
