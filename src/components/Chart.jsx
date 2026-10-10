import ReactApexChart from 'react-apexcharts'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'

// ApexCharts sarmalayıcısı: tema renklerini otomatik uygular
export default function Chart({ options = {}, ...props }) {
  const { theme } = useApp()
  const dark = theme === 'dark'
  const axisColor = dark ? '#9a98ab' : '#7e7e8f'
  const merged = {
    ...options,
    chart: {
      fontFamily: 'Poppins, sans-serif',
      toolbar: { show: false },
      background: 'transparent',
      foreColor: axisColor,
      ...options.chart,
    },
    theme: { mode: dark ? 'dark' : 'light' },
    grid: { borderColor: dark ? '#2f2d3b' : '#ececf3', strokeDashArray: 0, ...options.grid },
    tooltip: { theme: dark ? 'dark' : 'light', ...options.tooltip },
  }
  return <ReactApexChart key={theme} options={merged} {...props} />
}
