import { useMemo, useState } from 'react'
import { FiDownload, FiSearch } from 'react-icons/fi'
import Card from '../components/Card'
import Segmented from '../components/Segmented'
import { SourceBadge, ExchangeTag } from '../components/Badges'
import { useActivity, useLookups } from '../api/queries'
import { fmtDateTime } from '../utils/format'
import { getLocale } from '../i18n'

const LEVEL_DOT = { danger: 'red', warning: 'yellow', success: 'green', info: 'sky' }

export default function Activity() {
  const lk = useLookups()
  const { data: list = [] } = useActivity({ limit: 300 })
  const [source, setSource] = useState('')
  const [level, setLevel] = useState('')
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('tr-TR')
    return list.filter((a) => (!source || a.source === source) && (!level || a.level === level) && (!term || a.message.toLocaleLowerCase('tr-TR').includes(term)))
  }, [list, source, level, q])

  // güne göre grupla
  const groups = useMemo(() => {
    const g = []
    filtered.forEach((a) => {
      const day = new Date(a.ts).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
      if (!g.length || g[g.length - 1].day !== day) g.push({ day, items: [] })
      g[g.length - 1].items.push(a)
    })
    return g
  }, [filtered])

  const exportCsv = () => {
    const csv = '﻿' + [['Zaman', 'Seviye', 'Kaynak', 'Mesaj'], ...filtered.map((a) => [fmtDateTime(a.ts), a.level, a.source, `"${a.message.replace(/"/g, "'")}"`])].map((r) => r.join(';')).join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    el.download = 'islem-gunlugu.csv'
    el.click()
    URL.revokeObjectURL(el.href)
  }

  return (
    <Card
      title={
        <Segmented
          options={[
            { value: '', label: 'Tümü' },
            { value: 'manual', label: 'Manuel' },
            { value: 'rule', label: 'Kural' },
            { value: 'bot', label: 'Bot' },
            { value: 'system', label: 'Sistem' },
            { value: 'risk', label: 'Risk' },
          ]}
          value={source}
          onChange={setSource}
        />
      }
      actions={
        <div className="d-flex gap-2 flex-wrap">
          <select className="form-select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Seviye" style={{ width: 150 }}>
            <option value="">Tüm seviyeler</option>
            <option value="success">Başarılı</option>
            <option value="info">Bilgi</option>
            <option value="warning">Uyarı</option>
            <option value="danger">Hata / Kritik</option>
          </select>
          <div className="position-relative">
            <input className="form-control pe-5" placeholder="Mesajlarda ara" value={q} onChange={(e) => setQ(e.target.value)} />
            <FiSearch className="position-absolute text-muted" style={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
          <button className="btn btn-soft" onClick={exportCsv}><FiDownload /> CSV</button>
        </div>
      }
    >
      {!groups.length && <div className="text-center text-muted py-5">Kayıt bulunamadı.</div>}
      {groups.map((g) => (
        <div key={g.day} className="mb-4">
          <div className="timeline-day">{g.day}</div>
          <div className="timeline">
            {g.items.map((a) => (
              <div key={a.id} className="timeline-item">
                <span className={`status-dot ${LEVEL_DOT[a.level] || 'sky'}`} />
                <div className="flex-grow-1 min-w-0">
                  <div className={a.level === 'danger' ? 'text-down fw-semibold' : ''}>{a.message}</div>
                  <div className="d-flex flex-wrap gap-2 align-items-center fs-12 text-muted mt-1">
                    <span>{new Date(a.ts).toLocaleTimeString(getLocale())}</span>
                    <SourceBadge source={a.source} />
                    {a.exchangeId && lk.exchange[a.exchangeId] && <ExchangeTag exchange={lk.exchange[a.exchangeId]} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}
