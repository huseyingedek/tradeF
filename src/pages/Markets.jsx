import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiSearch, FiStar, FiChevronUp, FiChevronDown } from 'react-icons/fi'
import Card from '../components/Card'
import Segmented from '../components/Segmented'
import Sparkline from '../components/Sparkline'
import { MarketBadge } from '../components/Badges'
import { FlashNumber } from '../components/Live'
import { useApp } from '../context/AppContext'
import { useLookups } from '../api/queries'
import { tickerStore, useTickers } from '../hooks/useMarket'
import { fmtCompact, fmtNum, fmtPct, pnlClass } from '../utils/format'
import { t as tr, locale } from '../i18n'

const TABS = [
  { value: 'all', label: tr('Tümü') },
  { value: 'fav', label: tr('★ Favoriler') },
  { value: 'crypto', label: tr('Kripto') },
  { value: 'bist', label: 'BIST' },
  { value: 'forex', label: tr('Forex & Emtia') },
]
const COLS = [
  { key: 'symbol', label: tr('Sembol') },
  { key: 'last', label: tr('Son Fiyat'), num: true },
  { key: 'changePct', label: tr('24s Değişim'), num: true },
  { key: 'high', label: tr('24s Yüksek'), num: true, hide: 'lg' },
  { key: 'low', label: tr('24s Düşük'), num: true, hide: 'lg' },
  { key: 'volume', label: tr('Hacim'), num: true, hide: 'md' },
]

export default function Markets() {
  const tickers = useTickers()
  const lk = useLookups()
  const { watchlist, toggleWatch } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ key: 'volume', dir: 'desc' })
  // Yüzlerce sembol var: önce ilk 50 (hacme göre), "daha fazla" ile genişler. Arama tüm listede yapılır.
  const PAGE = 50
  const [limit, setLimit] = useState(PAGE)

  // Hangi bağlı hesaplar hangi piyasayı destekliyor
  const marketAccounts = useMemo(() => {
    const m = {}
    lk.exchanges.forEach((e) => (m[e.market] = [...(m[e.market] || []), e]))
    return m
  }, [lk.exchanges])

  const rows = useMemo(() => {
    const term = q.trim().toUpperCase() // semboller ASCII
    const termName = q.trim().toLocaleUpperCase(locale)
    const list = tickers
      .map((t) => ({ ...t, ins: lk.instrument[t.symbol] }))
      .filter((t) => t.ins)
      .filter((t) => (tab === 'all' ? true : tab === 'fav' ? watchlist.includes(t.symbol) : t.ins.market === tab))
      .filter((t) => !term || t.symbol.includes(term) || t.ins.base.includes(term) || t.ins.name.toLocaleUpperCase(locale).includes(termName))
    const { key, dir } = sort
    return list.sort((a, b) => {
      const v = key === 'symbol' ? a.symbol.localeCompare(b.symbol) : a[key] - b[key]
      return dir === 'asc' ? v : -v
    })
  }, [tickers, lk.instrument, tab, q, sort, watchlist])

  const movers = useMemo(() => {
    const s = [...tickers].sort((a, b) => b.changePct - a.changePct)
    return { up: s.slice(0, 3), down: s.slice(-3).reverse() }
  }, [tickers])

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))

  return (
    <>
      <div className="row">
        {[...movers.up, ...movers.down].map((t) => (
          <div className="col-xl-2 col-md-4 col-6" key={t.symbol}>
            <button className="hn-card mover-card w-100 text-start" onClick={() => navigate(`/trade?symbol=${encodeURIComponent(t.symbol)}`)}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-semibold">{t.symbol}</span>
                <span className={`fs-13 fw-semibold ${pnlClass(t.changePct)}`}>{fmtPct(t.changePct)}</span>
              </div>
              <div className="num fs-5 fw-bold my-1">{fmtNum(t.last)}</div>
              <Sparkline data={tickerStore.history(t.symbol)} width={160} height={28} />
            </button>
          </div>
        ))}
      </div>

      <Card
        title={<Segmented options={TABS} value={tab} onChange={(v) => { setTab(v); setLimit(PAGE) }} />}
        actions={
          <div className="position-relative">
            <input className="form-control pe-5" placeholder={tr('Ara ({0} sembol) – örn. PEPE, SOL', tickers.length)} value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} style={{ minWidth: 240 }} />
            <FiSearch className="position-absolute text-muted" style={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        }
        bodyClass="px-0 pb-2"
      >
        <div className="table-responsive">
          <table className="table table-hover table-trading">
            <thead>
              <tr>
                <th className="ps-4" style={{ width: 40 }} />
                {COLS.map((c) => (
                  <th key={c.key} className={`sort-th ${c.num ? 'text-end' : ''} ${c.hide ? `d-none d-${c.hide}-table-cell` : ''}`} onClick={() => toggleSort(c.key)}>
                    {c.label} {sort.key === c.key && (sort.dir === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                  </th>
                ))}
                <th className="d-none d-xl-table-cell text-center">{tr('Son 1 dk')}</th>
                <th className="d-none d-md-table-cell">{tr('Hesaplar')}</th>
                <th className="pe-4 text-end">{tr('İşlem')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t) => {
                const fav = watchlist.includes(t.symbol)
                const accounts = marketAccounts[t.ins.market] || []
                return (
                  <tr key={t.symbol}>
                    <td className="ps-4">
                      <button className={`btn btn-sm p-0 border-0 ${fav ? 'text-warning' : 'text-muted'}`} onClick={() => toggleWatch(t.symbol)} aria-label={tr('Favori')}>
                        <FiStar fill={fav ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td>
                      <div className="fw-semibold">{t.symbol}{t.source === 'sim' && <span className="chip gray ms-2" style={{ fontSize: 10, padding: "1px 6px" }} title={tr('Gerçek zamanlı veri kaynağı yok – simüle edilmiş fiyat')}>{tr('SİM')}</span>}{t.source === 'stale' && <span className="chip yellow ms-2" style={{ fontSize: 10, padding: "1px 6px" }} title={tr('Veri kaynağına geçici olarak ulaşılamıyor – son gerçek fiyat gösteriliyor')}>{tr('GECİKMELİ')}</span>}</div>
                      <div className="fs-12 text-muted d-flex gap-2 align-items-center">{t.ins.name} <span className="d-none d-sm-inline"><MarketBadge market={t.ins.market} /></span></div>
                    </td>
                    <td className="text-end num fw-semibold"><FlashNumber value={t.last}>{fmtNum(t.last)}</FlashNumber></td>
                    <td className={`text-end num fw-semibold ${pnlClass(t.changePct)}`}>{fmtPct(t.changePct)}</td>
                    <td className="text-end num d-none d-lg-table-cell">{fmtNum(t.high)}</td>
                    <td className="text-end num d-none d-lg-table-cell">{fmtNum(t.low)}</td>
                    <td className="text-end num d-none d-md-table-cell">{fmtCompact(t.volume)}</td>
                    <td className="d-none d-xl-table-cell"><div className="d-flex justify-content-center"><Sparkline data={tickerStore.history(t.symbol)} width={100} height={28} /></div></td>
                    <td className="d-none d-md-table-cell fs-13 text-muted">{accounts.length ? tr('{0} hesap', accounts.length) : <span className="text-down">{tr('Bağlı hesap yok')}</span>}</td>
                    <td className="pe-4 text-end text-nowrap">
                      <button className="btn btn-sm btn-success me-1" onClick={() => navigate(`/trade?symbol=${encodeURIComponent(t.symbol)}&side=buy`)}>{tr('Al')}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => navigate(`/trade?symbol=${encodeURIComponent(t.symbol)}&side=sell`)}>{tr('Sat')}</button>
                    </td>
                  </tr>
                )
              })}
              {!rows.length && (
                <tr><td colSpan={10} className="text-center text-muted py-5">{tab === 'fav' ? tr('Favori listeniz boş – yıldıza tıklayarak ekleyin.') : tr('Sonuç bulunamadı.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div className="text-center py-2">
            <button className="btn btn-soft btn-sm" onClick={() => setLimit((l) => l + PAGE * 2)}>
              {tr('Daha fazla göster (')}{rows.length - limit} {tr('sembol daha)')}
            </button>
          </div>
        )}
        {!rows.length && q && <div className="text-center text-muted py-4">"{q}{tr('" bulunamadı. Kripto paralar Binance\'te USDT ile işlem gören tüm pariteleri kapsar.')}</div>}
      </Card>
    </>
  )
}
