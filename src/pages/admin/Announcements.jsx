import { useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import AnnouncementBanner, { LEVELS } from '../../components/admin/AnnouncementBanner'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import Switch from '../../components/Switch'
import EmptyState from '../../components/EmptyState'
import RequirePerm from '../../components/admin/RequirePerm'
import { useAdminAnnouncements, useAdminPlans, useDeleteAnnouncement, useSaveAnnouncement } from '../../api/adminQueries'
import { useApp } from '../../context/AppContext'
import { fmtDateTime } from '../../utils/format'
import { t as tr, tServer } from '../../i18n'

const toLocal = (ts) => (ts ? new Date(ts - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
const fromLocal = (s) => (s ? new Date(s).getTime() : null)

const statusOf = (a) => {
  const t = Date.now()
  if (!a.active) return ['gray', tr('Taslak / kapalı')]
  if (a.startsAt > t) return ['sky', tr('Planlandı')]
  if (a.endsAt && a.endsAt <= t) return ['gray', tr('Sona erdi')]
  return ['green', tr('Yayında')]
}

function AnnouncementModal({ initial, onClose }) {
  const { data: plans = [] } = useAdminPlans()
  const save = useSaveAnnouncement({ onSuccess: onClose })
  const [f, setF] = useState(() => initial?.id ? initial : { title: '', message: '', level: 'info', audience: 'all', active: true, startsAt: Date.now(), endsAt: Date.now() + 3 * 86400000 })
  const set = (x) => setF((v) => ({ ...v, ...x }))
  return (
    <Modal
      title={f.id ? tr('Duyuruyu düzenle') : tr('Yeni duyuru')}
      size="modal-lg"
      onClose={onClose}
      onSubmit={() => save.mutate(f)}
      footer={<><button type="button" className="btn btn-soft" onClick={onClose}>{tr('Vazgeç')}</button><button className="btn btn-primary" disabled={save.isPending}>{f.active ? tr('Yayınla') : tr('Taslak kaydet')}</button></>}
    >
      <div className="row g-3">
        <div className="col-md-8"><label className="form-label">{tr('Başlık')}</label><input className="form-control" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr('Örn. Planlı bakım')} /></div>
        <div className="col-md-4">
          <label className="form-label">{tr('Tür')}</label>
          <select className="form-select" value={f.level} onChange={(e) => set({ level: e.target.value })}>
            {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="col-12"><label className="form-label">{tr('Mesaj')}</label><textarea className="form-control" rows={3} value={f.message} onChange={(e) => set({ message: e.target.value })} /></div>
        <div className="col-md-4">
          <label className="form-label">{tr('Hedef kitle')}</label>
          <select className="form-select" value={f.audience} onChange={(e) => set({ audience: e.target.value })}>
            <option value="all">{tr('Tüm kullanıcılar')}</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{tr('Sadece')} {tServer(p.name)} {tr('planı')}</option>)}
          </select>
        </div>
        <div className="col-md-4"><label className="form-label">{tr('Başlangıç')}</label><input type="datetime-local" className="form-control" value={toLocal(f.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} /></div>
        <div className="col-md-4"><label className="form-label">{tr('Bitiş')}</label><input type="datetime-local" className="form-control" value={toLocal(f.endsAt)} onChange={(e) => set({ endsAt: fromLocal(e.target.value) })} /></div>
        <div className="col-12"><Switch checked={f.active} onChange={(v) => set({ active: v })} label={tr('Aktif (zamanı gelince kullanıcı panelinde gösterilir)')} /></div>
        <div className="col-12">
          <label className="form-label">{tr('Önizleme')}</label>
          <AnnouncementBanner a={{ ...f, title: f.title || tr('Başlık'), message: f.message || tr('Mesaj metni') }} />
        </div>
      </div>
    </Modal>
  )
}

function AnnouncementsPage() {
  const { data: list = [] } = useAdminAnnouncements()
  const del = useDeleteAnnouncement()
  const save = useSaveAnnouncement()
  const { confirm } = useApp()
  const [editing, setEditing] = useState(null)

  return (
    <>
      <Card
        title={<div><h4>{tr('Duyurular')}</h4><small className="text-muted">{tr('Kullanıcı panelinin üstünde banner olarak gösterilir.')}</small></div>}
        actions={<button className="btn btn-primary" onClick={() => setEditing({})}><FiPlus /> {tr('Yeni Duyuru')}</button>}
      >
        {!list.length && <EmptyState title={tr('Duyuru yok')} />}
        {list.map((a) => {
          const [c, t] = statusOf(a)
          return (
            <div key={a.id} className="announce-row">
              <AnnouncementBanner a={a} />
              <div className="d-flex flex-wrap align-items-center gap-2 mt-2 fs-13">
                <span className={`chip ${c}`}>{t}</span>
                <span className="text-muted">{tr('Hedef:')} {a.audience === 'all' ? tr('tüm kullanıcılar') : tr('{0} planı', a.audience)}</span>
                <span className="text-muted">· {fmtDateTime(a.startsAt)} → {a.endsAt ? fmtDateTime(a.endsAt) : tr('süresiz')}</span>
                <span className="text-muted">· {a.createdBy}</span>
                <div className="ms-auto d-flex gap-2 align-items-center">
                  <Switch checked={a.active} onChange={(v) => save.mutate({ ...a, active: v })} label={a.active ? tr('Aktif') : tr('Kapalı')} />
                  <button className="btn btn-sm btn-soft" onClick={() => setEditing(a)} aria-label={tr('Düzenle')}><FiEdit2 /></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={async () => (await confirm({ title: tr('Duyuruyu sil'), message: tr('"{0}" silinecek.', a.title), confirmText: tr('Sil'), variant: 'danger' })) && del.mutate(a.id)} aria-label={tr('Sil')}><FiTrash2 /></button>
                </div>
              </div>
            </div>
          )
        })}
      </Card>
      {editing && <AnnouncementModal initial={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

export default function Announcements() {
  return <RequirePerm perm="announcements.manage"><AnnouncementsPage /></RequirePerm>
}
