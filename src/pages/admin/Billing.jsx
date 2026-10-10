import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiRotateCcw } from 'react-icons/fi'
import Card from '../../components/Card'
import Chart from '../../components/Chart'
import Modal from '../../components/Modal'
import Switch from '../../components/Switch'
import Segmented from '../../components/Segmented'
import Pagination from '../../components/Pagination'
import ReasonModal from '../../components/admin/ReasonModal'
import RequirePerm from '../../components/admin/RequirePerm'
import { PaymentBadge, PlanBadge } from '../../components/admin/AdminBadges'
import { useAdminPayments, useAdminPlans, useCan, useConfirmPayment, useDeletePlan, useFailPayment, useRefund, useSavePlan } from '../../api/adminQueries'
import { useApp } from '../../context/AppContext'
import { fmtDateTime, fmtMoney, fmtNum } from '../../utils/format'
import { t, locale, pctText, tServer } from '../../i18n'

const FEATURES = { futures: t('Vadeli / kaldıraç'), telegram: t('Telegram bildirimleri'), prioritySupport: t('Öncelikli destek'), apiAccess: t('API erişimi') }
const lim = (v) => (v === -1 ? t('Sınırsız') : v)

function PlanModal({ plan, onClose }) {
  const save = useSavePlan({ onSuccess: onClose })
  const [f, setF] = useState(() => plan || { name: '', description: '', priceMonthly: 0, priceYearly: 0, limits: { exchanges: 1, bots: 1, rules: 5 }, features: {}, active: true, highlighted: false })
  const set = (x) => setF((v) => ({ ...v, ...x }))
  const setL = (k, v) => setF((x) => ({ ...x, limits: { ...x.limits, [k]: v === '' ? '' : +v } }))
  const setFe = (k, v) => setF((x) => ({ ...x, features: { ...x.features, [k]: v } }))
  const discount = f.priceMonthly > 0 ? 100 - (f.priceYearly / (f.priceMonthly * 12)) * 100 : 0
  return (
    <Modal
      title={plan ? t('{0} planını düzenle', plan.name) : t('Yeni plan')}
      size="modal-lg"
      onClose={onClose}
      onSubmit={() => save.mutate(f)}
      footer={<><button type="button" className="btn btn-soft" onClick={onClose}>{t('Vazgeç')}</button><button className="btn btn-primary" disabled={save.isPending}>{t('Kaydet')}</button></>}
    >
      {plan?.subscribers > 0 && <div className="alert alert-warning py-2 fs-13">{t('Bu planda')} {plan.subscribers} {t('abone var. Fiyat değişikliği mevcut abonelere bir sonraki yenilemede yansır; limit düşürmek kullanıcıların mevcut bot/kurallarını silmez, yenilerini engeller.')}</div>}
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label">{t('Plan adı')}</label><input className="form-control" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="col-md-3 col-6"><label className="form-label">{t('Aylık (₺)')}</label><input type="number" className="form-control" value={f.priceMonthly} onChange={(e) => set({ priceMonthly: +e.target.value })} /></div>
        <div className="col-md-3 col-6">
          <label className="form-label">{t('Yıllık (₺)')}</label>
          <input type="number" className="form-control" value={f.priceYearly} onChange={(e) => set({ priceYearly: +e.target.value })} />
          {discount > 0 && <div className="form-help">{t('{0} indirim', pctText(fmtNum(discount, 0)))}</div>}
        </div>
        <div className="col-12"><label className="form-label">{t('Açıklama')}</label><input className="form-control" value={f.description} onChange={(e) => set({ description: e.target.value })} /></div>
        {[['exchanges', t('Borsa hesabı')], ['bots', t('Bot')], ['rules', t('Kural')]].map(([k, l]) => (
          <div className="col-md-4" key={k}>
            <label className="form-label">{l} {t('limiti')}</label>
            <div className="input-group">
              <input type="number" className="form-control" value={f.limits[k] === -1 ? '' : f.limits[k]} disabled={f.limits[k] === -1} onChange={(e) => setL(k, e.target.value)} />
              <span className="input-group-text"><input type="checkbox" className="form-check-input m-0 me-1" checked={f.limits[k] === -1} onChange={(e) => setL(k, e.target.checked ? -1 : 1)} /> ∞</span>
            </div>
          </div>
        ))}
        <div className="col-md-6">
          <label className="form-label">{t('Özellikler')}</label>
          {Object.entries(FEATURES).map(([k, l]) => <Switch key={k} className="mb-2" checked={f.features?.[k]} onChange={(v) => setFe(k, v)} label={l} />)}
        </div>
        <div className="col-md-6">
          <label className="form-label">{t('Görünürlük')}</label>
          <Switch className="mb-2" checked={f.active} onChange={(v) => set({ active: v })} label={t('Satışta (yeni abonelere açık)')} />
          <Switch checked={f.highlighted} onChange={(v) => set({ highlighted: v })} label={t('Önerilen plan olarak vurgula')} />
        </div>
      </div>
    </Modal>
  )
}

function Plans() {
  const { data: plans = [] } = useAdminPlans()
  const { data: pay } = useAdminPayments({ page: 1, pageSize: 1 })
  const del = useDeletePlan()
  const can = useCan()
  const { confirm } = useApp()
  const [editing, setEditing] = useState(null)
  const mrr = plans.reduce((a, p) => a + p.mrr, 0)
  const paying = plans.filter((p) => p.priceMonthly > 0).reduce((a, p) => a + p.subscribers, 0)

  return (
    <>
      <div className="row">
        {[
          ['MRR', fmtMoney(mrr, 'TRY', 0)],
          [t('ARR (yıllık)'), fmtMoney(mrr * 12, 'TRY', 0)],
          [t('Ücretli abone'), fmtNum(paying, 0)],
          [t('Abone başı gelir'), fmtMoney(paying ? mrr / paying : 0, 'TRY', 0)],
        ].map(([l, v]) => (
          <div className="col-xl-3 col-sm-6" key={l}><Card><div className="text-muted">{l}</div><div className="fs-3 fw-bold num">{v}</div></Card></div>
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0" style={{ fontSize: '1.15rem' }}>{t('Planlar')}</h4>
        {can('billing.manage') && <button className="btn btn-primary" onClick={() => setEditing({})}><FiPlus /> {t('Yeni Plan')}</button>}
      </div>
      <div className="row g-4 mb-4">
        {plans.map((p) => (
          <div className="col-xxl-3 col-md-6" key={p.id}>
            <div className={`hn-card plan-card h-100 mb-0 ${p.highlighted ? 'highlight' : ''} ${p.active ? '' : 'opacity-75'}`}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <PlanBadge plan={p.id} name={p.name} />
                  {p.highlighted && <span className="chip yellow ms-1">{t('Önerilen')}</span>}
                  {!p.active && <span className="chip gray ms-1">{t('Satışta değil')}</span>}
                </div>
                {can('billing.manage') && (
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-soft" onClick={() => setEditing(p)} aria-label={t('Düzenle')}><FiEdit2 /></button>
                    {p.subscribers === 0 && (
                      <button className="btn btn-sm btn-outline-danger" onClick={async () => (await confirm({ title: t('Planı sil'), message: t('{0} silinecek.', p.name), confirmText: t('Sil'), variant: 'danger' })) && del.mutate(p.id)} aria-label={t('Sil')}><FiTrash2 /></button>
                    )}
                  </div>
                )}
              </div>
              <div className="my-3">
                <span className="fs-2 fw-bold num">{fmtMoney(p.priceMonthly, 'TRY', 0)}</span><span className="text-muted">/ay</span>
                <div className="fs-13 text-muted">{t('Yıllık')} {fmtMoney(p.priceYearly, 'TRY', 0)}</div>
              </div>
              <p className="fs-13 text-muted">{p.description}</p>
              <ul className="plan-features">
                <li><FiCheck /> {lim(p.limits.exchanges)} {t('borsa hesabı')}</li>
                <li><FiCheck /> {lim(p.limits.bots)} {t('bot')}</li>
                <li><FiCheck /> {lim(p.limits.rules)} {t('kural & alarm')}</li>
                {Object.entries(FEATURES).map(([k, l]) => (
                  <li key={k} className={p.features[k] ? '' : 'off'}>{p.features[k] ? <FiCheck /> : <FiX />} {l}</li>
                ))}
              </ul>
              <div className="bot-stats mt-auto mb-0">
                <div><small>{t('Abone')}</small><span className="num">{p.subscribers}</span></div>
                <div><small>MRR</small><span className="num">{fmtMoney(p.mrr, 'TRY', 0)}</span></div>
                <div><small>{t('Pay')}</small><span className="num">{pctText(mrr ? fmtNum((p.mrr / mrr) * 100, 0) : 0)}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pay && (
        <Card title={t('Aylık Gelir (son 6 ay)')}>
          <Chart
            type="bar"
            height={280}
            series={[
              { name: t('Tahsilat'), data: pay.monthly.map((m) => m.revenue) },
              { name: t('İade@@grafik'), data: pay.monthly.map((m) => m.refunds) },
            ]}
            options={{
              colors: ['#8c62ff', '#f6465d'],
              plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
              dataLabels: { enabled: false },
              xaxis: { categories: pay.monthly.map((m) => new Date(m.month).toLocaleDateString(locale, { month: 'long', year: '2-digit' })) },
              yaxis: { labels: { formatter: (v) => fmtMoney(v, 'TRY', 0) } },
              legend: { position: 'top', horizontalAlign: 'right' },
              tooltip: { y: { formatter: (v) => fmtMoney(v, 'TRY', 0) } },
            }}
          />
        </Card>
      )}
      {editing && <PlanModal plan={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </>
  )
}

function Payments() {
  const [f, setF] = useState({ status: '', plan: '', q: '', page: 1, pageSize: 15 })
  const { data, isFetching } = useAdminPayments(f)
  const { data: plans = [] } = useAdminPlans()
  const can = useCan()
  const [refunding, setRefunding] = useState(null)
  const refund = useRefund({ onSuccess: () => setRefunding(null) })
  const confirmPay = useConfirmPayment()
  const [failing, setFailing] = useState(null)
  const failPay = useFailPayment({ onSuccess: () => setFailing(null) })
  const set = (x) => setF((v) => ({ ...v, ...x, page: x.page ?? 1 }))

  return (
    <Card title={<h4>{t('Ödemeler')}</h4>} actions={isFetching && <span className="spinner-border spinner-border-sm text-primary" />} bodyClass="px-0 pb-3">
      <div className="row g-2 px-4 mb-3">
        <div className="col-md-5">
          <div className="position-relative">
            <input className="form-control pe-5" placeholder={t('Kullanıcı ara')} value={f.q} onChange={(e) => set({ q: e.target.value })} />
            <FiSearch className="position-absolute text-muted" style={{ right: 16, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
        <div className="col-md-3 col-6">
          <select className="form-select" value={f.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">{t('Tüm durumlar')}</option>
            <option value="pending">{t('Onay bekliyor')}</option>
            <option value="paid">{t('Ödendi')}</option>
            <option value="failed">{t('Başarısız')}</option>
            <option value="refunded">{t('İade')}</option>
          </select>
        </div>
        <div className="col-md-3 col-6">
          <select className="form-select" value={f.plan} onChange={(e) => set({ plan: e.target.value })}>
            <option value="">{t('Tüm planlar')}</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{tServer(p.name)}</option>)}
          </select>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-trading">
          <thead><tr><th className="ps-4">{t('Tarih')}</th><th>{t('Kullanıcı')}</th><th>{t('Plan')}</th><th>{t('Yöntem')}</th><th className="text-end">{t('Tutar')}</th><th>{t('Durum')}</th><th className="pe-4 text-end">{t('İşlem')}</th></tr></thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="ps-4 text-muted fs-13 text-nowrap">{fmtDateTime(p.createdAt)}</td>
                <td><Link to={`/admin/users/${p.userId}`} className="fw-semibold text-body">{p.userName}</Link></td>
                <td><PlanBadge plan={p.plan} /> <span className="fs-12 text-muted">{p.billing === 'yearly' ? t('yıllık') : t('aylık')}</span></td>
                <td className="fs-13">{p.method}</td>
                <td className="text-end num fw-semibold">{fmtMoney(p.amount, 'TRY', 0)}</td>
                <td><PaymentBadge status={p.status} />{p.failureReason && <div className="fs-12 text-down">{p.failureReason}</div>}</td>
                <td className="pe-4 text-end">
                  {can('billing.manage') && p.status === 'paid' && <button className="btn btn-sm btn-soft" onClick={() => setRefunding(p)}><FiRotateCcw /> {t('İade@@eylem')}</button>}
                  {can('billing.manage') && p.status === 'pending' && (
                    <span className="d-inline-flex gap-1">
                      <button className="btn btn-sm btn-success" disabled={confirmPay.isPending} onClick={() => confirmPay.mutate(p.id)}>{t('Onayla')}</button>
                      <button className="btn btn-sm btn-soft" onClick={() => setFailing(p)}>{t('Reddet')}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={7} className="text-center text-muted py-5">{t('Kayıt yok.')}</td></tr>}
          </tbody>
        </table>
      </div>
      {data && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 px-4 pt-3">
          <small className="text-muted">{t('Toplam')} {data.total} {t('ödeme')}</small>
          <Pagination page={data.page} pages={Math.min(Math.ceil(data.total / data.pageSize), 12)} onChange={(page) => set({ page })} />
        </div>
      )}
      {failing && (
        <ReasonModal
          title={t('Ödemeyi reddet: {0}', failing.userName)}
          message={t('{0} tutarındaki ödeme talebi reddedilecek; kullanıcıya bildirim gider.', fmtMoney(failing.amount, 'TRY', 0))}
          confirmText={t('Reddet')}
          pending={failPay.isPending}
          onClose={() => setFailing(null)}
          onConfirm={(reason) => failPay.mutate({ id: failing.id, reason })}
        />
      )}
      {refunding && (
        <ReasonModal
          title={t('İade: {0}', refunding.userName)}
          message={t('{0} tutarındaki ödeme iade olarak işaretlenecek. Manuel ödeme modunda geri ödemeyi bankadan ayrıca yapmanız gerekir.', fmtMoney(refunding.amount, 'TRY', 0))}
          confirmText={t('İade Et')}
          pending={refund.isPending}
          onClose={() => setRefunding(null)}
          onConfirm={(reason) => refund.mutate({ id: refunding.id, reason })}
        />
      )}
    </Card>
  )
}

export default function Billing() {
  const [tab, setTab] = useState('plans')
  return (
    <RequirePerm perm="billing.read">
      <Segmented options={[{ value: 'plans', label: t('Planlar & Gelir') }, { value: 'payments', label: t('Ödemeler') }]} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'plans' ? <Plans /> : <Payments />}
    </RequirePerm>
  )
}
