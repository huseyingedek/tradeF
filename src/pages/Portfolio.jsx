import { useMemo, useState } from 'react'
import Card from '../components/Card'
import Chart from '../components/Chart'
import Segmented from '../components/Segmented'
import { ExchangeLogo, ExchangeTag, MarketBadge, StatusBadge } from '../components/Badges'
import PositionsTable from '../components/trading/PositionsTable'
import { useBalances, useLookups, usePortfolioSummary, usePositions } from '../api/queries'
import { tickerStore, useTickerVersion } from '../hooks/useMarket'
import { fmtMoney, fmtPct, fmtSignedMoney, pnlClass } from '../utils/format'
import { positionLive } from '../utils/trading'
import { t } from '../i18n'

const COLORS = ['#8c62ff', '#ff9b52', '#48a9f8', '#1bd084', '#f72b50', '#ffb800', '#20c3b2', '#8bc740', '#6c5ce7', '#e84393']

export default function Portfolio() {
  useTickerVersion()
  const lk = useLookups()
  const { data: positions = [] } = usePositions()
  const { data: balances = [] } = useBalances()
  // gerçek ve sanal para ayrı özetlenir; hesap filtresi: 'live' | 'paper' | hesap id
  const { data: auto } = usePortfolioSummary()
  const { data: sLive } = usePortfolioSummary('live')
  const { data: sPaper } = usePortfolioSummary('paper')
  const [tab, setTab] = useState('positions')
  const [exFilter, setExFilter] = useState(null)
  const filter = exFilter ?? auto?.mode ?? 'paper'
  const modeOf = (exchangeId) => (lk.exchange[exchangeId]?.mode === 'live' ? 'live' : 'paper')
  const match = (exchangeId) => (filter === 'live' || filter === 'paper' ? modeOf(exchangeId) === filter : exchangeId === filter)

  const exValue = useMemo(() => Object.fromEntries([...(sLive?.byExchange || []), ...(sPaper?.byExchange || [])].map((e) => [e.exchangeId, e.value])), [sLive, sPaper])
  const filteredPositions = positions.filter((p) => match(p.exchangeId))
  const filteredBalances = balances.filter((b) => match(b.exchangeId))

  // Varlık bazında dağılım (USD)
  const usdRate = tickerStore.get('USD/TRY')?.last || 1
  const toUsd = (v, ccy) => (ccy === 'TRY' ? v / usdRate : v)
  const byAsset = {}
  let unrealized = 0
  filteredPositions.forEach((p) => {
    const ins = lk.instrument[p.symbol]
    const live = positionLive(p, tickerStore.get(p.symbol))
    byAsset[ins?.base || p.symbol] = (byAsset[ins?.base || p.symbol] || 0) + toUsd(live.value, ins?.quote)
    unrealized += toUsd(live.pnl, ins?.quote)
  })
  filteredBalances.forEach((b) => (byAsset[b.asset] = (byAsset[b.asset] || 0) + b.valueUsd))
  const assets = Object.entries(byAsset).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])
  const total = assets.reduce((a, [, v]) => a + v, 0)

  return (
    <>
      <div className="exchange-strip mb-4">
        {auto?.hasLive && (
          <button className={`ex-chip ${filter === 'live' ? 'active' : ''}`} onClick={() => setExFilter('live')}>
            <span className="fw-semibold">{t('Gerçek hesaplar')}</span>
            <span className="num">{fmtMoney(sLive?.totalValue, 'USD', 0)}</span>
          </button>
        )}
        {(auto?.hasPaper || !auto?.hasLive) && (
          <button className={`ex-chip ${filter === 'paper' ? 'active' : ''}`} onClick={() => setExFilter('paper')}>
            <span className="fw-semibold">{t('Sanal hesaplar')}</span>
            <span className="num">{fmtMoney(sPaper?.totalValue, 'USD', 0)}</span>
          </button>
        )}
        {lk.exchanges.map((e) => (
          <button key={e.id} className={`ex-chip ${filter === e.id ? 'active' : ''}`} onClick={() => setExFilter(e.id)}>
            <span className="d-flex align-items-center gap-2"><ExchangeLogo provider={lk.provider[e.provider]} size={22} /><span className="fw-semibold text-truncate">{e.label}</span><span className={`chip ${e.mode === 'live' ? 'green' : 'gray'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{e.mode === 'live' ? t('Gerçek') : t('Sanal')}</span></span>
            <span className="d-flex align-items-center justify-content-between gap-2">
              <span className="num">{fmtMoney(exValue[e.id] || 0, 'USD', 0)}</span>
              {e.status !== 'connected' || e.paused ? <StatusBadge status={e.paused ? 'paused' : e.status} /> : null}
            </span>
          </button>
        ))}
      </div>

      <div className="row">
        <div className="col-12">
          <Card
            title={<Segmented options={[{ value: 'positions', label: t('Pozisyonlar ({0})', filteredPositions.length) }, { value: 'balances', label: t('Nakit Bakiyeler ({0})', filteredBalances.length) }]} value={tab} onChange={setTab} />}
            actions={tab === 'positions' && <span className={`fw-semibold ${pnlClass(unrealized)}`}>{t('Gerçekleşmemiş K/Z:')} {fmtSignedMoney(unrealized)}</span>}
            bodyClass="px-0 pb-2"
          >
            {tab === 'positions' ? (
              <PositionsTable positions={filteredPositions} emptyText={t('İşlem Terminali\'nden ilk emrinizi verebilirsiniz.')} />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-trading">
                  <thead>
                    <tr>
                      <th className="ps-4">{t('Hesap')}</th>
                      <th>{t('Varlık')}</th>
                      <th className="text-end">{t('Toplam')}</th>
                      <th className="text-end">{t('Emirlerde')}</th>
                      <th className="text-end">{t('Kullanılabilir')}</th>
                      <th className="pe-4 text-end">{t('USD Karşılığı')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map((b) => (
                      <tr key={b.exchangeId + b.asset}>
                        <td className="ps-4"><ExchangeTag exchange={lk.exchange[b.exchangeId]} /></td>
                        <td className="fw-semibold">{b.asset} {lk.exchange[b.exchangeId] && <MarketBadge market={lk.exchange[b.exchangeId].market} />}</td>
                        <td className="text-end num">{fmtMoney(b.total, b.asset)}</td>
                        <td className="text-end num text-muted">{fmtMoney(b.locked, b.asset)}</td>
                        <td className="text-end num fw-semibold">{fmtMoney(b.available, b.asset)}</td>
                        <td className="pe-4 text-end num">{fmtMoney(b.valueUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="col-12">
          <Card title={t('Varlık Bazında Dağılım')}>
            <div className="row align-items-center">
            <div className="col-lg-5">
            <Chart
              type="donut"
              height={280}
              series={assets.map(([, v]) => Math.round(v))}
              options={{
                labels: assets.map(([k]) => k),
                colors: COLORS,
                legend: { show: false },
                stroke: { width: 0 },
                dataLabels: { enabled: false },
                plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: t('Toplam'), formatter: () => fmtMoney(total, 'USD', 0) } } } } },
                tooltip: { y: { formatter: (v) => fmtMoney(v, 'USD', 0) } },
              }}
            />
            </div>
            <div className="col-lg-7">
              {assets.map(([k, v], i) => (
                <div key={k} className="d-flex align-items-center gap-2 py-1">
                  <span className="rounded-circle" style={{ width: 10, height: 10, background: COLORS[i % COLORS.length] }} />
                  <span className="flex-grow-1">{k}</span>
                  <span className="num">{fmtMoney(v, 'USD', 0)}</span>
                  <span className="text-muted num fs-13" style={{ width: 56, textAlign: 'right' }}>{fmtPct((v / total) * 100, 1, false)}</span>
                </div>
              ))}
            </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
