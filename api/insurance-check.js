export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { calc, ...p } = req.body;

  switch (calc) {
    case 'need': return doNeed(p, res);
    case 'gap':  return doGap(p, res);
    default:     return res.status(400).json({ error: 'invalid calc' });
  }
}

// 보험 필요 금액 산출
function doNeed(p, res) {
  const {
    monthlyExpense = 0,   // 월 생활비
    incomeMonths = 24,    // 소득 보장 기간(월)
    debt = 0,             // 부채
    childrenCost = 0,     // 자녀 양육·교육비
    existingAsset = 0,    // 기존 자산
  } = p;

  const incomeNeed = monthlyExpense * incomeMonths;
  const totalNeed = incomeNeed + debt + childrenCost;
  const netNeed = Math.max(0, totalNeed - existingAsset);

  return res.json({ incomeNeed, totalNeed, netNeed });
}

// 보험 가입 공백 분석
function doGap(p, res) {
  const {
    deathCoverage = 0,
    criticalIllnessCoverage = 0,
    disabilityCoverage = 0,
    hospitalDailyCoverage = 0,
    recommendedDeath,
    recommendedCritical = 50000000,
    recommendedDisability = 30000000,
    recommendedHospitalDaily = 30000,
  } = p;

  const gaps = [
    {
      type: '사망',
      current: deathCoverage,
      recommended: recommendedDeath ?? 0,
      gap: Math.max(0, (recommendedDeath ?? 0) - deathCoverage),
    },
    {
      type: '중대질병(CI)',
      current: criticalIllnessCoverage,
      recommended: recommendedCritical,
      gap: Math.max(0, recommendedCritical - criticalIllnessCoverage),
    },
    {
      type: '장해·소득상실',
      current: disabilityCoverage,
      recommended: recommendedDisability,
      gap: Math.max(0, recommendedDisability - disabilityCoverage),
    },
    {
      type: '입원일당',
      current: hospitalDailyCoverage,
      recommended: recommendedHospitalDaily,
      gap: Math.max(0, recommendedHospitalDaily - hospitalDailyCoverage),
    },
  ];

  return res.json({ gaps });
}
