import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiDollarSign, FiTrendingUp, FiLayers, FiCpu, FiArrowRight, FiPlay, FiPause } from 'react-icons/fi'
import Card from '../components/Card'
import Chart from '../components/Chart'
import StatCard from '../components/StatCard'
import Segmented from '../components/Segmented'
import Sparkline from '../components/Sparkline'
import { ExchangeLogo, StatusBadge } from '../components/Badges'
import { LivePrice, LiveChange } from '../components/Live'
import PositionsTable from '../components/trading/PositionsTable'
import { useApp } from '../context/AppContext'
import { useActivity, useBots, useLookups, usePortfolioHistory, usePortfolioSummary, usePositions, useRisk, useRules } from '../api/queries'
import { tickerStore, useTickerVersion } from '../hooks/useMarket'
import { fmtMoney, fmtPct, fmtSignedMoney, pnlClass, timeAgo } from '../utils/format'
import { usePortfolioMode, MODE_LABEL } from '../hooks/usePortfolioMode'
import { t, tServer } from '../i18n'

const RANGES = ['1D', '1W', '1M', '3M', '1Y']
const RANGE_TR = { '1D': t('1G'), '1W': t('1H'), '1M': t('1A'), '3M': t('3A'), '1Y': t('1Y') }

function PortfolioChart({ mode }) {
  const [range, setRange] = useState('1M')
  const { data } = usePortfolioHistory(range, mode)
  const { data: summary } = usePortfolioSummary(mode)
  const points = data?.points || []
  const first = points[0]?.[1]
  const last = summary?.totalValue ?? points[points.length - 1]?.[1]
  const change = first ? ((last - first) / first) * 100 : 0
  const up = change >= 0
  return (
    <Card
      title={
        <div>
          <h4>{t('Portföy Değeri')} {mode && <span className={`chip ${mode === 'live' ? 'green' : 'gray'} ms-1`} style={{ fontSize: 11 }}>{MODE_LABEL[mode]}</span>}</h4>
          <div className="d-flex align-items-baseline gap-2 mt-2 flex-wrap">
            <span className="fs-3 fw-bold num">{fmtMoney(last)}</span>
            <span className={`fw-semibold ${pnlClass(change)}`}>{fmtPct(change)}</span>
            <span className="text-muted fs-13">({RANGE_TR[range]})</span>
          </div>
        </div>
      }
      actions={<Segmented options={RANGES.map((r) => ({ value: r, label: RANGE_TR[r] }))} value={range} onChange={setRange} />}
    >
      <Chart
        type="area"
        height={290}
        series={[{ name: t('Portföy'), data: points.map(([x, y]) => ({ x, y: Math.round(y * 100) / 100 })) }]}
        options={{
          colors: [up ? '#1bd084' : '#f6465d'],
          stroke: { curve: 'smooth', width: 2.5 },
          fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
          dataLabels: { enabled: false },
          xaxis: { type: 'datetime', labels: { datetimeUTC: false }, axisBorder: { show: false }, axisTicks: { show: false } },
          yaxis: { labels: { formatter: (v) => fmtMoney(v, 'USD', 0) } },
          tooltip: { x: { format: range === '1D' ? 'HH:mm' : t('dd MMM yyyy HH:mm') }, y: { formatter: (v) => fmtMoney(v) } },
        }}
      />
    </Card>
  )
}

function Allocation({ mode }) {
  const { data: s } = usePortfolioSummary(mode)
  const items = (s?.allocation || []).filter((a) => a.value > 0.5)
  return (
    <Card title={t('Varlık Dağılımı')}>
      <Chart
        type="donut"
        height={290}
        series={items.map((a) => Math.round(a.value))}
        options={{
          labels: items.map((a) => tServer(a.label)),
          colors: items.map((a) => ({ crypto: '#ff9b52', bist: '#f72b50', forex: '#48a9f8', cash: '#8c62ff' })[a.key]),
          legend: { position: 'bottom' },
          stroke: { width: 0 },
          dataLabels: { enabled: false },
          plotOptions: { pie: { donut: { size: '72%', labels: { show: true, total: { show: true, label: t('Toplam'), formatter: () => fmtMoney(s?.totalValue, 'USD', 0) } } } } },
          tooltip: { y: { formatter: (v) => fmtMoney(v, 'USD', 0) } },
        }}
      />
    </Card>
  )
}

function Watchlist() {
  const { watchlist } = useApp()
  const navigate = useNavigate()
  const lk = useLookups()
  useTickerVersion()
  return (
    <Card title={t('İzleme Listesi')} actions={<Link to="/markets" className="fw-500">{t('Tümü')} <FiArrowRight /></Link>} bodyClass="px-0 pt-2">
      {watchlist.map((s) => (
        <button key={s} className="watch-row" onClick={() => navigate(`/trade?symbol=${encodeURIComponent(s)}`)}>
          <div className="text-start" style={{ minWidth: 90 }}>
            <div className="fw-semibold">{s}</div>
            <div className="fs-12 text-muted text-truncate" style={{ maxWidth: 120 }}>{lk.instrument[s]?.name}</div>
          </div>
          <div className="flex-grow-1 d-none d-sm-flex justify-content-center">
            <Sparkline data={tickerStore.history(s)} width={110} height={30} />
          </div>
          <div className="text-end">
            <div className="fw-semibold"><LivePrice symbol={s} /></div>
            <div className="fs-12"><LiveChange symbol={s} /></div>
          </div>
        </button>
      ))}
    </Card>
  )
}

export default function Dashboard() {
  const { mode, both, setMode } = usePortfolioMode()
  const { data: s } = usePortfolioSummary(mode)
  const { data: allPositions = [] } = usePositions()
  const { data: bots = [] } = useBots()
  const { data: rules = [] } = useRules()
  const { data: risk } = useRisk()
  const { data: activity = [] } = useActivity({ limit: 30 })
  const lk = useLookups()
  // pozisyonlar da seçili türe göre (gerçek / sanal) – ikisi karışmaz
  const positions = allPositions.filter((p) => !mode || (lk.exchange[p.exchangeId]?.mode === 'live' ? 'live' : 'paper') === mode)

  const running = bots.filter((b) => b.status === 'running')
  const activeRules = rules.filter((r) => r.enabled).length
  // hesap kartı: her hesabın değeri kendi türünün özetinden
  const { data: sLive } = usePortfolioSummary(both ? 'live' : mode)
  const { data: sPaper } = usePortfolioSummary(both ? 'paper' : mode)
  const exValue = useMemo(() => Object.fromEntries([...(sLive?.byExchange || []), ...(sPaper?.byExchange || [])].map((e) => [e.exchangeId, e.value])), [sLive, sPaper])

  return (
    <>
      {both && (
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <Segmented options={[{ value: 'live', label: t('Gerçek hesaplar') }, { value: 'paper', label: t('Sanal hesaplar') }]} value={mode} onChange={setMode} />
          <small className="text-muted">{t('Gerçek para ile sanal (deneme) para ayrı gösterilir, hiçbir hesapta toplanmaz.')}</small>
        </div>
      )}
      <div className="row">
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="purple" icon={FiDollarSign} label={mode ? t('Toplam Varlık · {0}', MODE_LABEL[mode]) : t('Toplam Varlık')} value={fmtMoney(s?.totalValue, 'USD', 0)} sub={t('Nakit {0}', fmtMoney(s?.cashValue, 'USD', 0))} />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard
            variant={(s?.dayPnl ?? 0) >= 0 ? 'green' : 'red'}
            icon={FiTrendingUp}
            label={t('Bugünkü K/Z')}
            value={fmtSignedMoney(s?.dayPnl, 'USD')}
            sub={fmtPct(s?.dayPnlPct)}
          />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="sky" icon={FiLayers} label={t('Açık Pozisyon')} value={positions.length} sub={t('K/Z {0}', fmtSignedMoney(s?.unrealizedPnl))} />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="lime" icon={FiCpu} label={t('Aktif Otomasyon')} value={running.length + activeRules} sub={t('{0} bot · {1} kural', running.length, activeRules)} />
        </div>
      </div>

      <div className="row">
        <div className="col-xl-8"><PortfolioChart mode={mode} /></div>
        <div className="col-xl-4"><Allocation mode={mode} /></div>
      </div>

      <div className="row">
        <div className="col-xl-4 col-lg-5"><Watchlist /></div>
        <div className="col-xl-8 col-lg-7">
          <Card title={t('Açık Pozisyonlar')} actions={<Link to="/portfolio" className="fw-500">{t('Yönet')} <FiArrowRight /></Link>} bodyClass="px-0 pb-2">
            <PositionsTable positions={positions.slice(0, 7)} compact />
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-4 col-lg-6">
          <Card title={t('Borsa Hesapları')} actions={<Link to="/exchanges" className="fw-500">{t('Yönet')}</Link>}>
            {lk.exchanges.map((e) => (
              <div key={e.id} className="d-flex align-items-center gap-3 py-2 border-bottom-dashed">
                <ExchangeLogo provider={lk.provider[e.provider]} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{e.label} <span className={`chip ${e.mode === 'live' ? 'green' : 'gray'} ms-1`} style={{ fontSize: 10, padding: '1px 6px' }}>{e.mode === 'live' ? t('Gerçek') : t('Sanal')}</span></div>
                  <div className="fs-12 text-muted">{exValue[e.id] ? fmtMoney(exValue[e.id], 'USD', 0) : '–'}{e.latencyMs ? t(' · {0} ms', e.latencyMs) : ''}</div>
                </div>
                <StatusBadge status={e.status === 'connected' && e.paused ? 'paused' : e.status} />
              </div>
            ))}
          </Card>
        </div>
        <div className="col-xl-4 col-lg-6">
          <Card title={t('Çalışan Botlar')} actions={<Link to="/bots" className="fw-500">{t('Tümü')}</Link>}>
            {running.length === 0 && <p className="text-muted mb-0">{t('Çalışan bot yok.')}{risk?.killSwitch?.active && t(' (Acil durdurma aktif)')}</p>}
            {running.map((b) => (
              <div key={b.id} className="d-flex align-items-center gap-3 py-2 border-bottom-dashed">
                <span className="icon-box">{b.status === 'running' ? <FiPlay /> : <FiPause />}</span>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{b.name}</div>
                  <div className="fs-12 text-muted">{b.symbol} · {b.trades} {t('işlem')}</div>
                </div>
                <div className="text-end">
                  <div className={`fw-semibold num ${pnlClass(b.pnl)}`}>{fmtSignedMoney(b.pnl, lk.instrument[b.symbol]?.quote)}</div>
                  <Sparkline data={b.pnlHistory} width={70} height={18} fill={false} />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div className="col-xl-4">
          <Card title={t('Son Aktiviteler')} actions={<Link to="/activity" className="fw-500">{t('Günlük')}</Link>}>
            {activity.slice(0, 7).map((a) => (
              <div key={a.id} className="activity-item">
                <span className={`status-dot mt-2 ${{ danger: 'red', warning: 'yellow', success: 'green' }[a.level] || 'sky'}`} />
                <div className="min-w-0">
                  <p className="fs-13">{tServer(a.message)}</p>
                  <small className="text-muted">{timeAgo(a.ts)}</small>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}
