import { Link } from 'react-router-dom'
import { FiUsers, FiActivity, FiDollarSign, FiLink, FiAlertTriangle, FiArrowRight } from 'react-icons/fi'
import Card from '../../components/Card'
import Chart from '../../components/Chart'
import StatCard from '../../components/StatCard'
import Sparkline from '../../components/Sparkline'
import { ExchangeLogo } from '../../components/Badges'
import { HealthBadge, UserStatusBadge, ACTION_LABEL, actionTone } from '../../components/admin/AdminBadges'
import { useAdminOverview } from '../../api/adminQueries'
import { fmtCompact, fmtMoney, fmtNum, fmtPct, timeAgo } from '../../utils/format'

const PLAN_COLORS = { free: '#8a879a', starter: '#48a9f8', pro: '#8c62ff', expert: '#ff9b52' }

export default function Overview() {
  const { data: d, isLoading } = useAdminOverview()
  if (isLoading || !d) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
  const k = d.kpis

  return (
    <>
      {d.platform.killSwitch.active && (
        <div className="kill-banner">
          <FiAlertTriangle /> <span><strong>Platform genelinde işlemler durduruldu.</strong> {d.platform.killSwitch.reason} · {d.platform.killSwitch.by}</span>
          <Link to="/admin/risk" className="ms-auto fw-semibold">Platform Riski →</Link>
        </div>
      )}

      <div className="row">
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="purple" icon={FiUsers} label="Toplam Kullanıcı" value={fmtNum(k.totalUsers, 0)} sub={`+${k.newUsers7d} bu hafta${k.newUsers7dChangePct != null ? ` (${fmtPct(k.newUsers7dChangePct, 0)})` : ''}`} />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="sky" icon={FiActivity} label="Aktif (24 saat)" value={fmtNum(k.activeUsers24h, 0)} sub={`${fmtNum((k.activeUsers24h / k.totalUsers) * 100, 1)}% kullanıcı`} />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="green" icon={FiDollarSign} label="Aylık Yinelenen Gelir" value={fmtMoney(k.mrr, 'TRY', 0)} sub={`${k.paidUsers} ödeme yapan · dönüşüm %${fmtNum(k.conversionPct, 1)}${k.compUsers ? ` · ${k.compUsers} ücretsiz tanımlı` : ''}`} />
        </div>
        <div className="col-xl-3 col-sm-6">
          <StatCard variant="lime" icon={FiLink} label="Bağlı Borsa Hesabı" value={fmtNum(k.connectedAccounts, 0)} sub={k.liveAccounts != null ? `${k.liveAccounts} canlı · ${k.paperAccounts} sanal — gerçek varlık ${fmtCompact(k.aumLiveUsd)} $ · sanal ${fmtCompact(k.aumPaperUsd)} $` : `Yönetilen varlık ${fmtCompact(k.aumUsd)} $`} />
        </div>
      </div>

      <div className="row">
        <div className="col-xl-8">
          <Card title="Kullanıcı Büyümesi (90 gün)" actions={<span className="text-muted fs-13">Son 14 günde {d.signups.reduce((a, [, v]) => a + v, 0)} kayıt</span>}>
            <Chart
              type="area"
              height={280}
              series={[{ name: 'Kullanıcı', data: d.growth.map(([x, y]) => ({ x, y })) }]}
              options={{
                colors: ['#8c62ff'],
                stroke: { curve: 'smooth', width: 2.5 },
                fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
                dataLabels: { enabled: false },
                xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
                tooltip: { x: { format: 'dd MMM yyyy' } },
              }}
            />
          </Card>
        </div>
        <div className="col-xl-4">
          <Card title="Plan Dağılımı">
            <Chart
              type="donut"
              height={280}
              series={d.planDistribution.map((p) => p.count)}
              options={{
                labels: d.planDistribution.map((p) => p.name),
                colors: d.planDistribution.map((p) => PLAN_COLORS[p.plan] || '#20c3b2'),
                legend: { position: 'bottom' },
                stroke: { width: 0 },
                dataLabels: { enabled: false },
                plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Kullanıcı' } } } } },
              }}
            />
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-8">
          <Card title="Platform İşlem Hacmi (30 gün, USD)" actions={<span className="fw-semibold num">Son 24s: {fmtCompact(k.volume24hUsd)} $</span>}>
            <Chart
              type="bar"
              height={280}
              series={[
                { name: 'Kripto', data: d.volume.map((v) => ({ x: v.t, y: v.crypto })) },
                { name: 'BIST', data: d.volume.map((v) => ({ x: v.t, y: v.bist })) },
                { name: 'Forex', data: d.volume.map((v) => ({ x: v.t, y: v.forex })) },
              ]}
              options={{
                chart: { stacked: true },
                colors: ['#ff9b52', '#f72b50', '#48a9f8'],
                plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
                dataLabels: { enabled: false },
                xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
                yaxis: { labels: { formatter: (v) => fmtCompact(v) } },
                legend: { position: 'top', horizontalAlign: 'right' },
                tooltip: { y: { formatter: (v) => `${fmtCompact(v)} $` } },
              }}
            />
          </Card>
        </div>
        <div className="col-xl-4">
          <Card title="Operasyon">
            <div className="row g-3">
              <div className="col-6"><div className="mini-stat"><small>Çalışan bot</small><span className="num">{fmtNum(k.runningBots, 0)}</span></div></div>
              <div className="col-6"><div className="mini-stat"><small>Aktif kural</small><span className="num">{fmtNum(k.activeRules, 0)}</span></div></div>
              <div className="col-6"><div className="mini-stat"><small>API hata oranı</small><span className={`num ${k.errorRatePct > 1.5 ? 'text-down' : 'text-up'}`}>%{fmtNum(k.errorRatePct, 2)}</span></div></div>
              <div className="col-6"><div className="mini-stat"><small>Başarısız ödeme (30g)</small><span className={`num ${d.failedPayments ? 'text-down' : ''}`}>{d.failedPayments}</span></div></div>
            </div>
            <div className="mt-3 d-flex flex-wrap gap-2 fs-13">
              <span className={`chip ${d.platform.registrationOpen ? 'green' : 'red'}`}>Kayıt {d.platform.registrationOpen ? 'açık' : 'kapalı'}</span>
              <span className="chip gray">Maks. kaldıraç {d.platform.maxLeverage}x</span>
              <span className="chip gray">Maks. emir ${fmtCompact(d.platform.maxOrderUsd)}</span>
              {d.platform.blockedSymbols.length > 0 && <span className="chip red">{d.platform.blockedSymbols.length} yasaklı sembol</span>}
            </div>
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-5">
          <Card title="Entegrasyon Sağlığı" actions={<Link to="/admin/integrations" className="fw-500">Detay <FiArrowRight /></Link>}>
            {d.health.map((h) => (
              <div key={h.id} className="d-flex align-items-center gap-3 py-2 border-bottom-dashed">
                <ExchangeLogo provider={h} size={30} />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold">{h.name}</div>
                  <div className="fs-12 text-muted">{h.accounts} hesap · p50 {h.latencyP50 ?? '–'} ms · hata %{h.errorRatePct}</div>
                </div>
                <Sparkline data={h.latencyHistory} width={70} height={22} fill={false} color={h.status === 'operational' ? 'var(--hn-up)' : h.status === 'degraded' ? '#ffb800' : 'var(--hn-down)'} />
                <HealthBadge status={h.status} />
              </div>
            ))}
          </Card>
        </div>
        <div className="col-xl-3 col-lg-6">
          <Card title="Güvenlik Uyarıları" actions={<Link to="/admin/users?flagged=true" className="fw-500">Tümü</Link>}>
            {!d.alerts.length && <p className="text-muted mb-0">Açık uyarı yok.</p>}
            {d.alerts.map((a) => (
              <Link key={a.userId} to={`/admin/users/${a.userId}`} className="alert-row">
                <FiAlertTriangle className="text-warning flex-shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="fw-semibold text-body d-flex gap-2 align-items-center flex-wrap">{a.userName} <UserStatusBadge status={a.status} /></div>
                  <div className="fs-12 text-muted">{a.flags.join(' · ')}</div>
                </div>
              </Link>
            ))}
          </Card>
        </div>
        <div className="col-xl-4 col-lg-6">
          <Card title="Son Admin İşlemleri" actions={<Link to="/admin/audit" className="fw-500">Günlük</Link>}>
            {d.recentAudit.map((a) => (
              <div key={a.id} className="activity-item">
                <span className={`status-dot mt-2 ${actionTone(a.action)}`} />
                <div className="min-w-0">
                  <p className="fs-13"><strong>{a.actor}</strong> · {ACTION_LABEL[a.action] || a.action} · {a.target}</p>
                  <small className="text-muted">{a.details} · {timeAgo(a.ts)}</small>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}
