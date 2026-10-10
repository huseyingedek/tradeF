import * as R from 'react/jsx-dev-runtime'
import { tProps } from './translateProps'

export const Fragment = R.Fragment
export const jsxDEV = (type, props, key, isStatic, source, self) => R.jsxDEV(type, tProps(type, props), key, isStatic, source, self)
