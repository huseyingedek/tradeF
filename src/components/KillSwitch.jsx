import { useState } from 'react'
import { FiPower, FiPlay } from 'react-icons/fi'
import Modal from './Modal'
import { useKillSwitch, useRisk } from '../api/queries'
import { useApp } from '../context/AppContext'
import { timeAgo } from '../utils/format'
import { t } from '../i18n'

/** Acil durdurma onay penceresi (seçenekli) */
export function KillSwitchModal({ onClose }) {
  const mutation = useKillSwitch()
  const { toast } = useApp()
  const [opts, setOpts] = useState({ cancelOrders: true, closePositions: false, reason: '' })
  const submit = () =>
    mutation.mutate(
      { active: true, reason: opts.reason.trim() || t('Manuel acil durdurma'), cancelOrders: opts.cancelOrders, closePositions: opts.closePositions },
      {
        onSuccess: () => {
          toast(t('Tüm işlemler durduruldu'), 'danger')
          onClose()
        },
      },
    )
  return (
    <Modal
      title={t('Acil Durdurma (Kill Switch)')}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-soft" onClick={onClose}>{t('Vazgeç')}</button>
          <button className="btn btn-danger" onClick={submit} disabled={mutation.isPending}>
            <FiPower /> {mutation.isPending ? t('Durduruluyor…') : t('Tümünü Durdur')}
          </button>
        </>
      }
    >
      <p className="text-muted">
        {t('Tüm hesaplarda yeni emir girişi engellenir, çalışan botlar duraklatılır ve kurallar işlem yapamaz. Zarar-kes / kâr-al korumaları çalışmaya devam eder.')}
      </p>
      <div className="form-check mb-2">
        <input id="ks-cancel" type="checkbox" className="form-check-input" checked={opts.cancelOrders} onChange={(e) => setOpts({ ...opts, cancelOrders: e.target.checked })} />
        <label htmlFor="ks-cancel" className="form-check-label">{t('Tüm açık emirleri iptal et')}</label>
      </div>
      <div className="form-check mb-3">
        <input id="ks-close" type="checkbox" className="form-check-input" checked={opts.closePositions} onChange={(e) => setOpts({ ...opts, closePositions: e.target.checked })} />
        <label htmlFor="ks-close" className="form-check-label">
          {t('Tüm pozisyonları piyasa fiyatından kapat')} <span className="text-down fs-13">{t('(geri alınamaz)')}</span>
        </label>
      </div>
      <label className="form-label">{t('Not (isteğe bağlı)')}</label>
      <input className="form-control" placeholder={t('Örn. piyasa çok oynak')} value={opts.reason} onChange={(e) => setOpts({ ...opts, reason: e.target.value })} />
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
      title: t('İşlemleri yeniden etkinleştir'),
      message: t('Durdurma nedeni: "{0}" ({1}). Botlar otomatik başlamaz, gerekirse elle başlatın.', risk.killSwitch.reason, timeAgo(risk.killSwitch.at)),
      confirmText: t('Etkinleştir'),
    })
    if (ok) mutation.mutate({ active: false }, { onSuccess: () => toast(t('İşlemler yeniden etkin')) })
  }

  return (
    <>
      {active ? (
        <button className="btn btn-danger kill-active d-inline-flex align-items-center gap-2" onClick={resume} title={t('İşlemler durduruldu – etkinleştirmek için tıklayın')}>
          <FiPlay /> <span className="d-none d-md-inline">{t('İşlemler Durduruldu')}</span>
        </button>
      ) : (
        <button className="btn btn-outline-danger d-inline-flex align-items-center gap-2 kill-btn" onClick={() => setOpen(true)} title={t('Acil durdurma')}>
          <FiPower /> <span className="d-none d-md-inline">{t('Acil Durdur')}</span>
        </button>
      )}
      {open && <KillSwitchModal onClose={() => setOpen(false)} />}
    </>
  )
}
