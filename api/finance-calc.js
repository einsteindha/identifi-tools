export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { calc, ...p } = req.body;
  switch (calc) {
    case 'loan':     return doLoan(p, res);
    case 'savings':  return doSavings(p, res);
    case 'invest':   return doInvest(p, res);
    case 'irr':      return doIrr(p, res);
    case 'retire':   return doRetire(p, res);
    case 'goal':     return doGoal(p, res);
    case 'mortgage': return doMortgage(p, res);
    default:         return res.status(400).json({ error: 'invalid calc' });
  }
}

function buildShowYears(total) {
  if (total <= 10) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, 2, 3, 4, 5]);
  for (let y = total - 3; y <= total; y++) s.add(y);
  return [...s].filter(y => y >= 1 && y <= total).sort((a, b) => a - b);
}

function doLoan({ amount, rate, period, method }, res) {
  const P = amount * 10000, r = rate / 100 / 12, n = period;
  if (!P || !r || !n) return res.json({ error: 'invalid' });

  let totalInterest = 0, firstPayment = 0, lastPayment = 0, allRows = [];

  if (method === 'equal') {
    const pmt = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    let balance = P;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r, principal = pmt - interest;
      balance -= principal; totalInterest += interest;
      allRows.push({ i, pmt: Math.round(pmt), principal: Math.round(principal), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
    }
    firstPayment = lastPayment = pmt;
  } else if (method === 'principal') {
    const pPmt = P / n; let balance = P;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r, total = pPmt + interest;
      balance -= pPmt; totalInterest += interest;
      if (i === 1) firstPayment = total;
      if (i === n) lastPayment = total;
      allRows.push({ i, pmt: Math.round(total), principal: Math.round(pPmt), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
    }
  } else {
    const monthlyInterest = P * r;
    totalInterest = monthlyInterest * n; firstPayment = monthlyInterest; lastPayment = P + monthlyInterest;
    for (let i = 1; i <= n; i++) {
      const isLast = i === n;
      allRows.push({ i, pmt: Math.round(isLast ? P + monthlyInterest : monthlyInterest), principal: Math.round(isLast ? P : 0), interest: Math.round(monthlyInterest), balance: isLast ? 0 : Math.round(P) });
    }
  }

  const totalPay = P + totalInterest;
  return res.json({
    firstPayment: Math.round(firstPayment), lastPayment: Math.round(lastPayment),
    totalInterest: Math.round(totalInterest), totalPay: Math.round(totalPay),
    principal: Math.round(P), period: n,
    interestRatio: (totalInterest / totalPay * 100).toFixed(1),
    principalPct: (P / totalPay * 100).toFixed(1),
    interestPct: (100 - P / totalPay * 100).toFixed(1),
    method, allRows
  });
}

function doSavings({ type, rate, period, taxRate, compound, monthly, lump }, res) {
  const r = rate / 100, n = period;
  let principal = 0, maturity = 0, grossInterest = 0;

  if (type === 'installment') {
    const monthlyWon = (monthly || 0) * 10000;
    principal = monthlyWon * n;
    const mr = compound === 'monthly' ? r / 12 : compound === 'annually' ? r : r / 12;
    if (compound === 'simple') {
      let interest = 0;
      for (let i = 0; i < n; i++) interest += monthlyWon * r * (n - i) / 12;
      grossInterest = interest; maturity = principal + grossInterest;
    } else if (compound === 'monthly') {
      maturity = monthlyWon * (Math.pow(1 + mr, n) - 1) / mr * (1 + mr);
      grossInterest = maturity - principal;
    } else {
      let bal = 0;
      for (let i = 0; i < n; i++) bal = (bal + monthlyWon) * (1 + r / 12);
      maturity = bal; grossInterest = maturity - principal;
    }
  } else {
    const lumpWon = (lump || 0) * 10000;
    principal = lumpWon;
    if (compound === 'simple') { grossInterest = lumpWon * r * n / 12; maturity = lumpWon + grossInterest; }
    else if (compound === 'monthly') { maturity = lumpWon * Math.pow(1 + r / 12, n); grossInterest = maturity - lumpWon; }
    else { maturity = lumpWon * Math.pow(1 + r, n / 12); grossInterest = maturity - lumpWon; }
  }

  const taxAmount = grossInterest * taxRate, netInterest = grossInterest - taxAmount, netMaturity = principal + netInterest;
  return res.json({
    principal: Math.round(principal), maturity: Math.round(maturity),
    grossInterest: Math.round(grossInterest), taxAmount: Math.round(taxAmount),
    netInterest: Math.round(netInterest), netMaturity: Math.round(netMaturity),
    effectiveRate: (netInterest / principal / (n / 12) * 100).toFixed(2),
    n, taxRate, compound
  });
}

function simInv(initial, contributions, r) {
  let bal = initial;
  for (const c of contributions) bal = (bal + c) * (1 + r);
  return bal;
}

function buildContribs(baseContrib, years, isMonthly, isEscalate, escType, escRate, escAmount) {
  const periods = isMonthly ? years * 12 : years;
  const result = [];
  for (let i = 0; i < periods; i++) {
    const yr = isMonthly ? Math.floor(i / 12) : i;
    let c = baseContrib;
    if (isEscalate) {
      if (escType === 'rate') c = baseContrib * Math.pow(1 + escRate, yr);
      else c = Math.max(0, baseContrib + yr * escAmount);
    }
    result.push(c);
  }
  return result;
}

function doInvest({ initial, contrib, rate, years, risk, unit, type: invType, escType, escRate, escAmount }, res) {
  const initialWon = initial * 10000, contribWon = contrib * 10000;
  const r = rate / 100, escR = escRate / 100, escAmt = escAmount * 10000;
  const isMonthly = unit === 'month', isEscalate = invType === 'escalate';
  const periodR = isMonthly ? r / 12 : r;

  const contribs = buildContribs(contribWon, years, isMonthly, isEscalate, escType, escR, escAmt);
  const balance = simInv(initialWon, contribs, periodR);
  const totalInvested = initialWon + contribs.reduce((a, b) => a + b, 0);
  const gain = balance - totalInvested;

  const riskMap = { low: 0.03, mid: 0.07, high: 0.15 };
  let bestBal = 0, worstBal = 0;
  if (risk !== '0') {
    const sp = riskMap[risk];
    bestBal  = simInv(initialWon, contribs, isMonthly ? (r + sp) / 12 : r + sp);
    worstBal = simInv(initialWon, contribs, isMonthly ? (r - sp) / 12 : r - sp);
  }

  const showYrs = buildShowYears(years);
  const milestones = [];
  for (const y of showYrs) {
    const subContribs = buildContribs(contribWon, y, isMonthly, isEscalate, escType, escR, escAmt);
    const bal = simInv(initialWon, subContribs, periodR);
    const inv = initialWon + subContribs.reduce((a, b) => a + b, 0);
    const thisYrContrib = isEscalate
      ? (escType === 'rate' ? contribWon * Math.pow(1 + escR, y - 1) : Math.max(0, contribWon + (y - 1) * escAmt))
      : contribWon;
    milestones.push({ y, thisYrContrib: Math.round(thisYrContrib), totalInvested: Math.round(inv), balance: Math.round(bal) });
  }

  return res.json({
    balance: Math.round(balance), totalInvested: Math.round(totalInvested), gain: Math.round(gain),
    gainPct: (gain / totalInvested * 100).toFixed(1),
    bestBal: Math.round(bestBal), worstBal: Math.round(worstBal), risk, riskSpread: riskMap[risk] || 0,
    milestones, isMonthly, isEscalate, escType, escR: escRate, years
  });
}

function solveIRR(cfs) {
  function npv(r) {
    let sum = 0;
    for (let t = 0; t < cfs.length; t++) {
      if (cfs[t] === 0) continue;
      const d = Math.pow(1 + r, t);
      if (isFinite(d) && d > 0) sum += cfs[t] / d;
    }
    return sum;
  }
  const n0 = npv(0);
  if (Math.abs(n0) < 1e-2) return 0;
  let lo = n0 > 0 ? 1e-8 : -0.999, hi = n0 > 0 ? 5.0 : -1e-8;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (hi - lo < 1e-10) return mid;
    npv(lo) * npv(mid) <= 0 ? hi = mid : lo = mid;
  }
  return (lo + hi) / 2;
}

function doIrr({ initial, out, in: inAmt, period, hold, fv, unit }, res) {
  const initialWon = initial * 10000, outAmt = out * 10000;
  const inAmtWon = inAmt * 10000, fvWon = fv * 10000;
  const isMonthly = unit === 'month';
  const payPeriods  = isMonthly ? Math.round(period * 12) : Math.round(period);
  const holdPeriods = isMonthly ? Math.round(hold * 12) : Math.round(hold);
  const totalPeriods = payPeriods + holdPeriods;
  const totalOut = initialWon + outAmt * payPeriods, totalIn = inAmtWon * payPeriods + fvWon;

  if (!totalOut || !totalIn) return res.json({ error: 'missing_flows' });
  if (totalPeriods === 0 && !initialWon) return res.json({ error: 'invalid' });

  const cfs = new Array(Math.max(totalPeriods, 1) + 1).fill(0);
  if (initialWon > 0) cfs[0] -= initialWon;
  for (let t = 1; t <= payPeriods; t++) { cfs[t] -= outAmt; cfs[t] += inAmtWon; }
  if (fvWon > 0) cfs[Math.max(totalPeriods, 1)] += fvWon;

  const periodRate = solveIRR(cfs);
  if (periodRate === null) return res.json({ error: 'no_irr' });

  const annualIrr = isMonthly ? Math.pow(1 + periodRate, 12) - 1 : periodRate;
  const totalYears = period + hold, netGain = totalIn - totalOut;
  const realIrr = ((1 + annualIrr) / 1.025 - 1) * 100;

  const benchmarks = [
    { label: '예금 2%', r: 0.02 }, { label: '예금 3%', r: 0.03 },
    { label: '예금 4%', r: 0.04 }, { label: '예금 5%', r: 0.05 },
    { label: '주식 ETF 7%', r: 0.07 },
  ].map(b => {
    const pr = isMonthly ? Math.pow(1 + b.r, 1 / 12) - 1 : b.r;
    let npvB = 0;
    for (let t = 0; t < cfs.length; t++) {
      if (!cfs[t]) continue;
      const d = Math.pow(1 + pr, t);
      if (isFinite(d) && d > 0) npvB += cfs[t] / d;
    }
    return { label: b.label, better: npvB >= 0, npv: Math.round(npvB) };
  });

  return res.json({
    annualIrr, irrPct: (annualIrr * 100).toFixed(2), realIrr: realIrr.toFixed(2),
    totalOut: Math.round(totalOut), totalIn: Math.round(totalIn),
    netGain: Math.round(netGain), totalYears, benchmarks
  });
}

function doRetire({ age, retireAge, lifeAge, monthlyExpense, currentAsset, returnRate, inflation }, res) {
  const yearsToRetire = Math.max(1, retireAge - age);
  const retireDuration = Math.max(1, lifeAge - retireAge);
  const realRate = (1 + returnRate / 100) / (1 + inflation / 100) - 1;
  const inflatedMonthly = monthlyExpense * 10000 * Math.pow(1 + inflation / 100, yearsToRetire);
  const mr = realRate / 12, retireN = retireDuration * 12;
  const neededAtRetire = mr === 0 ? inflatedMonthly * retireN : inflatedMonthly * (1 - Math.pow(1 + mr, -retireN)) / mr;
  const grownAsset = currentAsset * 10000 * Math.pow(1 + returnRate / 100, yearsToRetire);
  const gap = Math.max(0, neededAtRetire - grownAsset);
  const mr2 = returnRate / 100 / 12, saveN = yearsToRetire * 12;
  const monthlySave = gap === 0 ? 0 : (mr2 === 0 ? gap / saveN : gap * mr2 / (Math.pow(1 + mr2, saveN) - 1));

  return res.json({
    yearsToRetire, retireDuration, inflatedMonthly: Math.round(inflatedMonthly),
    neededAtRetire: Math.round(neededAtRetire), grownAsset: Math.round(grownAsset),
    gap: Math.round(gap), monthlySave: Math.round(monthlySave),
    age, retireAge, lifeAge, returnRate, inflation
  });
}

function fvAnn(pmt, r, n) { return r === 0 ? pmt * n : pmt * (Math.pow(1 + r, n) - 1) / r; }

function doGoal({ target, current, period, rate, goalType, goalUnit, goalEscType, budget, escRate, escAmount }, res) {
  const targetWon = target * 10000, currentWon = current * 10000;
  const r = rate / 100, budgetWon = (budget || 0) * 10000;
  const escR = (escRate || 0) / 100, escAmt = (escAmount || 0) * 10000;
  const isMonth = goalUnit === 'month';
  const nMonths = isMonth ? period : period * 12;
  const nYears  = isMonth ? period / 12 : period;
  const mr = r / 12, ar = r;

  if (goalType === 'fixed') {
    if (isMonth) {
      const fvCurrent = currentWon * (mr > 0 ? Math.pow(1 + mr, nMonths) : 1);
      const fvNeeded  = targetWon - fvCurrent;
      let pmt = Math.max(0, mr === 0 ? fvNeeded / nMonths : fvNeeded * mr / (Math.pow(1 + mr, nMonths) - 1));

      let achievable = null;
      if (budgetWon > 0) {
        for (let m = 1; m <= 600; m++) {
          if (fvAnn(budgetWon, mr, m) + currentWon * Math.pow(1 + mr, m) >= targetWon) {
            achievable = m + '개월 (' + (m / 12).toFixed(1) + '년)'; break;
          }
        }
      }
      const canAfford = budgetWon > 0 && pmt <= budgetWon;
      const checkPts = [6, 12, 24, 36, 60, nMonths].filter((v, i, a) => a.indexOf(v) === i && v > 0 && v <= nMonths + 6).sort((a, b) => a - b);
      const milestones = checkPts.map(m => ({
        m, fv: Math.round(fvAnn(pmt, mr, m) + currentWon * (mr > 0 ? Math.pow(1 + mr, m) : 1)), isLast: m === nMonths
      }));
      return res.json({ type: 'fixed-month', pmt: Math.round(pmt), nMonths, targetWon, currentWon, budgetWon, canAfford, achievable, milestones });
    } else {
      const nYr = Math.round(nYears);
      const fvCurrent = currentWon * (ar > 0 ? Math.pow(1 + ar, nYr) : 1);
      const fvNeeded  = targetWon - fvCurrent;
      let pmt = Math.max(0, ar === 0 ? fvNeeded / nYr : fvNeeded * ar / (Math.pow(1 + ar, nYr) - 1));

      let achievable = null;
      if (budgetWon > 0) {
        for (let y = 1; y <= 100; y++) {
          if (fvAnn(budgetWon, ar, y) + currentWon * Math.pow(1 + ar, y) >= targetWon) { achievable = y + '년'; break; }
        }
      }
      const canAfford = budgetWon > 0 && pmt <= budgetWon;
      const yrs = nYr;
      const checkPts = [1, 2, 3, 5, 10, yrs].filter((v, i, a) => a.indexOf(v) === i && v > 0 && v <= yrs + 2).sort((a, b) => a - b);
      const milestones = checkPts.map(y => ({
        y, fv: Math.round(fvAnn(pmt, ar, y) + currentWon * (ar > 0 ? Math.pow(1 + ar, y) : 1)), isLast: y === yrs
      }));
      return res.json({ type: 'fixed-year', pmt: Math.round(pmt), nYr, targetWon, currentWon, budgetWon, canAfford, achievable, milestones });
    }
  } else {
    // escalating
    if (isMonth) {
      const n = nMonths;
      let factorBase = 0, factorInc = 0;
      for (let m = 1; m <= n; m++) {
        const yr = Math.floor((m - 1) / 12);
        factorBase += (goalEscType === 'rate' ? Math.pow(1 + escR, yr) : 1) * Math.pow(1 + mr, n - m);
        if (goalEscType === 'amount') factorInc += yr * Math.pow(1 + mr, n - m);
      }
      const fvCurrent = currentWon * (mr > 0 ? Math.pow(1 + mr, n) : 1);
      const fvNeeded  = targetWon - fvCurrent;
      let pmt1 = Math.max(0, goalEscType === 'rate' ? fvNeeded / factorBase : (fvNeeded - escAmt * factorInc) / factorBase);

      const nYr = Math.ceil(n / 12);
      const showYears = buildShowYears(nYr);
      const milestones = [];
      let prevY = 0;
      for (const y of showYears) {
        const mEnd = Math.min(y * 12, n);
        let fvY = currentWon * (mr > 0 ? Math.pow(1 + mr, mEnd) : 1);
        for (let m = 1; m <= mEnd; m++) {
          const yr2 = Math.floor((m - 1) / 12);
          const pmtM = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, yr2) : Math.max(0, pmt1 + yr2 * escAmt);
          fvY += pmtM * Math.pow(1 + mr, mEnd - m);
        }
        const thisMonthly = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, y - 1) : Math.max(0, pmt1 + (y - 1) * escAmt);
        milestones.push({ y, gap: y > prevY + 1, thisMonthly: Math.round(thisMonthly), annualTotal: Math.round(thisMonthly * 12), fvY: Math.round(fvY), isLast: y === nYr });
        prevY = y;
      }
      const lastPmt = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, nYr - 1) : Math.max(0, pmt1 + (nYr - 1) * escAmt);
      return res.json({ type: 'esc-month', pmt1: Math.round(pmt1), lastPmt: Math.round(lastPmt), n, nYr, targetWon, currentWon, goalEscType, escRate, escAmount, milestones });
    } else {
      const n = Math.round(nYears);
      let factorBase = 0, factorInc = 0;
      for (let y = 1; y <= n; y++) {
        factorBase += (goalEscType === 'rate' ? Math.pow(1 + escR, y - 1) : 1) * (ar > 0 ? Math.pow(1 + ar, n - y) : 1);
        if (goalEscType === 'amount') factorInc += (y - 1) * (ar > 0 ? Math.pow(1 + ar, n - y) : 1);
      }
      const fvCurrent = currentWon * (ar > 0 ? Math.pow(1 + ar, n) : 1);
      const fvNeeded  = targetWon - fvCurrent;
      let pmt1 = Math.max(0, goalEscType === 'rate' ? fvNeeded / factorBase : (fvNeeded - escAmt * factorInc) / factorBase);

      const showYears = buildShowYears(n);
      const milestones = [];
      let prevY = 0;
      for (const y of showYears) {
        let fvY = currentWon * (ar > 0 ? Math.pow(1 + ar, y) : 1);
        for (let k = 1; k <= y; k++) {
          const pmtK = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, k - 1) : Math.max(0, pmt1 + (k - 1) * escAmt);
          fvY += pmtK * (ar > 0 ? Math.pow(1 + ar, y - k) : 1);
        }
        const pmtY = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, y - 1) : Math.max(0, pmt1 + (y - 1) * escAmt);
        milestones.push({ y, gap: y > prevY + 1, pmtY: Math.round(pmtY), fvY: Math.round(fvY), pct: Math.min(100, fvY / targetWon * 100).toFixed(0), isLast: y === n });
        prevY = y;
      }
      const lastPmt = goalEscType === 'rate' ? pmt1 * Math.pow(1 + escR, n - 1) : Math.max(0, pmt1 + (n - 1) * escAmt);
      return res.json({ type: 'esc-year', pmt1: Math.round(pmt1), lastPmt: Math.round(lastPmt), n, targetWon, currentWon, goalEscType, escRate, escAmount, milestones });
    }
  }
}

function doMortgage({ price, loan, rate, period, income, existing }, res) {
  const priceWon = price * 10000, loanWon = loan * 10000;
  const incomeWon = income * 10000, existingWon = existing * 10000;
  const r = rate / 100, n = period;
  const mr = r / 12;
  const pmt = loanWon * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
  const annualPmt = pmt * 12;
  const ltv = (loanWon / priceWon * 100).toFixed(1);
  const dti = ((loanWon * r) / incomeWon * 100).toFixed(1);
  const dsr = ((annualPmt + existingWon) / incomeWon * 100).toFixed(1);
  const totalPay = pmt * n, totalInterest = totalPay - loanWon;

  const ltvN = parseFloat(ltv);
  const ltvStatus = ltvN <= 40 ? { c: 'ok', t: '투기지역 적합' } : ltvN <= 50 ? { c: 'warn', t: '조정지역 적합' } : ltvN <= 70 ? { c: 'warn', t: '일반지역 적합' } : { c: 'bad', t: '한도 초과 주의' };
  const dsrN = parseFloat(dsr);
  const dsrStatus = dsrN <= 40 ? { c: 'ok', t: '은행권 적합 (40% 이하)' } : dsrN <= 50 ? { c: 'warn', t: '비은행권 적합 (50% 이하)' } : { c: 'bad', t: 'DSR 한도 초과 주의' };

  return res.json({
    pmt: Math.round(pmt), loanWon, ltv, dti, dsr,
    totalPay: Math.round(totalPay), totalInterest: Math.round(totalInterest),
    n, rate, ltvStatus, dsrStatus
  });
}
