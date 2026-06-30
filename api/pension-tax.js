export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { calc, ...p } = req.body;

  switch (calc) {
    case 'deduction':  return doDeduction(p, res);
    case 'withdraw':   return doWithdraw(p, res);
    default:           return res.status(400).json({ error: 'invalid calc' });
  }
}

// 연금계좌 세액공제 계산
function doDeduction(p, res) {
  const {
    totalIncome = 0,       // 총급여 / 종합소득
    irp = 0,               // IRP 납입액
    pensionSaving = 0,     // 연금저축 납입액
    isEmployee = true,     // 근로소득자 여부
  } = p;

  // 공제 한도
  const pensionSavingLimit = 6000000;
  const combinedLimit = totalIncome <= 45000000 ? 9000000 : 9000000; // 2024 기준 공통

  const pensionSavingCapped = Math.min(pensionSaving, pensionSavingLimit);
  const combinedCapped = Math.min(pensionSavingCapped + irp, combinedLimit);

  // 세액공제율
  const rate = totalIncome <= 55000000 ? 0.165 : 0.132;

  const deductionBase = combinedCapped;
  const taxSaving = Math.floor(deductionBase * rate);

  return res.json({
    pensionSavingCapped,
    combinedCapped,
    deductionRate: rate,
    taxSaving,
    effectiveContrib: combinedCapped - taxSaving,
  });
}

// 연금 수령 시 세금 계산
function doWithdraw(p, res) {
  const {
    annualWithdraw = 0,      // 연간 수령액
    publicPension = 0,       // 공적연금 수령액
    age = 65,                // 수령 나이
    withdrawYears = 20,      // 수령 기간
    taxablePortion = 0.7,    // 과세 대상 비율(세전 납입액 기준)
  } = p;

  // 연금소득 세율 (분리과세)
  let rate;
  if (age < 55) rate = 0.16;
  else if (age < 70) rate = 0.05;
  else if (age < 80) rate = 0.04;
  else rate = 0.03;

  const taxableAmount = annualWithdraw * taxablePortion;
  const annualTax = Math.floor(taxableAmount * rate);

  // 1,500만 원 초과 시 종합과세 여부
  const totalPensionIncome = annualWithdraw + publicPension * 0.8;
  const needsComprehensive = totalPensionIncome > 15000000;

  return res.json({
    taxableAmount,
    separateTaxRate: rate,
    annualTax,
    totalPensionIncome,
    needsComprehensive,
    note: needsComprehensive
      ? '연금소득 합계 1,500만 원 초과 — 종합과세·분리과세 비교 필요'
      : '분리과세 선택 가능',
  });
}
