function _getLoanEnd(card) {
  if ((card.loanEndMode || 'term') === 'term') {
    const sY = card.loanStartY || (new Date().getFullYear() - 3);
    const sM = card.loanStartM || 1;
    return { endY: sY + (card.loanTerm || 30), endM: sM };
  }
  return { endY: card.loanEndY || (new Date().getFullYear() + 27), endM: card.loanEndM || 1 };
}

function remainingLoanBal(curBal, annualRatePct, startY, startM, endY, endM, futureMonths) {
  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth() + 1;
  const totalM = (endY - startY) * 12 + (endM - startM);
  const elapsed = (nowY - startY) * 12 + (nowM - startM);
  const remNow = Math.max(1, totalM - elapsed);
  const n = Math.min(Math.round(futureMonths), remNow);
  if (curBal <= 0) return 0;
  if (n <= 0) return curBal;
  const mr = annualRatePct / 100 / 12;
  if (mr === 0) return Math.max(0, curBal * (1 - n / remNow));
  const pmt = curBal * mr * Math.pow(1 + mr, remNow) / (Math.pow(1 + mr, remNow) - 1);
  const factor = Math.pow(1 + mr, n);
  return Math.max(0, curBal * factor - pmt * (factor - 1) / mr);
}

function calcDet(initAsset, monthly, years, nomRet, inflation, goalNow, incomeGrowth, startYear, savingMode, savingTiming) {
  startYear = startYear || 0; savingMode = savingMode || 'monthly'; savingTiming = savingTiming || 'end';
  const totalYears = startYear + years;
  const mr = nomRet / 12, goalFV = goalNow * Math.pow(1 + inflation, totalYears);
  let asset = initAsset, contrib = initAsset, curSaving = monthly;
  const yearData = [];
  for (let y = 1; y <= totalYears; y++) {
    const saving = y > startYear;
    if (savingMode === 'annual') {
      if (savingTiming === 'start' && saving) { asset += curSaving; contrib += curSaving; }
      for (let m = 0; m < 12; m++) asset = asset * (1 + mr);
      if (savingTiming !== 'start' && saving) { asset += curSaving; contrib += curSaving; }
      if (saving) curSaving *= (1 + incomeGrowth);
    } else {
      for (let m = 0; m < 12; m++) asset = asset * (1 + mr) + (saving ? curSaving : 0);
      if (saving) { contrib += curSaving * 12; curSaving *= (1 + incomeGrowth); }
    }
    yearData.push({ year: y, asset, contrib, gain: asset - contrib, goalFV: goalNow * Math.pow(1 + inflation, y), achievePct: asset / (goalNow * Math.pow(1 + inflation, y)) * 100 });
  }
  let needed;
  if (savingMode === 'annual') {
    const ear = Math.pow(1 + mr, 12);
    const assetAtStart = initAsset * Math.pow(ear, startYear);
    const fac = years > 0 ? (savingTiming === 'start' ? ear * (Math.pow(ear, years) - 1) / (ear - 1) : (Math.pow(ear, years) - 1) / (ear - 1)) : 1;
    needed = (goalFV - assetAtStart * Math.pow(ear, years)) / fac;
  } else {
    const r = mr, n = years * 12;
    const assetAtStart = initAsset * Math.pow(1 + r, startYear * 12);
    const fac = n > 0 ? (Math.pow(1 + r, n) - 1) / r * (1 + r) : 1;
    needed = (goalFV - assetAtStart * Math.pow(1 + r, n)) / fac;
  }
  return { yearData, finalAsset: asset, goalFV, surplus: asset - goalFV, achieved: asset >= goalFV, neededMonthly: needed };
}

function calcMC(initAsset, monthly, years, nomRet, inflation, goalNow, stdDev, runs, incomeGrowth, startYear, savingMode, savingTiming) {
  startYear = startYear || 0; savingMode = savingMode || 'monthly'; savingTiming = savingTiming || 'end';
  const totalYears = startYear + years;
  const mm = nomRet / 12, ms = stdDev / Math.sqrt(12);
  const goalFV = goalNow * Math.pow(1 + inflation, totalYears), n = totalYears * 12;
  const startMonth = startYear * 12;
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const finals = [], paths = [];
  const sample = Math.min(runs, 300);
  for (let i = 0; i < runs; i++) {
    let a = initAsset, cm = monthly;
    const p = i < sample ? [initAsset] : null;
    if (savingMode === 'annual') {
      for (let m = 0; m < n; m++) {
        const saving = m >= startMonth;
        const miy = saving ? (m - startMonth) % 12 : -1;
        if (savingTiming === 'start' && saving && miy === 0) a += cm;
        a = a * (1 + mm + ms * randn());
        if (savingTiming !== 'start' && saving && miy === 11) a += cm;
        if (saving && miy === 11) cm *= (1 + incomeGrowth);
        if (p && (m + 1) % 12 === 0) p.push(a);
      }
    } else {
      for (let m = 0; m < n; m++) {
        const saving = m >= startMonth;
        a = a * (1 + mm + ms * randn()) + (saving ? cm : 0);
        if (saving && (m - startMonth + 1) % 12 === 0) cm *= (1 + incomeGrowth);
        if (p && (m + 1) % 12 === 0) p.push(a);
      }
    }
    finals.push(a); if (p) paths.push(p);
  }
  finals.sort((a, b) => a - b);
  paths.sort((a, b) => a[a.length - 1] - b[b.length - 1]);
  const pct = pp => finals[Math.min(finals.length - 1, Math.floor(pp * runs / 100))];
  const mn = finals[0], mx = finals[finals.length - 1], bins = 40, bw = (mx - mn) / bins;
  const hist = Array(bins).fill(0);
  finals.forEach(v => hist[Math.min(bins - 1, Math.floor((v - mn) / bw))]++);
  const successCount = finals.filter(v => v >= goalFV).length;
  return {
    successRate: successCount / runs * 100, successCount, runs,
    pct10: pct(10), pct50: pct(50), pct90: pct(90),
    path10: paths[Math.floor(paths.length * .1)] || [],
    path50: paths[Math.floor(paths.length * .5)] || [],
    path90: paths[Math.floor(paths.length * .9)] || [],
    hist, histLabels: Array.from({ length: bins }, (_, i) => (mn + bw * (i + .5)) / 10000),
    goalFV, bw, mn
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { cards } = req.body;
  if (!cards || !Array.isArray(cards)) return res.status(400).json({ error: 'cards required' });

  const RUNS = 3000;
  const results = {};

  for (const card of cards) {
    if (card.type === 'retire') continue;
    const cardRet = (card.nomRet || 6) / 100;
    const cardInf = (card.inflation || 2.5) / 100;
    const cardStd = (card.stdDev || 10) / 100;
    const cardGrowth = card.monthlyGrowth ? (card.monthlyGrowthRate || 2) / 100 : 0;

    let det, mc, houseEquityByYear = null;

    if (card.type === 'housing') {
      const hp = card.housePrice || card.amount || 80000;
      const pr = (card.priceRise || 3) / 100;
      const cardStartYear = card.startYear || 0;
      const totalYears = cardStartYear + card.years;
      const futureHP = Math.round(hp * Math.pow(1 + pr, totalYears) / 100) * 100;
      det = calcDet(card.initAsset, card.monthly, card.years, cardRet, 0, futureHP, cardGrowth, cardStartYear, card.savingMode || 'monthly', card.savingTiming || 'end');
      mc = calcMC(card.initAsset, card.monthly, card.years, cardRet, 0, futureHP, cardStd, RUNS, cardGrowth, cardStartYear, card.savingMode || 'monthly', card.savingTiming || 'end');
    } else if (card.type === 'upgrade') {
      const cardStartYear = card.startYear || 0;
      const totalYears = cardStartYear + card.years;
      const totalMonths = totalYears * 12;
      const futureCurHP = Math.round((card.curHousePrice || 50000) * Math.pow(1 + (card.curPriceRise || 3) / 100, totalYears) / 100) * 100;
      const futureTargetHP = Math.round((card.targetHousePrice || 80000) * Math.pow(1 + (card.targetPriceRise || 3) / 100, totalYears) / 100) * 100;
      const _le = _getLoanEnd(card);
      const remBal = (card.loanBalance || 0) > 0
        ? remainingLoanBal(card.loanBalance, card.loanRate || 4, card.loanStartY || (new Date().getFullYear() - 3), card.loanStartM || 1, _le.endY, _le.endM, totalMonths)
        : 0;
      const saleProceeds = Math.max(0, futureCurHP - remBal);
      const gap = Math.max(0, futureTargetHP - saleProceeds);
      const savDet = calcDet(card.initAsset || 0, card.monthly || 100, card.years, cardRet, 0, gap, cardGrowth, cardStartYear, card.savingMode || 'monthly', card.savingTiming || 'end');
      const savingsAccumulated = savDet.finalAsset;
      const totalSelf = savingsAccumulated + saleProceeds;
      const loanNeeded = Math.max(0, futureTargetHP - totalSelf);
      det = { ...savDet, finalAsset: totalSelf, goalFV: futureTargetHP, achieved: totalSelf >= futureTargetHP, surplus: totalSelf - futureTargetHP, saleProceeds, remainBal: remBal, futureCurHP, futureTargetHP, savingsAccumulated, loanNeeded };
      mc = calcMC(card.initAsset || 0, card.monthly || 100, card.years, cardRet, 0, gap, cardStd, RUNS, cardGrowth, cardStartYear, card.savingMode || 'monthly', card.savingTiming || 'end');

      // Pre-compute housing equity by year for timeline/panel charts
      const chp = card.curHousePrice || 50000;
      const cpr = (card.curPriceRise || 3) / 100;
      const clb = card.loanBalance || 0;
      const clr = card.loanRate || 4;
      const lsY = card.loanStartY || (new Date().getFullYear() - 3);
      const lsM = card.loanStartM || 1;
      houseEquityByYear = [];
      for (let i = 0; i <= totalYears; i++) {
        const hpY = Math.round(chp * Math.pow(1 + cpr, i) / 100) * 100;
        const rb = clb > 0 ? remainingLoanBal(clb, clr, lsY, lsM, _le.endY, _le.endM, i * 12) : 0;
        houseEquityByYear.push(Math.max(0, hpY - rb));
      }
    } else {
      det = calcDet(card.initAsset, card.monthly, card.years, cardRet, cardInf, card.amount, cardGrowth, card.startYear || 0, card.savingMode || 'monthly', card.savingTiming || 'end');
      mc = calcMC(card.initAsset, card.monthly, card.years, cardRet, cardInf, card.amount, cardStd, RUNS, cardGrowth, card.startYear || 0, card.savingMode || 'monthly', card.savingTiming || 'end');
    }

    results[card.id] = { det, mc, houseEquityByYear };
  }

  res.json({ results });
};
