export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tab, saveRate, spendRate, targetYrs, retRate, incRate, infRate, initMult } = req.body;

  function rR(ret, inf) { return (1 + ret) / (1 + inf) - 1; }

  function sim(n, sr, sp, ret, inc, inf, initW) {
    let w = (initW || 0), income = 1;
    for (let y = 1; y <= n; y++) {
      w = w * (1 + ret) + income * sr;
      income *= (1 + inc);
    }
    const rr  = rR(ret, inf);
    const wR  = w / Math.pow(1 + inf, n);
    const spR = income * sp / Math.pow(1 + inf, n);
    const nd  = rr > 0 ? spR / rr : Infinity;
    return { wReal: wR, spendReal: spR, needed: nd };
  }

  const rr = rR(retRate, infRate);

  if (tab === 1) {
    const MAX = 100;
    const data = [];
    let retireYear = null;

    for (let y = 1; y <= MAX; y++) {
      const { wReal, needed } = sim(y, saveRate, spendRate, retRate, incRate, infRate, initMult);
      data.push({ wReal, needed });
      if (retireYear === null && isFinite(needed) && wReal >= needed) retireYear = y;
    }

    const yr = retireYear || MAX;
    const { spendReal, needed: neededVal } = sim(yr, saveRate, spendRate, retRate, incRate, infRate, initMult);

    return res.json({
      rr,
      retireYear,
      spendPct: spendReal * 100,
      neededVal,
      chartLabels: data.map((_, i) => (i + 1) + '년'),
      chartWData:  data.map(d => +d.wReal.toFixed(3)),
      chartNData:  data.map(d => d.needed === Infinity ? null : +d.needed.toFixed(3))
    });
  }

  if (tab === 2) {
    const maxSave = 1 - spendRate - 0.01;
    const saveSteps = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];
    const MAX = 100;

    function canRetire(s) {
      if (s <= 0 || s > maxSave) return false;
      const { wReal, needed } = sim(targetYrs, s, spendRate, retRate, incRate, infRate, initMult);
      return isFinite(needed) && wReal >= needed;
    }

    const retireYears = saveSteps.map(sr => {
      if (rr <= 0 || sr > maxSave) return null;
      for (let y = 1; y <= MAX; y++) {
        const { wReal, needed } = sim(y, sr, spendRate, retRate, incRate, infRate, initMult);
        if (isFinite(needed) && wReal >= needed) return y;
      }
      return null;
    });

    if (rr <= 0 || spendRate >= 1 || !canRetire(maxSave)) {
      return res.json({ rr, impossible: true, maxSavePct: Math.round(maxSave * 100), retireYears });
    }

    let lo = 0.001, hi = maxSave, found = maxSave;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (canRetire(mid)) { found = mid; hi = mid; } else lo = mid;
    }

    const { spendReal, needed } = sim(targetYrs, found, spendRate, retRate, incRate, infRate, initMult);

    return res.json({
      rr,
      impossible: false,
      found,
      spendPct: spendReal * 100,
      needed,
      restPct: Math.round(100 - found * 100 - spendRate * 100),
      maxSavePct: Math.round(maxSave * 100),
      retireYears
    });
  }

  res.status(400).json({ error: 'invalid tab' });
}
