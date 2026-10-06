import { useState } from 'react'
import { FiPlus, FiRefreshCw, FiPause, FiPlay, FiTrash2, FiKey, FiCheckCircle, FiLock, FiAlertTriangle } from 'react-icons/fi'
import Card from '../components/Card'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { ExchangeLogo, MarketBadge, StatusBadge, MARKET_LABEL } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { useCreateExchange, useDeleteExchange, useLookups, usePortfolioSummary, useTestExchange, useUpdateExchange } from '../api/queries'
import { fmtMoney, timeAgo } from '../utils/format'
import { config } from '../api/config'
import ApiKeyGuide from '../components/trading/ApiKeyGuide'

const FEATURE_LABEL = { spot: 'Spot', futures: 'Vadeli', short: 'Açığa satış', oco: 'OCO', trailing: 'İz süren stop' }

/** Yeni bağlantı sihirbazı (3 adım) */
function ConnectWizard({ onClose }) {
  const lk = useLookups()
  const create = useCreateExchange({ error: false })
  const [step, setStep] = useState(1)
  const [market, setMarket] = useState('all')
  const [provider, setProvider] = useState(null)
  const [label, setLabel] = useState('')
  const [creds, setCreds] = useState({})
  const [testnet, setTestnet] = useState(false)
  const [mode, setMode] = useState('paper')
  const [paperBalance, setPaperBalance] = useState(10000)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const choose = (p) => {
    setProvider(p)
    setLabel(`${p.name} Hesabım`)
    setCreds({})
    setMode('paper')
    setError(null)
    setStep(2)
  }
  const submit = () => {
    setError(null)
    const hasKeys = provider.fields.some((f) => String(creds[f.key] || '').trim())
    if (mode === 'live' && !hasKeys) return setError('Canlı işlem için API anahtarları gerekli')
    create.mutate({ provider: provider.id, label, credentials: hasKeys ? creds : undefined, testnet, mode, paperBalance: mode === 'paper' ? +paperBalance : undefined }, { onSuccess: (c) => { setDone(c); setStep(3) }, onError: (e) => setError(e.message) })
  }

  return (
    <Modal
      title="Borsa / Aracı Kurum Bağla"
      size="modal-lg"
      onClose={onClose}
      onSubmit={step === 2 ? submit : undefined}
      footer={
        step === 2 ? (
          <>
            <button type="button" className="btn btn-soft me-auto" onClick={() => setStep(1)}>← Geri</button>
            <button className="btn btn-primary" disabled={create.isPending}>{create.isPending ? 'Bağlanıyor…' : mode === 'paper' && !provider.fields.some((f) => creds[f.key]) ? 'Sanal Hesap Oluştur' : 'Test Et ve Bağla'}</button>
          </>
        ) : step === 3 ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>Tamam</button>
        ) : null
      }
    >
      <div className="wizard-steps mb-4">
        {['Platform', 'Hesap Ayarları', 'Tamamlandı'].map((s, i) => (
          <div key={s} className={`ws ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}><span>{i + 1}</span>{s}</div>
        ))}
      </div>

      {step === 1 && (
        <>
          <Segmented
            options={[{ value: 'all', label: 'Tümü' }, ...Object.entries(MARKET_LABEL).map(([value, label]) => ({ value, label }))]}
            value={market}
            onChange={setMarket}
            className="mb-3"
          />
          <div className="row g-3">
            {lk.providers.filter((p) => market === 'all' || p.market === market).map((p) => (
              <div className="col-md-4 col-sm-6" key={p.id}>
                <button type="button" className="provider-card" onClick={() => choose(p)}>
                  <ExchangeLogo provider={p} size={44} />
                  <div className="fw-semibold mt-2">{p.name}</div>
                  <MarketBadge market={p.market} />
                  <div className="fs-12 text-muted mt-2">{Object.entries(p.features).filter(([, v]) => v).map(([k]) => FEATURE_LABEL[k]).join(' · ')}</div>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && provider && (
        <>
          <div className="d-flex align-items-center gap-3 mb-3">
            <ExchangeLogo provider={provider} size={44} />
            <div>
              <div className="fw-semibold">{provider.name}</div>
              <MarketBadge market={provider.market} />
            </div>
          </div>
          <label className="form-label">İşlem modu</label>
          <div className="row g-2 mb-3">
            <div className="col-sm-6">
              <button type="button" className={`plan-pick ${mode === 'paper' ? 'active' : ''}`} onClick={() => setMode('paper')}>
                <div className="fw-semibold">Paper (sanal)</div>
                <div className="fs-13 text-muted">Gerçek fiyatlarla sanal bakiye. Gerçek emir gönderilmez, risk yok.</div>
              </button>
            </div>
            <div className="col-sm-6">
              <button type="button" className={`plan-pick ${mode === 'live' ? 'active' : ''}`} disabled={!provider.liveSupported} onClick={() => setMode('live')} style={provider.liveSupported ? undefined : { opacity: 0.55, cursor: 'not-allowed' }}>
                <div className="fw-semibold">Canlı</div>
                <div className="fs-13 text-muted">{provider.liveSupported ? 'Emirler borsaya gerçek olarak iletilir.' : provider.live ? 'Sunucuda canlı işlem kapalı (yönetici etkinleştirmeli).' : provider.note || 'Bu platform için canlı işlem henüz desteklenmiyor.'}</div>
              </button>
            </div>
          </div>
          {mode === 'paper' && (
            <div className="mb-3">
              <label className="form-label">Başlangıç sanal bakiyesi (USD karşılığı)</label>
              <input type="number" min={100} max={1000000} step={100} className="form-control" value={paperBalance} onChange={(e) => setPaperBalance(e.target.value)} />
              <div className="form-help">100 – 1.000.000 USD arası. Hesabın para birimine ({provider.market === 'bist' ? 'TRY' : provider.market === 'forex' ? 'USD' : 'USDT'}) güncel kurla çevrilir.</div>
            </div>
          )}
          <div className="alert alert-info d-flex gap-2 fs-13">
            <FiLock className="flex-shrink-0 mt-1" />
            <div>
              API anahtarınızı oluştururken yalnızca <strong>okuma</strong> ve <strong>işlem</strong> izinlerini verin. <strong>Para çekme iznini asla açmayın.</strong> Mümkünse IP kısıtlaması ekleyin. Anahtarlar sunucuda şifrelenerek saklanır ve tekrar gösterilmez.
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Hesap adı</label>
            <input className="form-control" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <ApiKeyGuide provider={provider} />
          {mode === 'paper' && <div className="form-help mb-2">Paper modda API anahtarı <strong>isteğe bağlı</strong>. Girerseniz bağlantı doğrulanır; boş bırakırsanız anahtarsız sanal hesap açılır.</div>}
          {provider.fields.map((f) => (
            <div className="mb-3" key={f.key}>
              <label className="form-label">{f.label}{mode === 'paper' && <span className="text-muted fw-normal"> (isteğe bağlı)</span>}</label>
              <input type={f.type} className="form-control" autoComplete="off" value={creds[f.key] || ''} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} />
            </div>
          ))}
          <div className="form-check mb-2">
            <input id="testnet" type="checkbox" className="form-check-input" checked={testnet} onChange={(e) => setTestnet(e.target.checked)} />
            <label htmlFor="testnet" className="form-check-label">Test ağı / demo hesap</label>
          </div>
          {error && <div className="alert alert-danger d-flex gap-2 py-2 fs-13 mt-3"><FiAlertTriangle className="flex-shrink-0 mt-1" />{error}</div>}
          {config.useMock && <div className="form-help">Demo modda en az 8 karakterlik herhangi bir anahtar kabul edilir; içinde "fail" geçerse test başarısız olur.</div>}
        </>
      )}

      {step === 3 && done && (
        <div className="text-center py-4">
          <FiCheckCircle size={56} className="text-up mb-3" />
          <h5>{done.label} bağlandı</h5>
          <p className="text-muted">{done.mode === 'live' ? 'Canlı hesap' : 'Paper (sanal) hesap'}{done.latencyMs ? ` · Gecikme ${done.latencyMs} ms` : ''} · İzinler: {done.permissions.join(', ')}</p>
          {done.errorMessage && <div className="alert alert-warning fs-13 py-2">{done.errorMessage}</div>}
        </div>
      )}
    </Modal>
  )
}

function KeysModal({ exchange, provider, onClose }) {
  const update = useUpdateExchange({ success: null })
  const [creds, setCreds] = useState({})
  return (
    <Modal
      title={`${exchange.label} · API anahtarlarını yenile`}
      onClose={onClose}
      onSubmit={() => update.mutate({ id: exchange.id, credentials: creds }, { onSuccess: onClose })}
      footer={<><button type="button" className="btn btn-soft" onClick={onClose}>Vazgeç</button><button className="btn btn-primary" disabled={update.isPending}>Kaydet ve Test Et</button></>}
    >
      <ApiKeyGuide provider={provider} />
      {provider.fields.map((f) => (
        <div className="mb-3" key={f.key}>
          <label className="form-label">{f.label}</label>
          <input type={f.type} className="form-control" autoComplete="off" value={creds[f.key] || ''} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} />
        </div>
      ))}
    </Modal>
  )
}

export default function Exchanges() {
  const lk = useLookups()
  const { data: summary } = usePortfolioSummary()
  const test = useTestExchange()
  const update = useUpdateExchange()
  const del = useDeleteExchange()
  const { confirm, toast } = useApp()
  const [wizard, setWizard] = useState(false)
  const [keysFor, setKeysFor] = useState(null)
  const value = Object.fromEntries((summary?.byExchange || []).map((e) => [e.exchangeId, e.value]))

  const runTest = (e) =>
    test.mutate(e.id, { onSuccess: (r) => !r.ok && toast(`${e.label}: ${r.message}`, 'danger') })

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h4 className="mb-1" style={{ fontSize: '1.15rem' }}>{lk.exchanges.length} bağlı hesap</h4>
          <small className="text-muted">Kripto borsaları, BIST aracı kurumları ve forex hesaplarını tek yerden yönetin.</small>
        </div>
        <button className="btn btn-primary" onClick={() => setWizard(true)}><FiPlus /> Hesap Bağla</button>
      </div>

      <div className="row g-4 mb-4">
        {lk.exchanges.map((e) => {
          const p = lk.provider[e.provider]
          const status = e.status === 'connected' && e.paused ? 'paused' : e.status
          return (
            <div className="col-xxl-4 col-md-6" key={e.id}>
              <div className={`hn-card ex-card h-100 mb-0 ${e.status === 'error' ? 'has-error' : ''}`}>
                <div className="d-flex align-items-center gap-3">
                  <ExchangeLogo provider={p} size={48} />
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold fs-6 text-truncate">{e.label}</div>
                    <div className="fs-13 text-muted">{p?.name}{e.testnet && ' · Test ağı'}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                {e.status === 'error' && <div className="alert alert-danger py-2 fs-13 mt-3 mb-0">{e.errorMessage}</div>}
                <div className="bot-stats mt-3">
                  <div><small>Değer</small><span className="num">{fmtMoney(value[e.id] || 0, 'USD', 0)}</span></div>
                  <div><small>Gecikme</small><span>{e.latencyMs ? `${e.latencyMs} ms` : '–'}</span></div>
                  <div><small>Son senk.</small><span>{e.lastSyncAt ? timeAgo(e.lastSyncAt) : '–'}</span></div>
                </div>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  <MarketBadge market={e.market} />
                  {e.mode && <span className={`chip ${e.mode === 'live' ? 'red' : 'sky'}`}>{e.mode === 'live' ? 'Canlı' : 'Paper'}</span>}
                  {e.permissions?.map((x) => <span key={x} className="chip gray">{x}</span>)}
                  <span className="chip gray"><FiKey /> {e.apiKeyMasked}</span>
                </div>
                <div className="d-flex gap-2 mt-auto flex-wrap">
                  <button className="btn btn-sm btn-soft" onClick={() => runTest(e)} disabled={test.isPending}><FiRefreshCw /> Test Et</button>
                  <button className="btn btn-sm btn-soft" onClick={() => setKeysFor(e)}><FiKey /> Anahtarlar</button>
                  <button
                    className={`btn btn-sm ${e.paused ? 'btn-success' : 'btn-outline-warning'}`}
                    onClick={() => update.mutate({ id: e.id, paused: !e.paused }, { onSuccess: () => toast(`${e.label} ${e.paused ? 'aktif' : 'duraklatıldı'}`, e.paused ? 'success' : 'warning') })}
                  >
                    {e.paused ? <><FiPlay /> Devam</> : <><FiPause /> Duraklat</>}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={async () => (await confirm({ title: 'Bağlantıyı kaldır', message: `${e.label} bağlantısı silinecek. Açık emirleri iptal edilir, botları durdurulur.`, confirmText: 'Kaldır', variant: 'danger' })) && del.mutate(e.id)}
                    aria-label="Kaldır"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        <div className="col-xxl-4 col-md-6">
          <button className="hn-card add-card h-100 w-100 mb-0" onClick={() => setWizard(true)}>
            <FiPlus size={28} />
            <div className="fw-semibold mt-2">Yeni hesap bağla</div>
            <div className="fs-13 text-muted">Binance, Bybit, OKX, BIST aracı kurumu, OANDA…</div>
          </button>
        </div>
      </div>

      <Card title="Desteklenen Platformlar" bodyClass="px-0 pb-2">
        <div className="table-responsive">
          <table className="table table-trading">
            <thead>
              <tr><th className="ps-4">Platform</th><th>Piyasa</th>{Object.values(FEATURE_LABEL).map((l) => <th key={l} className="text-center">{l}</th>)}</tr>
            </thead>
            <tbody>
              {lk.providers.map((p) => (
                <tr key={p.id}>
                  <td className="ps-4"><span className="d-inline-flex align-items-center gap-2"><ExchangeLogo provider={p} size={26} /> {p.name}</span></td>
                  <td><MarketBadge market={p.market} /></td>
                  {Object.keys(FEATURE_LABEL).map((k) => <td key={k} className="text-center">{p.features[k] ? <FiCheckCircle className="text-up" /> : <span className="text-muted">–</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {wizard && <ConnectWizard onClose={() => setWizard(false)} />}
      {keysFor && <KeysModal exchange={keysFor} provider={lk.provider[keysFor.provider]} onClose={() => setKeysFor(null)} />}
    </>
  )
}
