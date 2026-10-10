// React'in JSX çalışma zamanı + otomatik çeviri.
// vite.config.js → react({ jsxImportSource: '/src/i18n' }) ile bütün .jsx dosyaları buradan geçer.
import * as R from 'react/jsx-runtime'
import { tProps } from './translateProps'

export const Fragment = R.Fragment
export const jsx = (type, props, key) => R.jsx(type, tProps(type, props), key)
export const jsxs = (type, props, key) => R.jsxs(type, tProps(type, props), key)
