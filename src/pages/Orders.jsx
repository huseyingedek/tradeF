import { useMemo, useState } from 'react'
import { FiDownload, FiXCircle } from 'react-icons/fi'
import Card from '../components/Card'
import Segmented from '../components/Segmented'
import Pagination from '../components/Pagination'
import OrdersTable from '../components/trading/OrdersTable'
import { useApp } from '../context/AppContext'
import { useCancelAll, useLookups, useOrders } from '../api/queries'
import { ORDER_TYPE_LABEL } from '../utils/trading'
import { fmtDateTime } from '../utils/format'

const PER_PAGE = 15

export default function Orders() {
  const lk = useLookups()
  const { confirm, toast } = useApp()
  const [tab, setTab] = useState('open')
  const [filters, setFilters] = useState({ exchangeId: '', symbol: '', side: '', type: '', source: '' })
  const [page, setPage] = useState(1)
  const { data: open = [] } = useOrders('open')
  const { data: history = [] } = useOrders('history')
  const cancelAll = useCancelAll()

  const list = tab === 'open' ? open : history
  const filtered = useMemo(
    () => list.filter((o) => Object.entries(filters).every(([k, v]) => !v || o[k] === v)),
    [list, filters],
  )
  const pages = Math.ceil(filtered.length / PER_PAGE)
  const current = Math.min(page, pages || 1)
  const set = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }))
    setPage(1)
  }
  const symbols = [...new Set([...open, ...history].map((o) => o.symbol))].sort()

  const exportCsv = () => {
    const header = ['Tarih', 'Hesap', 'Sembol', 'Tip', 'Yön', 'Miktar', 'Fiyat', 'Stop', 'Ort. Fiyat', 'Durum', 'Kaynak', 'K/Z']
    const rows = filtered.map((o) => [
      fmtDateTime(o.createdAt), lk.exchange[o.exchangeId]?.label, o.symbol, ORDER_TYPE_LABEL[o.type], o.side, o.qty, o.price ?? '', o.stopPrice ?? '', o.avgPrice ?? '', o.status, o.source, o.realizedPnl ?? '',
    ])
    const csv = '﻿' + [header, ...rows].map((r) => r.join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `emirler-${tab}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('CSV indirildi', 'info')
  }

  return (
    <Card
      title={
        <Segmented
          options={[{ value: 'open', label: `Açık Emirler (${open.length})` }, { value: 'history', label: `Geçmiş (${history.length})` }]}
          value={tab}
          onChange={(v) => {
            setTab(v)
            setPage(1)
          }}
        />
      }
      actions={
        <div className="d-flex gap-2">
          {tab === 'open' && open.length > 0 && (
            <button
              className="btn btn-outline-danger"
              onClick={async () => {
                const ok = await confirm({ title: 'Tüm açık emirleri iptal et', message: `${filters.exchangeId ? lk.exchange[filters.exchangeId]?.label : 'Tüm hesaplardaki'} ${filters.symbol || ''} açık emirler iptal edilecek.`, confirmText: 'Hepsini İptal Et', variant: 'danger' })
                if (ok) cancelAll.mutate({ exchangeId: filters.exchangeId || undefined, symbol: filters.symbol || undefined })
              }}
            >
              <FiXCircle /> Tümünü İptal Et
            </button>
          )}
          <button className="btn btn-soft" onClick={exportCsv}><FiDownload /> CSV</button>
        </div>
      }
      bodyClass="px-0 pb-3"
    >
      <div className="row g-2 px-4 mb-3">
        <div className="col-md col-6">
          <select className="form-select form-select-sm" value={filters.exchangeId} onChange={set('exchangeId')} aria-label="Hesap">
            <option value="">Tüm hesaplar</option>
            {lk.exchanges.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div className="col-md col-6">
          <select className="form-select form-select-sm" value={filters.symbol} onChange={set('symbol')} aria-label="Sembol">
            <option value="">Tüm semboller</option>
            {symbols.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="col-md col-4">
          <select className="form-select form-select-sm" value={filters.side} onChange={set('side')} aria-label="Yön">
            <option value="">Alış + Satış</option>
            <option value="buy">Alış</option>
            <option value="sell">Satış</option>
          </select>
        </div>
        <div className="col-md col-4">
          <select className="form-select form-select-sm" value={filters.type} onChange={set('type')} aria-label="Tip">
            <option value="">Tüm tipler</option>
            {Object.entries(ORDER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-md col-4">
          <select className="form-select form-select-sm" value={filters.source} onChange={set('source')} aria-label="Kaynak">
            <option value="">Tüm kaynaklar</option>
            <option value="manual">Manuel</option>
            <option value="rule">Kural</option>
            <option value="bot">Bot</option>
            <option value="system">Sistem (SL/TP)</option>
          </select>
        </div>
      </div>
      <OrdersTable orders={filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)} history={tab === 'history'} />
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 px-4 pt-3">
        <small className="text-muted">Toplam {filtered.length} emir</small>
        <Pagination page={current} pages={pages} onChange={setPage} />
      </div>
    </Card>
  )
}
