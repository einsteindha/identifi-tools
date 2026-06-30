export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    currentAge, startAge, accumYears, withdrawYears,
    accumRate, withdrawRate, targetMonthly, inflation,
    currentBalance, escalationOn, escalation
  } = req.body;

  const holdYears = Math.max(0, startAge - (currentAge + accumYears));
  const cb = currentBalance || 0;
  const inf = inflation || 0;
  const esc = escalationOn ? (escalation || 0) : 0;

  function calcMonthlyPMT(tm, wy, wr, ay, ar, hy, infRate) {
    hy = hy || 0; infRate = infRate || 0;
    const rW = wr / 100 / 12, nW = wy * 12;
    const rA = ar / 100 / 12, nA = ay * 12;
    const g  = infRate / 100 / 12;
    const totalYearsToStart = ay + hy;
    const inflatedTarget = tm * Math.pow(1 + infRate / 100, totalYearsToStart);
    let withdrawPV;
    if (Math.abs(rW - g) < 1e-9) {
      withdrawPV = inflatedTarget * nW;
    } else {
      withdrawPV = inflatedTarget * (1 - Math.pow((1 + g) / (1 + rW), nW)) / (rW - g);
    }
    const holdGrowth = hy > 0 ? Math.pow(1 + ar / 100, hy) : 1;
    const neededPV   = withdrawPV / holdGrowth;
    if (nA === 0) return { monthlyPMT: null, neededPV, withdrawPV, inflatedTarget };
    let monthlyPMT;
    if (Math.abs(rA) < 1e-9) { monthlyPMT = neededPV / nA; }
    else { monthlyPMT = neededPV * rA / (Math.pow(1 + rA, nA) - 1); }
    return { monthlyPMT, neededPV, withdrawPV, inflatedTarget };
  }

  function calcAnnualPMT(neededPV, ay, ar, type) {
    const r = ar / 100, n = ay;
    if (n === 0) return null;
    let pmt;
    if (Math.abs(r) < 1e-9) { pmt = neededPV / n; }
    else { pmt = neededPV * r / (Math.pow(1 + r, n) - 1); }
    if (type === 'begin') pmt = pmt / (1 + r);
    return pmt;
  }

  function calcEscalatedFirstPMT(neededPV, ay, ar, e, payType) {
    const r = ar / 100, ep = e / 100, n = ay;
    if (n === 0) return null;
    if (Math.abs(ep) < 1e-9) {
      const type = payType === 'monthly' ? 'end' : payType === 'annual-end' ? 'end' : 'begin';
      const ap = calcAnnualPMT(neededPV, ay, ar, type);
      return payType === 'monthly' ? ap / 12 : ap;
    }
    let fvFactor;
    if (Math.abs(r - ep) < 1e-9) { fvFactor = n * Math.pow(1 + r, n - 1); }
    else { fvFactor = (Math.pow(1 + r, n) - Math.pow(1 + ep, n)) / (r - ep); }
    if (!isFinite(fvFactor) || fvFactor <= 0) return null;
    let firstAnnualPMT = neededPV / fvFactor;
    if (payType === 'annual-begin') return firstAnnualPMT / (1 + r);
    if (payType === 'annual-end')   return firstAnnualPMT;
    return firstAnnualPMT / 12;
  }

  const { monthlyPMT, neededPV, withdrawPV, inflatedTarget } = calcMonthlyPMT(
    targetMonthly, withdrawYears, withdrawRate, accumYears, accumRate, holdYears, inf
  );

  const cbFV = cb > 0 ? cb * Math.pow(1 + accumRate / 100, accumYears + holdYears) : 0;
  const shortfall = neededPV - cbFV;
  const alreadySufficient = shortfall <= 0;
  const neededPVforPMT = alreadySufficient ? 0 : shortfall;
  const surplusRatio = cbFV > 0 && neededPV > 0 ? ((cbFV / neededPV - 1) * 100).toFixed(1) : null;
  const isOverfunded = alreadySufficient && cbFV > neededPV * 1.1;

  if (monthlyPMT === null || !isFinite(monthlyPMT) || monthlyPMT < 0) {
    if (accumYears === 0) {
      const g0 = inf / 100 / 12;
      let nominalTotalReceived = 0;
      for (let i = 0; i < withdrawYears * 12; i++) {
        nominalTotalReceived += inflatedTarget * Math.pow(1 + g0, i);
      }
      return res.json({
        type: 'zero-accum', holdYears, neededPV, withdrawPV, inflatedTarget,
        cbFV, shortfall, alreadySufficient, isOverfunded, surplusRatio,
        nominalTotalReceived
      });
    }
    return res.json({ type: 'impossible' });
  }

  // adjusted PMT for shortfall
  let adjustedMonthlyPMT;
  if (alreadySufficient) {
    adjustedMonthlyPMT = 0;
  } else {
    const rA = accumRate / 100 / 12, nA = accumYears * 12;
    if (Math.abs(rA) < 1e-9) { adjustedMonthlyPMT = neededPVforPMT / nA; }
    else { adjustedMonthlyPMT = neededPVforPMT * rA / (Math.pow(1 + rA, nA) - 1); }
  }
  const pmtMan = Math.round(adjustedMonthlyPMT / 10000);

  // nominal totals
  const g = inf / 100 / 12;
  let nominalTotalReceived = 0;
  for (let i = 0; i < withdrawYears * 12; i++) {
    nominalTotalReceived += inflatedTarget * Math.pow(1 + g, i);
  }

  let nominalTotalPaid;
  if (alreadySufficient) {
    nominalTotalPaid = 0;
  } else if (escalationOn && esc > 0) {
    const firstMonthlyForPaid = calcEscalatedFirstPMT(neededPVforPMT, accumYears, accumRate, esc, 'monthly');
    nominalTotalPaid = 0;
    for (let yr = 0; yr < accumYears; yr++) {
      nominalTotalPaid += (firstMonthlyForPaid * 12) * Math.pow(1 + esc / 100, yr);
    }
  } else {
    nominalTotalPaid = adjustedMonthlyPMT * accumYears * 12;
  }

  const ratio = nominalTotalPaid > 0 ? nominalTotalReceived / nominalTotalPaid : 0;

  // card values
  let card1, card2, card3;
  const subLine = `${accumYears}년간 납입${holdYears > 0 ? ` → ${holdYears}년 예치` : ''} → ${startAge}세부터 ${withdrawYears}년 수령`;

  if (alreadySufficient) {
    card1 = { label: '추가 납입 불필요', val: 0, sub: '현재 평가액만으로 목표 달성 가능' };
    card2 = { label: '추가 납입 불필요', val: 0, sub: '연말 납입 불필요' };
    card3 = { label: '추가 납입 불필요', val: 0, sub: '연초 납입 불필요' };
  } else if (escalationOn && esc > 0) {
    const fm   = calcEscalatedFirstPMT(neededPVforPMT, accumYears, accumRate, esc, 'monthly');
    const fae  = calcEscalatedFirstPMT(neededPVforPMT, accumYears, accumRate, esc, 'annual-end');
    const fab  = calcEscalatedFirstPMT(neededPVforPMT, accumYears, accumRate, esc, 'annual-begin');
    const escStr = `매년 ${esc}% 증액`;
    const fm4  = fm != null && isFinite(fm) ? Math.round(fm / 10000) : null;
    const fae4 = fae != null && isFinite(fae) ? Math.round(fae / 10000) : null;
    const fab4 = fab != null && isFinite(fab) ? Math.round(fab / 10000) : null;
    card1 = { label: '첫 해 월 납입', val: fm4, sub: fm4 != null ? `${escStr}<br>1년차 연 환산 ${Math.round(fm4 * 12).toLocaleString('ko-KR')}만원` : escStr };
    card2 = { label: '첫 해 연말 납입', val: fae4, sub: `${escStr}<br>연 1회 · 연말 일시납` };
    card3 = { label: '첫 해 연초 납입', val: fab4, sub: `${escStr}<br>연 1회 · 연초 일시납` };
  } else {
    const aep  = calcAnnualPMT(neededPVforPMT, accumYears, accumRate, 'end');
    const abp  = calcAnnualPMT(neededPVforPMT, accumYears, accumRate, 'begin');
    const aem4 = aep != null && isFinite(aep) ? Math.round(aep / 10000) : null;
    const abm4 = abp != null && isFinite(abp) ? Math.round(abp / 10000) : null;
    const monthlyAnnual = pmtMan * 12;
    const endDiff   = aem4 != null && monthlyAnnual > 0 ? ((aem4 / monthlyAnnual - 1) * 100).toFixed(1) : null;
    const beginDiff = abm4 != null && monthlyAnnual > 0 ? ((abm4 / monthlyAnnual - 1) * 100).toFixed(1) : null;
    card1 = { label: '매월 납입', val: pmtMan, sub: `연 환산 ${monthlyAnnual.toLocaleString('ko-KR')}만원<br>${subLine}` };
    card2 = { label: '매년 말 납입', val: aem4, sub: `연 1회 · 연말 일시납<br>월납 연환산 대비 ${endDiff != null ? (parseFloat(endDiff) > 0 ? '+' : '') + endDiff + '%' : '—'}` };
    card3 = { label: '매년 초 납입', val: abm4, sub: `연 1회 · 연초 일시납<br>월납 연환산 대비 ${beginDiff != null ? (parseFloat(beginDiff) > 0 ? '+' : '') + beginDiff + '%' : '—'}` };
  }

  // scenario table
  const fixedRates = [3, 5, 7];
  const dynamicRates = [accumRate - 2, accumRate, accumRate + 2];
  const allRates = [...new Set([...fixedRates, ...dynamicRates]
    .map(r => Math.round(r * 10) / 10)
    .filter(r => r >= -10 && r <= 20)
  )].sort((a, b) => a - b);

  const scenarios = allRates.map(r => {
    const { monthlyPMT: p } = calcMonthlyPMT(targetMonthly, withdrawYears, withdrawRate, accumYears, r, holdYears, inf);
    return { rate: r, pmt: p != null && isFinite(p) ? Math.round(p / 10000) : null, isCurrent: Math.abs(r - accumRate) < 1e-9 };
  });

  const neededSub = holdYears > 0 ? `예치 ${holdYears}년 후 → ${withdrawPV}` : '수령 시작 시점';
  const infNote = inf > 0
    ? `물가상승률 ${inf}% 반영 · 수령 시작 시 <strong>${Math.round(inflatedTarget / 10000).toLocaleString('ko-KR')}만원/월</strong> → 매년 ${inf}% 증가`
    : `물가상승률 0% · 수령액 고정`;

  return res.json({
    type: 'normal',
    holdYears, neededPV, withdrawPV, inflatedTarget, cbFV,
    shortfall, alreadySufficient, isOverfunded, surplusRatio,
    adjustedMonthlyPMT, pmtMan, nominalTotalReceived, nominalTotalPaid, ratio,
    card1, card2, card3, scenarios, subLine, neededSub, infNote
  });
}
