// Gerçek (live) / sanal (paper) görünüm seçimi.
// Kullanıcının hem gerçek hem sanal hesabı varsa seçimi hatırlar; tek türü varsa o tür gösterilir.
import { useApp } from '../context/AppContext'
import { usePortfolioSummary } from '../api/queries'
import { t } from '../i18n'

export const MODE_LABEL = { live: t('Gerçek'), paper: t('Sanal') }

export function usePortfolioMode() {
  const { viewMode, setViewMode } = useApp()
  const { data: auto } = usePortfolioSummary()
  const both = !!(auto?.hasLive && auto?.hasPaper)
  const mode = both && viewMode ? viewMode : auto?.mode
  return { mode, both, setMode: setViewMode, ready: !!auto }
}
