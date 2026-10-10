import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiSearch, FiChevronUp, FiChevronDown, FiAlertTriangle, FiDownload, FiShield } from 'react-icons/fi'
import Card from '../../components/Card'
import Avatar from '../../components/Avatar'
import Pagination from '../../components/Pagination'
import { PlanBadge, UserStatusBadge } from '../../components/admin/AdminBadges'
import { useAdminPlans, useAdminUsers } from '../../api/adminQueries'
import { adminService } from '../../api/services'
import { fmtCompact, fmtDateTime, timeAgo } from '../../utils/format'
import { t as tr, locale, tServer } from '../../i18n'

const COLS = [
  { key: 'name', label: tr('Kullanıcı') },
  { key: 'plan', label: tr('Plan') },
  { key: 'status', label: tr('Durum') },
  { key: 'exchanges', label: tr('Hesap'), num: true },
  { key: 'aumUsd', label: tr('Varlık'), num: true },
  { key: 'volume30dUsd', label: tr('30g Hacim'), num: true, hide: 'xl' },
  { key: 'createdAt', label: tr('Kayıt'), hide: 'lg' },
  { key: 'lastLoginAt', label: tr('Son giriş'), hide: 'md' },
]

export default function Users() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: plans = [] } = useAdminPlans()
  const [q, setQ] = useState(params.get('q') || '')
  const filters = {
    q: params.get('q') || '',
    plan: params.get('plan') || '',
    status: params.get('status') || '',
    flagged: params.get('flagged') || '',
    sort: params.get('sort') || 'createdAt:desc',
    page: +params.get('page') || 1,
    pageSize: 20,
  }
  const { data, isFetching } = useAdminUsers(filters)
  const [sortKey, sortDir] = filters.sort.split(':')

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  // arama kutusu – 300 ms gecikmeli
  useEffect(() => {
    const t = setTimeout(() => q !== filters.q && set({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const exportCsv = async () => {
    const all = await adminService.users({ ...filters, page: 1, pageSize: 100 })
    const rows = all.items.map((u) => [u.id, u.name, u.email, u.plan, u.status, u.exchanges, u.aumUsd, u.volume30dUsd, fmtDateTime(u.createdAt), u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : ''])
    const csv = '﻿' + [['ID', 'Ad', tr('E-posta'), tr('Plan'), tr('Durum'), tr('Hesap'), tr('Varlık USD'), tr('30g Hacim USD'), tr('Kayıt'), tr('Son giriş')], ...rows].map((r) => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'kullanicilar.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Card
      title={<div><h4>{tr('Kullanıcılar')}</h4><small className="text-muted">{data ? tr('{0} kayıt', data.total) : tr('Yükleniyor…')}</small></div>}
      actions={<button className="btn btn-soft" onClick={exportCsv}><FiDownload /> CSV</button>}
      bodyClass="px-0 pb-3"
    >
      <div className="row g-2 px-4 mb-3">
        <div className="col-lg-4 col-md-6">
          <div className="position-relative">
            <input className="form-control pe-5" placeholder={tr('Ad, e-posta veya ID ara')} value={q} onChange={(e) => setQ(e.target.value)} />
            <FiSearch className="position-absolute text-muted" style={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <select className="form-select" value={filters.plan} onChange={(e) => set({ plan: e.target.value })} aria-label={tr('Plan')}>
            <option value="">{tr('Tüm planlar')}</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{tServer(p.name)}</option>)}
          </select>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <select className="form-select" value={filters.status} onChange={(e) => set({ status: e.target.value })} aria-label={tr('Durum')}>
            <option value="">{tr('Tüm durumlar')}</option>
            <option value="active">{tr('Aktif')}</option>
            <option value="trading_halted">{tr('İşlem durduruldu')}</option>
            <option value="suspended">{tr('Askıda')}</option>
            <option value="pending">{tr('Doğrulama bekliyor')}</option>
          </select>
        </div>
        <div className="col-lg-4 d-flex align-items-center gap-3">
          <div className="form-check mb-0">
            <input id="flagged" type="checkbox" className="form-check-input" checked={filters.flagged === 'true'} onChange={(e) => set({ flagged: e.target.checked ? 'true' : '' })} />
            <label htmlFor="flagged" className="form-check-label">{tr('Sadece uyarılı hesaplar')}</label>
          </div>
          {isFetching && <span className="spinner-border spinner-border-sm text-primary" />}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-trading">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th
                  key={c.key}
                  className={`sort-th ${i === 0 ? 'ps-4' : ''} ${c.num ? 'text-end' : ''} ${c.hide ? `d-none d-${c.hide}-table-cell` : ''}`}
                  onClick={() => set({ sort: `${c.key}:${sortKey === c.key && sortDir === 'desc' ? 'asc' : 'desc'}` })}
                >
                  {c.label} {sortKey === c.key && (sortDir === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} className="clickable" onClick={() => navigate(`/admin/users/${u.id}`)}>
                <td className="ps-4">
                  <div className="d-flex align-items-center gap-2">
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0">
                      <Link to={`/admin/users/${u.id}`} className="fw-semibold text-body" onClick={(e) => e.stopPropagation()}>{u.name}</Link>
                      {u.isDemo && <span className="chip sky ms-2">{tr('demo')}</span>}
                      {u.riskFlags.length > 0 && <FiAlertTriangle className="text-warning ms-2" title={u.riskFlags.map(tServer).join(', ')} />}
                      {!u.twoFactor && <span className="ms-2 text-muted" title={tr('2FA kapalı')}><FiShield style={{ opacity: 0.4 }} /></span>}
                      <div className="fs-12 text-muted text-truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><PlanBadge plan={u.plan} name={plans.find((p) => p.id === u.plan)?.name} /></td>
                <td><UserStatusBadge status={u.status} /></td>
                <td className="text-end num">{u.exchanges}</td>
                <td className="text-end num">{u.aumUsd ? `$${fmtCompact(u.aumUsd)}` : '–'}</td>
                <td className="text-end num d-none d-xl-table-cell">{u.volume30dUsd ? `$${fmtCompact(u.volume30dUsd)}` : '–'}</td>
                <td className="text-muted fs-13 d-none d-lg-table-cell text-nowrap">{new Date(u.createdAt).toLocaleDateString(locale)}</td>
                <td className="text-muted fs-13 d-none d-md-table-cell text-nowrap">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : '–'}</td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={8} className="text-center text-muted py-5">{tr('Sonuç bulunamadı.')}</td></tr>}
          </tbody>
        </table>
      </div>
      {data && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 px-4 pt-3">
          <small className="text-muted">{(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} / {data.total}</small>
          <Pagination page={data.page} pages={Math.min(Math.ceil(data.total / data.pageSize), 50)} onChange={(p) => set({ page: String(p) })} />
        </div>
      )}
    </Card>
  )
}
