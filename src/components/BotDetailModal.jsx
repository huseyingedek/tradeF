import { useState } from 'react'
import Modal from './Modal'
import Segmented from './Segmented'
import { SideBadge, StatusBadge } from './Badges'
import { useBotDetail, useLookups } from '../api/queries'
import { fmtDateTime, fmtMoney, fmtNum, fmtPct, fmtQty, fmtSignedMoney, pnlClass, timeAgo } from '../utils/format'
import { t, tServer } from '../i18n'

// =====================================================================
//  BOT DETAYI – botun şu an ne tuttuğu, sıradaki hedefleri, alım-satım
//  geçmişi ve olay günlüğü. 5 sn'de bir yenilenir.
// =====================================================================

/** Hedefe uzaklık: güncel fiyattan yüzde fark */
const distPct = (target, price) => (target && price ? ((target - price) / price) * 100 : null)

/** "23 dk sonra" / "2 sa 5 dk sonra" / "şimdi" */
function untilText(ts) {
  const m = Math.ceil((ts - Date.now()) / 60000)
  if (m <= 0) return t('şimdi')
  const h = Math.floor(m / 60)
  return h ? t('{0} sa {1} dk sonra', h, m % 60) : t('{0} dk sonra', m)
}

function Stat({ label, children, className = '' }) {
  return (
    <div className="bot-detail-stat">
      <small>{label}</small>
      <span className={`num ${className}`}>{children}</span>
    </div>
  )
}

/** Hedef satırı: etiket · fiyat · güncel fiyata uzaklık */
function Target({ label, price, current, quote, hint }) {
  const d = distPct(price, current)
  return (
    <div className="bot-target">
      <div>
        <div className="fw-semibold">{label}</div>
        {hint && <div className="fs-12 text-muted">{hint}</div>}
      </div>
      {price != null && (
        <div className="text-end">
          <div className="num fw-semibold">{fmtMoney(price, quote, price < 1 ? 6 : 2)}</div>
          {d !== null && <div className="fs-12 text-muted num">{t('güncel fiyattan {0}', fmtPct(d))}</div>}
        </div>
      )}
    </div>
  )
}

function DcaView({ bot: b, view: v, quote, base }) {
  const c = b.config
  return (
    <>
      <p className="text-muted fs-13 mb-3">
        {t('Bot her {0} saatte bir {1} değerinde {2} alır (en fazla {3} alım). Ortalama maliyetin %{4} üstüne çıkınca elindekilerin hepsini satar ve baştan başlar.', c.intervalHours, fmtMoney(c.amount, quote), base, c.maxOrders, c.takeProfitPct)}
      </p>
      <div className="bot-detail-grid mb-3">
        <Stat label={t('Elindeki miktar')}>{fmtQty(v.qty)} {base}</Stat>
        <Stat label={t('Ortalama maliyet')}>{v.avgPrice ? fmtMoney(v.avgPrice, quote) : '–'}</Stat>
        <Stat label={t('Yapılan alım')}>{v.buys} / {v.maxOrders}</Stat>
        <Stat label={t('Kalan bütçe')}>{fmtMoney(v.budgetLeft, quote)}</Stat>
      </div>
      <Target
        label={t('Sıradaki alım')}
        price={null}
        hint={v.buys >= v.maxOrders || v.budgetLeft < c.amount ? t('Alım hakkı / bütçe doldu – kâr al hedefini bekliyor') : v.nextBuyAt ? untilText(v.nextBuyAt) : t('ilk adımda')}
      />
      <Target label={t('Kâr al (satış) hedefi')} price={v.takeProfitPrice} current={v.price} quote={quote} hint={v.qty ? t('Fiyat buraya ulaşınca tümü satılır') : t('Henüz alım yok')} />
    </>
  )
}

function GridView({ bot: b, view: v, quote, base }) {
  const c = b.config
  // yüksekten düşüğe: üstte satış seviyeleri, altta alış seviyeleri
  const rows = [...v.levels].reverse()
  const marker = rows.findIndex((r) => v.price != null && v.price >= r.buyPrice)
  return (
    <>
      <p className="text-muted fs-13 mb-3">
        {t('{0} – {1} aralığı {2} kademeye bölündü (her kademe {3}). Fiyat bir kademenin alış çizgisine inince {4} alır, bir üst çizgiye çıkınca satar.', fmtNum(c.lower), fmtNum(c.upper), c.grids, fmtMoney(v.perGrid, quote), fmtMoney(v.perGrid, quote))}
      </p>
      {v.inRange === false && <div className="alert alert-warning py-2 fs-13">{t('Fiyat aralığın dışında: bot, fiyat aralığa dönene kadar bekliyor.')}</div>}
      <div className="bot-detail-grid mb-3">
        <Stat label={t('Dolu kademe')}>{v.filledLevels} / {c.grids}</Stat>
        <Stat label={t('Elindeki miktar')}>{fmtQty(v.qty)} {base}</Stat>
        <Stat label={t('Kademe aralığı')}>{fmtMoney(v.step, quote)}</Stat>
        <Stat label={t('Güncel fiyat')}>{v.price ? fmtMoney(v.price, quote) : '–'}</Stat>
      </div>
      <div className="table-responsive">
        <table className="table table-trading mb-0">
          <thead>
            <tr><th>{t('Kademe')}</th><th className="text-end">{t('Alış')}</th><th className="text-end">{t('Satış')}</th><th>{t('Durum')}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.level} className={i === marker ? 'bot-grid-current' : ''}>
                <td>{r.level}</td>
                <td className="text-end num">{fmtNum(r.buyPrice)}</td>
                <td className="text-end num">{fmtNum(r.sellPrice)}</td>
                <td>
                  {r.holding ? (
                    <span className="chip green">{t('Dolu: {0} @ {1}', fmtQty(r.holding.qty), fmtNum(r.holding.price))}</span>
                  ) : (
                    <span className="text-muted fs-13">{t('Alış bekliyor')}</span>
                  )}
                  {i === marker && <span className="chip sky ms-1">{t('◀ fiyat burada')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TrailingView({ bot: b, view: v, quote, base }) {
  const c = b.config
  return (
    <>
      <p className="text-muted fs-13 mb-3">
        {t('Bot başta {0} alır ve en yüksek fiyatı takip eder. Fiyat zirveden %{1} düşerse{2} satar ve durur.', base, c.trailingPct, c.takeProfitPct ? t(' ya da alış fiyatının %{0} üstüne çıkarsa', c.takeProfitPct) : '')}
      </p>
      {v.done && <div className="alert alert-success py-2 fs-13">{t('Pozisyon kapatıldı – bot görevini tamamladı.')}</div>}
      <div className="bot-detail-grid mb-3">
        <Stat label={t('Elindeki miktar')}>{fmtQty(v.qty)} {base}</Stat>
        <Stat label={t('Alış fiyatı')}>{v.entryPrice ? fmtMoney(v.entryPrice, quote) : '–'}</Stat>
        <Stat label={t('Görülen zirve')}>{v.peak ? fmtMoney(v.peak, quote) : '–'}</Stat>
        <Stat label={t('Güncel fiyat')}>{v.price ? fmtMoney(v.price, quote) : '–'}</Stat>
      </div>
      {!v.done && v.qty > 0 && (
        <>
          <Target label={t('İz süren stop')} price={v.stopPrice} current={v.price} quote={quote} hint={t('Zirve yükseldikçe yukarı kayar; fiyat buraya düşerse satar')} />
          {v.takeProfitPrice && <Target label={t('Hedef kâr')} price={v.takeProfitPrice} current={v.price} quote={quote} hint={t('Fiyat buraya çıkarsa satar')} />}
        </>
      )}
    </>
  )
}

function OrdersTable({ orders, quote }) {
  if (!orders.length) return <div className="text-muted text-center py-4">{t('Bot henüz işlem yapmadı.')}</div>
  return (
    <div className="table-responsive">
      <table className="table table-trading mb-0">
        <thead>
          <tr>
            <th>{t('Zaman')}</th><th>{t('Yön')}</th><th className="text-end">{t('Miktar')}</th><th className="text-end">{t('Fiyat')}</th>
            <th className="text-end">{t('Tutar')}</th><th className="text-end">{t('Komisyon')}</th><th>{t('Durum')}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const qty = o.filledQty || o.qty
            return (
              <tr key={o.id}>
                <td className="text-nowrap fs-13">{fmtDateTime(o.filledAt || o.createdAt)}</td>
                <td><SideBadge side={o.side} /></td>
                <td className="text-end num">{fmtQty(qty)}</td>
                <td className="text-end num">{o.avgPrice ? fmtNum(o.avgPrice) : '–'}</td>
                <td className="text-end num">{o.avgPrice ? fmtMoney(qty * o.avgPrice, quote) : '–'}</td>
                <td className="text-end num">{o.fee ? fmtMoney(o.fee, quote, 4) : '–'}</td>
                <td>
                  <StatusBadge status={o.status} />
                  {o.reason && <div className="fs-12 text-muted">{tServer(o.reason)}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ActivityList({ items }) {
  if (!items.length) return <div className="text-muted text-center py-4">{t('Kayıt yok.')}</div>
  return (
    <ul className="bot-log list-unstyled mb-0">
      {items.map((a) => (
        <li key={a.id} className={`lvl-${a.level}`}>
          <span className="fs-12 text-muted text-nowrap" title={fmtDateTime(a.ts)}>{timeAgo(a.ts)}</span>
          <span>{tServer(a.message)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function BotDetailModal({ botId, onClose }) {
  const { data, isLoading, error } = useBotDetail(botId)
  const lk = useLookups()
  const [tab, setTab] = useState('state')
  const b = data?.bot
  const v = data?.view
  const ins = b ? lk.instrument[b.symbol] : null
  const quote = ins?.quote || 'USDT'
  const base = ins?.base || b?.symbol?.split('/')[0] || ''
  const View = b?.strategy === 'grid' ? GridView : b?.strategy === 'trailing' ? TrailingView : DcaView

  return (
    <Modal title={b ? `${b.name} · ${b.symbol}` : t('Bot detayı')} onClose={onClose} size="modal-lg">
      {isLoading && <div className="text-center py-5"><span className="spinner-border" /></div>}
      {error && <div className="alert alert-danger">{error.message}</div>}
      {b && v && (
        <>
          <div className="d-flex align-items-center gap-2 mb-3">
            <StatusBadge status={b.status} />
            {v.failures > 0 && <span className="chip red">{t('{0} başarısız deneme', v.failures)}</span>}
          </div>
          <div className="bot-detail-grid mb-4">
            <Stat label={t('Toplam K/Z')} className={pnlClass(b.pnl)}>{fmtSignedMoney(b.pnl, quote)}</Stat>
            <Stat label={t('Gerçekleşen kâr')} className={pnlClass(v.realized)}>{fmtSignedMoney(v.realized, quote)}</Stat>
            <Stat label={t('Açık pozisyon K/Z')} className={pnlClass(v.unrealized)}>{fmtSignedMoney(v.unrealized, quote)}</Stat>
            <Stat label={t('Ödenen komisyon')}>{fmtMoney(v.fees, quote, 2)}</Stat>
          </div>
          <Segmented
            options={[
              { value: 'state', label: t('Şu an ne yapıyor') },
              { value: 'orders', label: t('Alım-satımlar ({0})', data.orders.length) },
              { value: 'log', label: t('Günlük@@kayıt') },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="mt-3">
            {tab === 'state' && <View bot={b} view={v} quote={quote} base={base} />}
            {tab === 'orders' && <OrdersTable orders={data.orders} quote={quote} />}
            {tab === 'log' && <ActivityList items={data.activity} />}
          </div>
        </>
      )}
    </Modal>
  )
}
