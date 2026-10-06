import { useState } from 'react'
import { FiPower, FiPlay } from 'react-icons/fi'
import Modal from './Modal'
import { useKillSwitch, useRisk } from '../api/queries'
import { useApp } from '../context/AppContext'
import { timeAgo } from '../utils/format'

/** Acil durdurma onay penceresi (seçenekli) */
export function KillSwitchModal({ onClose }) {
  const mutation = useKillSwitch()
  const { toast } = useApp()
  const [opts, setOpts] = useState({ cancelOrders: true, closePositions: false, reason: '' })
  const submit = () =>
    mutation.mutate(
      { active: true, reason: opts.reason.trim() || 'Manuel acil durdurma', cancelOrders: opts.cancelOrders, closePositions: opts.closePositions },
      {
        onSuccess: () => {
          toast('Tüm işlemler durduruldu', 'danger')
          onClose()
        },
      },
    )
  return (
    <Modal
      title="Acil Durdurma (Kill Switch)"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-soft" onClick={onClose}>Vazgeç</button>
          <button className="btn btn-danger" onClick={submit} disabled={mutation.isPending}>
            <FiPower /> {mutation.isPending ? 'Durduruluyor…' : 'Tümünü Durdur'}
          </button>
        </>
      }
    >
      <p className="text-muted">
        Tüm hesaplarda yeni emir girişi engellenir, çalışan botlar duraklatılır ve kurallar işlem yapamaz. Zarar-kes / kâr-al korumaları çalışmaya devam eder.
      </p>
      <div className="form-check mb-2">
        <input id="ks-cancel" type="checkbox" className="form-check-input" checked={opts.cancelOrders} onChange={(e) => setOpts({ ...opts, cancelOrders: e.target.checked })} />
        <label htmlFor="ks-cancel" className="form-check-label">Tüm açık emirleri iptal et</label>
      </div>
      <div className="form-check mb-3">
        <input id="ks-close" type="checkbox" className="form-check-input" checked={opts.closePositions} onChange={(e) => setOpts({ ...opts, closePositions: e.target.checked })} />
        <label htmlFor="ks-close" className="form-check-label">
          Tüm pozisyonları piyasa fiyatından kapat <span className="text-down fs-13">(geri alınamaz)</span>
        </label>
      </div>
      <label className="form-label">Not (isteğe bağlı)</label>
      <input className="form-control" placeholder="Örn. piyasa çok oynak" value={opts.reason} onChange={(e) => setOpts({ ...opts, reason: e.target.value })} />
    </Modal>
  )
}

/** Header'daki hızlı erişim butonu */
export function KillSwitchButton() {
  const { data: risk } = useRisk()
  const mutation = useKillSwitch()
  const { confirm, toast } = useApp()
  const [open, setOpen] = useState(false)
  const active = risk?.killSwitch?.active

  const resume = async () => {
    const ok = await confirm({
      title: 'İşlemleri yeniden etkinleştir',
      message: `Durdurma nedeni: "${risk.killSwitch.reason}" (${timeAgo(risk.killSwitch.at)}). Botlar otomatik başlamaz, gerekirse elle başlatın.`,
      confirmText: 'Etkinleştir',
    })
    if (ok) mutation.mutate({ active: false }, { onSuccess: () => toast('İşlemler yeniden etkin') })
  }

  return (
    <>
      {active ? (
        <button className="btn btn-danger kill-active d-inline-flex align-items-center gap-2" onClick={resume} title="İşlemler durduruldu – etkinleştirmek için tıklayın">
          <FiPlay /> <span className="d-none d-md-inline">İşlemler Durduruldu</span>
        </button>
      ) : (
        <button className="btn btn-outline-danger d-inline-flex align-items-center gap-2 kill-btn" onClick={() => setOpen(true)} title="Acil durdurma">
          <FiPower /> <span className="d-none d-md-inline">Acil Durdur</span>
        </button>
      )}
      {open && <KillSwitchModal onClose={() => setOpen(false)} />}
    </>
  )
}
