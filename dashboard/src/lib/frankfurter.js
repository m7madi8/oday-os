const API = 'https://api.frankfurter.dev/v2';

const CODE = {
  usd: 'USD',
  ils: 'ILS',
  jod: 'JOD',
};

export function exchangeLabels(currency) {
  if (currency === 'usd') {
    return { primary: 'شيكل / دولار', secondary: 'دينار / دولار' };
  }
  if (currency === 'jod') {
    return { primary: 'دولار / دينار', secondary: 'شيكل / دينار' };
  }
  return { primary: 'دولار / شيكل', secondary: 'دينار / شيكل' };
}

function pairsFor(currency) {
  if (currency === 'usd') {
    return [
      { from: 'ILS', to: 'USD' },
      { from: 'JOD', to: 'USD' },
    ];
  }
  if (currency === 'jod') {
    return [
      { from: 'USD', to: 'JOD' },
      { from: 'ILS', to: 'JOD' },
    ];
  }
  return [
    { from: 'USD', to: 'ILS' },
    { from: 'JOD', to: 'ILS' },
  ];
}

function formatRate(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
}

async function latestPair(from, to) {
  const url = `${API}/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`frankfurter ${response.status}`);
  const data = await response.json();
  if (typeof data?.rate !== 'number') throw new Error('frankfurter empty');
  return { value: data.rate, date: data.date };
}

export async function fetchOfficeRates(paymentCurrency) {
  const base = CODE[paymentCurrency] ? paymentCurrency : 'ils';
  const [primaryPair, secondaryPair] = pairsFor(base);
  const [primary, secondary] = await Promise.all([
    latestPair(primaryPair.from, primaryPair.to),
    latestPair(secondaryPair.from, secondaryPair.to),
  ]);

  return {
    primary: formatRate(primary.value),
    secondary: formatRate(secondary.value),
    date: primary.date || secondary.date,
    updatedAt: Date.now(),
    unsupportedBase: false,
  };
}
