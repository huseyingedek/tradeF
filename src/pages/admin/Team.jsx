import { useState } from 'react'
import { FiUserPlus, FiTrash2, FiCheck, FiMinus } from 'react-icons/fi'
import Card from '../../components/Card'
import Modal from '../../components/Modal'
import Avatar from '../../components/Avatar'
import { UserStatusBadge } from '../../components/admin/AdminBadges'
import { useCan, useInviteAdmin, useRemoveAdmin, useTeam, useUpdateAdmin } from '../../api/adminQueries'
import { useApp } from '../../context/AppContext'
import { timeAgo } from '../../utils/format'

function InviteModal({ roles, onClose }) {
  const invite = useInviteAdmin({ onSuccess: onClose })
  const [f, setF] = useState({ name: '', email: '', role: 'support' })
  return (
    <Modal
      title="Ekibe admin davet et"
      onClose={onClose}
      onSubmit={() => invite.mutate(f)}
      footer={<><button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" disabled={invite.isPending}>Davet Gönder</button></>}
    >
      <div className="mb-3"><label className="form-label">Ad Soyad</label><input className="form-control" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="mb-3"><label className="form-label">E-posta</label><input type="email" className="form-control" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <label className="form-label">Rol</label>
      <select className="form-select mb-2" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
        {Object.entries(roles).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
      </select>
      <div className="form-help">Davet edilen kişi ilk girişte şifre ve 2FA kurmak zorundadır. En az yetki ilkesine göre rol seçin.</div>
    </Modal>
  )
}

export default function Team() {
  const { data } = useTeam()
  const update = useUpdateAdmin()
  const remove = useRemoveAdmin()
  const can = useCan()
  const { user, confirm } = useApp()
  const [inviting, setInviting] = useState(false)
  if (!data) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
  const manage = can('team.manage')

  return (
    <>
      <Card
        title={<div><h4>Admin Ekibi</h4><small className="text-muted">{data.admins.length} yönetici</small></div>}
        actions={manage && <button className="btn btn-primary" onClick={() => setInviting(true)}><FiUserPlus /> Davet Et</button>}
        bodyClass="px-0 pb-2"
      >
        <div className="table-responsive">
          <table className="table table-trading">
            <thead><tr><th className="ps-4">Yönetici</th><th>Rol</th><th>Durum</th><th>2FA</th><th>Son aktivite</th>{manage && <th className="pe-4 text-end">İşlem</th>}</tr></thead>
            <tbody>
              {data.admins.map((a) => {
                const self = a.id === user?.id
                return (
                  <tr key={a.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-2">
                        <Avatar name={a.name} size={36} color="#e8384f" />
                        <div><div className="fw-semibold">{a.name} {self && <span className="chip gray">siz</span>}</div><div className="fs-12 text-muted">{a.email}</div></div>
                      </div>
                    </td>
                    <td style={{ minWidth: 170 }}>
                      {manage && !self ? (
                        <select className="form-select form-select-sm" value={a.role} onChange={(e) => update.mutate({ id: a.id, role: e.target.value })}>
                          {Object.entries(data.roles).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className={`chip ${data.roles[a.role].color}`}>{data.roles[a.role].label}</span>
                      )}
                    </td>
                    <td><UserStatusBadge status={a.status} /></td>
                    <td>{a.twoFactor ? <span className="chip green">Açık</span> : <span className="chip red">Kurulmadı</span>}</td>
                    <td className="text-muted fs-13">{a.lastActiveAt ? timeAgo(a.lastActiveAt) : '–'}</td>
                    {manage && (
                      <td className="pe-4 text-end text-nowrap">
                        {!self && a.status !== 'invited' && (
                          <button className="btn btn-sm btn-soft me-1" onClick={() => update.mutate({ id: a.id, status: a.status === 'disabled' ? 'active' : 'disabled' })}>
                            {a.status === 'disabled' ? 'Erişimi aç' : 'Erişimi kapat'}
                          </button>
                        )}
                        {!self && a.role !== 'super_admin' && (
                          <button className="btn btn-sm btn-outline-danger" onClick={async () => (await confirm({ title: 'Ekipten çıkar', message: `${a.name} admin paneline erişimini kaybedecek.`, confirmText: 'Çıkar', variant: 'danger' })) && remove.mutate(a.id)} aria-label="Çıkar"><FiTrash2 /></button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={<div><h4>Rol & Yetki Matrisi</h4><small className="text-muted">Her rol yalnızca işini yapmak için gereken yetkilere sahiptir (en az yetki ilkesi).</small></div>} bodyClass="px-0 pb-2">
        <div className="table-responsive">
          <table className="table table-trading perm-matrix">
            <thead>
              <tr>
                <th className="ps-4">Yetki</th>
                {Object.values(data.roles).map((r) => <th key={r.label} className="text-center"><span className={`chip ${r.color}`}>{r.label}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.permissions).map(([perm, label]) => (
                <tr key={perm}>
                  <td className="ps-4"><div>{label}</div><div className="fs-12 text-muted num">{perm}</div></td>
                  {Object.entries(data.roles).map(([k, r]) => (
                    <td key={k} className="text-center">{r.permissions.includes(perm) ? <FiCheck className="text-up" /> : <FiMinus className="text-muted" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {inviting && <InviteModal roles={data.roles} onClose={() => setInviting(false)} />}
    </>
  )
}
