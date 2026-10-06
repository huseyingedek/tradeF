import { useMemo, useState } from 'react'
import { FiDownload, FiSearch } from 'react-icons/fi'
import Card from '../../components/Card'
import RequirePerm from '../../components/admin/RequirePerm'
import { ACTION_LABEL, actionTone } from '../../components/admin/AdminBadges'
import { useAudit, useTeam } from '../../api/adminQueries'
import { fmtDateTime } from '../../utils/format'

const CATEGORIES = [
  ['', 'Tüm işlemler'],
  ['user.', 'Kullanıcı'],
  ['risk.', 'Risk / platform'],
  ['provider.', 'Entegrasyon'],
  ['plan.', 'Plan'],
  ['payment.', 'Ödeme'],
  ['announcement.', 'Duyuru'],
  ['team.', 'Ekip'],
  ['admin.', 'Giriş'],
]

function AuditPage() {
  const [f, setF] = useState({ actor: '', action: '', q: '' })
  const { data: list = [], isFetching } = useAudit(f)
  const { data: team } = useTeam()
  const actors = useMemo(() => [...new Set([...(team?.admins.map((a) => a.name) || []), ...list.map((a) => a.actor)])], [team, list])

  const exportCsv = () => {
    const csv = '﻿' + [['Zaman', 'Yönetici', 'İşlem', 'Hedef', 'Detay', 'IP'], ...list.map((a) => [fmtDateTime(a.ts), a.actor, a.action, a.target, `"${a.details.replace(/"/g, "'")}"`, a.ip])].map((r) => r.join(';')).join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    el.download = 'denetim-gunlugu.csv'
    el.click()
    URL.revokeObjectURL(el.href)
  }

  return (
    <Card
      title={<div><h4>Denetim Günlüğü</h4><small className="text-muted">Tüm admin işlemleri değiştirilemez şekilde kaydedilir.</small></div>}
      actions={<button className="btn btn-soft" onClick={exportCsv}><FiDownload /> CSV</button>}
      bodyClass="px-0 pb-2"
    >
      <div className="row g-2 px-4 mb-3">
        <div className="col-md-3 col-6">
          <select className="form-select" value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })}>
            <option value="">Tüm yöneticiler</option>
            {actors.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="col-md-3 col-6">
          <select className="form-select" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="col-md-5">
          <div className="position-relative">
            <input className="form-control pe-5" placeholder="Hedef veya detayda ara" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <FiSearch className="position-absolute text-muted" style={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
        <div className="col-md-1 d-flex align-items-center">{isFetching && <span className="spinner-border spinner-border-sm text-primary" />}</div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-trading">
          <thead><tr><th className="ps-4">Zaman</th><th>Yönetici</th><th>İşlem</th><th>Hedef</th><th>Detay</th><th className="pe-4">IP</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="ps-4 text-muted fs-13 text-nowrap">{fmtDateTime(a.ts)}</td>
                <td className="fw-semibold text-nowrap">{a.actor}</td>
                <td><span className={`chip ${actionTone(a.action)}`}>{ACTION_LABEL[a.action] || a.action}</span></td>
                <td className="text-nowrap">{a.target}</td>
                <td className="fs-13" style={{ minWidth: 260 }}>{a.details}</td>
                <td className="pe-4 num fs-13 text-muted">{a.ip}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="text-center text-muted py-5">Kayıt yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function Audit() {
  return <RequirePerm perm="audit.read"><AuditPage /></RequirePerm>
}
