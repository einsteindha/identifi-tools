export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { calc, ...p } = req.body;

  switch (calc) {
    case 'run':     return doBacktest(p, res);
    case 'stats':   return doStats(p, res);
    default:        return res.status(400).json({ error: 'invalid calc' });
  }
}

// 포트폴리오 백테스트 실행
function doBacktest(p, res) {
  const {
    returns = [],          // [{date, assets: {ticker: returnRate}}]
    weights = {},          // {ticker: weight}  (합계 1.0)
    rebalance = 'annual',  // 'annual' | 'quarterly' | 'monthly' | 'none'
    initialValue = 10000000,
  } = p;

  if (!returns.length) return res.status(400).json({ error: 'returns required' });

  const tickers = Object.keys(weights);
  let portfolio = initialValue;
  const series = [{ date: returns[0].date, value: portfolio }];
  let holdingWeights = { ...weights };

  returns.forEach((row, i) => {
    if (i === 0) return;

    // 자산별 수익 적용
    let newTotal = 0;
    tickers.forEach(t => {
      const r = (row.assets?.[t] ?? 0);
      const prev = portfolio * (holdingWeights[t] ?? 0);
      newTotal += prev * (1 + r);
    });
    portfolio = newTotal;
    series.push({ date: row.date, value: Math.round(portfolio) });

    // 리밸런싱
    const month = new Date(row.date).getMonth();
    const doRebal = rebalance === 'monthly'
      || (rebalance === 'quarterly' && month % 3 === 0)
      || (rebalance === 'annual' && month === 0);

    if (doRebal) holdingWeights = { ...weights };
    else {
      // 드리프트 계산
      tickers.forEach(t => {
        const r = (row.assets?.[t] ?? 0);
        holdingWeights[t] = ((holdingWeights[t] ?? 0) * (1 + r) * portfolio) / portfolio;
      });
    }
  });

  const stats = calcStats(series, initialValue);
  return res.json({ series, stats });
}

// 통계만 계산 (이미 계산된 시리즈 입력)
function doStats(p, res) {
  const { series = [], initialValue = 10000000 } = p;
  if (series.length < 2) return res.status(400).json({ error: 'series too short' });
  return res.json({ stats: calcStats(series, initialValue) });
}

function calcStats(series, initialValue) {
  const values = series.map(s => s.value);
  const n = values.length;
  const final = values[n - 1];

  // CAGR (연 복리 수익률)
  const years = n / 12;
  const cagr = years > 0 ? (Math.pow(final / initialValue, 1 / years) - 1) : 0;

  // MDD (최대 낙폭)
  let peak = values[0];
  let mdd = 0;
  values.forEach(v => {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < mdd) mdd = dd;
  });

  // 월 수익률 배열
  const monthlyReturns = [];
  for (let i = 1; i < n; i++) {
    monthlyReturns.push(values[i] / values[i - 1] - 1);
  }

  // 변동성 (연환산)
  const mean = monthlyReturns.reduce((a, b) => a + b, 0) / monthlyReturns.length;
  const variance = monthlyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / monthlyReturns.length;
  const volatility = Math.sqrt(variance * 12);

  // Sharpe (무위험이율 3%)
  const rf = 0.03 / 12;
  const excessMean = mean - rf;
  const sharpe = volatility > 0 ? (excessMean * Math.sqrt(12)) / Math.sqrt(variance * 12) : 0;

  // 양호 월 비율
  const positiveMonths = monthlyReturns.filter(r => r > 0).length;

  return {
    cagr: +cagr.toFixed(4),
    mdd: +mdd.toFixed(4),
    volatility: +volatility.toFixed(4),
    sharpe: +sharpe.toFixed(2),
    totalReturn: +((final / initialValue - 1)).toFixed(4),
    positiveMonthRatio: +(positiveMonths / monthlyReturns.length).toFixed(3),
    finalValue: Math.round(final),
  };
}
