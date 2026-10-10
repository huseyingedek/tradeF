import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/main.scss'
import App from './App'
import { AppProvider } from './context/AppContext'
import { queryClient } from './api/queries'
import { getLang, initI18n, onLangChange } from './i18n'

// Dil değişince uygulama yeni dilde baştan çizilir
function Root() {
  const [lang, setLang] = useState(getLang())
  useEffect(() => onLangChange(setLang), [])
  return <App key={lang} />
}

// kayıtlı dilin sözlüğü yüklendikten sonra çiz (ilk ekranda Türkçe yanıp sönmesin)
initI18n().finally(() => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <Root />
        </AppProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
))
