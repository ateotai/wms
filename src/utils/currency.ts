// Utilidades para formateo de moneda global según configuración
export type Currency = 'MXN' | 'USD' | 'EUR';

export const getCurrencyFromSettings = (): Currency => {
  try {
    const c = (localStorage.getItem('system_currency') as Currency) || 'MXN';
    if (c === 'MXN' || c === 'USD' || c === 'EUR') return c;
    return 'MXN';
  } catch {
    return 'MXN';
  }
};

export const getCurrencyLocale = (c: Currency): string => {
  return { MXN: 'es-MX', USD: 'en-US', EUR: 'es-ES' }[c];
};

export const getCurrencyCode = (c: Currency): string => {
  return { MXN: 'MXN', USD: 'USD', EUR: 'EUR' }[c];
};

export const formatCurrency = (amount: number, currencyOverride?: Currency): string => {
  const c = currencyOverride || getCurrencyFromSettings();
  return new Intl.NumberFormat(getCurrencyLocale(c), {
    style: 'currency',
    currency: getCurrencyCode(c)
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number, currencyOverride?: Currency): string => {
  const c = currencyOverride || getCurrencyFromSettings();
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: getCurrencyCode(c),
    notation: amount >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: amount >= 1000 ? 1 : 0
  };
  return new Intl.NumberFormat(getCurrencyLocale(c), options).format(amount);
};