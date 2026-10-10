import { t } from '../i18n'
/** Backend ile aynı şifre kuralı: en az 8 karakter, en az bir harf ve bir rakam */
export const passwordProblem = (pw = '') => {
  if (pw.length < 8) return t('Şifre en az 8 karakter olmalı')
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(pw) || !/\d/.test(pw)) return t('Şifre en az bir harf ve bir rakam içermeli')
  return null
}
