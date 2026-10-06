import Card from '../../components/Card'
import Chart from '../../components/Chart'
import Switch from '../../components/Switch'
import { ExchangeLogo, MarketBadge } from '../../components/Badges'
import { HealthBadge } from '../../components/admin/AdminBadges'
import { useCan, useProviderHealth, useUpdateProvider } from '../../api/adminQueries'
import { useApp } from '../../context/AppContext'
import { duration, fmtDateTime } from '../../utils/format'

export default function Integrations() {
  const { data } = useProviderHealth()
  const update = useUpdateProvider()
  const can = useCan()
  const { toast } = useApp()
  if (!data) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
  const list = data.providers
  const count = (s) => list.filter((p) => p.status === s).length
  const manage = can('integrations.manage')

  const toggle = (p, key, value, msg) => update.mutate({ id: p.id, [key]: value }, { onSuccess: () => toast(msg, value && key !== 'enabledForNew' ? 'warning' : 'success') })

  return (
    <>
      <div className="row">
        {[
          ['Çalışıyor', count('operational'), 'text-up'],
          ['Yavaşlama', count('degraded'), 'text-warning'],
          ['Kesinti', count('down'), 'text-down'],
          ['Bakımda', count('maintenance'), 'text-muted'],
        ].map(([l, v, c]) => (
          <div className="col-md-3 col-6" key={l}>
            <Card><div className="text-muted">{l}</div><div className={`fs-2 fw-bold ${c}`}>{v}</div></Card>
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {list.map((p) => (
          <div className="col-xxl-4 col-md-6" key={p.id}>
            <div className={`hn-card ex-card h-100 mb-0 ${p.status === 'down' ? 'has-error' : ''}`}>
              <div className="d-flex align-items-center gap-3">
                <ExchangeLogo provider={p} size={44} />
                <div className="flex-grow-1">
                  <div className="fw-semibold">{p.name}</div>
                  <div className="d-flex gap-1 mt-1"><MarketBadge market={p.market} />{p.tradingHalted && <span className="chip red">İşlem durduruldu</span>}</div>
                </div>
                <HealthBadge status={p.status} />
              </div>
              <div className="bot-stats mt-3">
                <div><small>p50 / p95</small><span className="num">{p.latencyP50 ?? '–'} / {p.latencyP95 ?? '–'} ms</span></div>
                <div><small>Hata oranı</small><span className={`num ${p.errorRatePct > 1.5 ? 'text-down' : ''}`}>%{p.errorRatePct}</span></div>
                <div><small>Erişilebilirlik</small><span className="num">{p.uptime30d == null ? '–' : `%${p.uptime30d}`}</span></div>
              </div>
              <Chart
                type="area"
                height={70}
                series={[{ name: 'Gecikme (ms)', data: p.latencyHistory?.length ? p.latencyHistory : [0] }]}
                options={{
                  chart: { sparkline: { enabled: true }, animations: { enabled: false } },
                  stroke: { curve: 'smooth', width: 2 },
                  colors: [p.status === 'operational' ? '#1bd084' : p.status === 'degraded' ? '#ffb800' : '#f6465d'],
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
                  tooltip: { y: { formatter: (v) => `${v} ms` } },
                }}
              />
              {p.rateLimitPct != null && (
                <>
              <div className="d-flex justify-content-between fs-13 mt-2 mb-1"><span className="text-muted">API limit kullanımı</span><span className="num">%{p.rateLimitPct}</span></div>
              <div className="progress mb-3"><div className="progress-bar" style={{ width: `${p.rateLimitPct}%`, background: p.rateLimitPct > 80 ? '#f6465d' : p.rateLimitPct > 60 ? '#ffb800' : '#8c62ff' }} /></div>
                </>
              )}
              <div className="fs-13 text-muted mb-3">{p.accounts} bağlı kullanıcı hesabı</div>
              <div className="d-flex flex-column gap-2 mt-auto">
                <Switch checked={p.enabledForNew} disabled={!manage} onChange={(v) => toggle(p, 'enabledForNew', v, `${p.name}: yeni bağlantılar ${v ? 'açıldı' : 'kapatıldı'}`)} label="Yeni bağlantılara açık" />
                <Switch checked={p.maintenance} disabled={!manage} onChange={(v) => toggle(p, 'maintenance', v, `${p.name}: bakım modu ${v ? 'açık' : 'kapalı'}`)} label="Bakım modu" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card title="Olaylar (Incident)" bodyClass="px-0 pb-2">
        <div className="table-responsive">
          <table className="table table-trading">
            <thead><tr><th className="ps-4">Olay</th><th>Platform</th><th>Başlangıç</th><th>Süre</th><th className="pe-4">Durum</th></tr></thead>
            <tbody>
              {data.incidents.map((i) => (
                <tr key={i.id}>
                  <td className="ps-4 fw-semibold">{i.title}</td>
                  <td>{list.find((p) => p.id === i.provider)?.name}</td>
                  <td className="text-muted">{fmtDateTime(i.startedAt)}</td>
                  <td>{i.resolvedAt ? `${Math.round((i.resolvedAt - i.startedAt) / 60000)} dk` : duration(i.startedAt)}</td>
                  <td className="pe-4"><span className={`chip ${i.status === 'resolved' ? 'green' : 'yellow'}`}>{i.status === 'resolved' ? 'Çözüldü' : 'İnceleniyor'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
