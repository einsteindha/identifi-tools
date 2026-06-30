const WEIGHTS_A = [16, 13, 12, 9, 10, 10, 12, 8, 10, 6];
const WEIGHTS_B = [25, 20, 20, 15, 10, 5, 5, 5];

function calcScore(answers, weights) {
  let total = 0, maxTotal = 0;
  weights.forEach((w, i) => {
    const ans = answers[i] || 0;
    total += ((ans - 1) / 4) * w;
    maxTotal += w;
  });
  return Math.round(total / maxTotal * 100);
}

function getGrade(score) {
  if (score >= 80) return 5;
  if (score >= 65) return 4;
  if (score >= 45) return 3;
  if (score >= 25) return 2;
  return 1;
}

function getFinalResult(aG, bG) {
  const diff = bG - aG;
  if (diff >= 2) return { grade: aG, type: 'down' };
  if (diff <= -2) return { grade: bG, type: 'up' };
  return { grade: Math.round((aG + bG) / 2), type: 'match' };
}

const gradeColors = {
  1: { bg: '#e8f5e9', border: '#2a7c6f', text: '#0a4d38', val: '#2a7c6f' },
  2: { bg: '#e8f0fe', border: '#2b5ea7', text: '#0c3570', val: '#2b5ea7' },
  3: { bg: '#fdf5e0', border: '#c4933f', text: '#7a4a00', val: '#c4933f' },
  4: { bg: '#fdecd4', border: '#b86e1a', text: '#6b3c00', val: '#b86e1a' },
  5: { bg: '#fae8e8', border: '#943030', text: '#5a1f1f', val: '#943030' }
};

const aGradeLabels = { 1: '최하', 2: '하', 3: '중', 4: '상', 5: '최상' };
const bGradeNames = { 1: '안정형', 2: '안정추구형', 3: '위험중립형', 4: '적극투자형', 5: '공격투자형' };

const P = {
  '5-1': { name: '견고한 방어자', returns: { low: 2, high: 4, note: '예금·채권 중심, 물가 상승률 수준' }, desc: '최상의 재무 능력을 보유하고 있지만 심리적으로 매우 보수적입니다. 자산을 지키는 것이 최우선이며, 능력에 비해 낮은 수익을 추구합니다. 인플레이션에 의한 실질 자산 침식이 가장 큰 리스크입니다.', strategic: { risky: 20, safe: 80 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '시장 급락 시 위험자산 최대 30%까지 확대, 과열 시 최소 10%로 축소 — ±10%p', advice: '재무 능력은 충분하나 성향이 지나치게 보수적입니다. 금(Gold) ETF와 물가연동채로 인플레이션을 방어하고, 단계적 투자 교육을 통해 성향을 조금씩 넓혀가는 것을 권장합니다.', checks: ['금(Gold) ETF 15~20%로 실질 구매력 방어', '물가연동국채(KTB) 편입 검토', '연금저축·IRP 세액공제 한도 우선 활용'] },
  '4-1': { name: '안전 자산가', returns: { low: 2, high: 4, note: '예금·채권 중심, 능력 대비 보수적 운용' }, desc: '안정적인 재무 기반을 갖추고 있으나 원금 보전을 절대 우선시합니다. 재무 능력에 비해 성향이 보수적이어서 인플레이션 방어에 취약할 수 있습니다.', strategic: { risky: 15, safe: 85 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '금리 상승기 안전자산 +5%p, 금리 하락기 위험자산 +5%p', advice: '재무 능력 대비 성향이 한 단계 보수적입니다. 우량 채권 비중을 단계적으로 확대하며 변동성에 익숙해지는 과정이 필요합니다.', checks: ['ISA 원금보장형 상품 우선 편입', '월지급식 채권형 펀드로 인컴 확보', '5년 이상 장기 국채로 금리 확정'] },
  '3-1': { name: '신중한 저축가', returns: { low: 2, high: 3, note: '예금·적금 중심, 물가 대응 어려움' }, desc: '보통 수준의 재무 상태와 매우 보수적인 성향의 조합입니다. 투자보다 저축과 원금 보전에 집중하는 것이 지금 단계에 맞습니다.', strategic: { risky: 10, safe: 90 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '비상금 완성 전 위험자산 확대 금지, 완성 후 +5%p', advice: '재무 기반을 먼저 탄탄히 다지는 것이 우선입니다. 비상금 완성 후 채권 비중을 조금씩 늘려 투자 경험을 쌓아가세요.', checks: ['비상금 6개월분 완성 후 투자 시작', 'IRP·연금저축 세액공제 900만원 한도 채우기', '고금리 부채 상환 우선'] },
  '2-1': { name: '생존 우선형', returns: { low: 2, high: 3, note: '원금 보전 우선, 실질 수익 미미' }, desc: '재무 기반이 취약하며 심리도 보수적입니다. 지금은 투자보다 재무 구조 개선이 절대적으로 우선입니다.', strategic: { risky: 5, safe: 95 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '재무 기반 개선 전 위험자산 확대 금지', advice: '투자보다 저축이 먼저입니다. 매월 자동이체로 저축 시스템을 만들고, 지출 구조를 점검해 저축률을 높이는 것이 가장 중요합니다.', checks: ['가계부 작성으로 불필요 지출 파악', '비상금 3개월분 확보 목표 설정', 'ISA 개설 후 원금보장형 상품 편입'] },
  '1-1': { name: '절대 방어형', returns: { low: 2, high: 3, note: '원금 보전이 목표' }, desc: '재무 기반이 매우 취약하며 손실 내성도 없습니다. 모든 자원을 원금 보장 상품에 집중하고 재무 구조 개선에 전념해야 합니다.', strategic: { risky: 0, safe: 100 }, tactical: { risky: 0, safe: 0 }, tacticalNote: '전술적 조정 없음 — 원금 보전 최우선', advice: '지금은 투자를 시작할 여건이 아닙니다. 고금리 부채 상환, 비상금 확보, 지출 절감이 최우선입니다. 서민금융진흥원 무료 상담(1397)을 활용하세요.', checks: ['신용카드·카드론 즉시 상환 계획 수립', '소득의 10% 강제 저축 자동이체 설정', '서민금융진흥원 무료 금융 상담 활용'] },

  '5-2': { name: '균형 자산가', returns: { low: 4, high: 6, note: '채권·배당 인컴 + 우량주 성장' }, desc: '최상의 재무 능력과 안정추구 성향의 조합입니다. 은행 이자보다 높은 수익을 원하지만 큰 변동성은 피합니다. 인컴 중심의 안정적 성장 전략이 적합합니다.', strategic: { risky: 40, safe: 60 }, tactical: { risky: 15, safe: 15 }, tacticalNote: '강세장·금리 하락 시 위험자산 최대 55%, 약세장 시 최소 25% — 재무 능력 최상, ±15%p', advice: '재무 여력이 충분합니다. 고배당 ETF와 채권으로 인컴을 확보하고, 글로벌 ETF로 인플레이션을 방어하는 구조를 만드세요.', checks: ['월지급식 배당 ETF로 생활비 보조 구조 설계', '미국 단기 국채 ETF로 달러 헤지', '부동산 비중이 높다면 주택연금 시뮬레이션 검토'] },
  '4-2': { name: '안정 성장형', returns: { low: 4, high: 6, note: '채권·주식 혼합(6:4)' }, desc: '안정적인 재무 기반에서 은행 이자 이상의 수익을 추구합니다. 채권 중심으로 일부 주식을 편입한 균형형 포트폴리오가 잘 맞습니다.', strategic: { risky: 35, safe: 65 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '밸류에이션 과열 시 위험자산 -10%p, 급락 후 회복 초기 +10%p', advice: '6:4 혼합형 자산 배분이 적합합니다. 연 1~2회 리밸런싱으로 채권-주식 비중을 유지하고, ISA·연금 세제 혜택을 최대 활용하세요.', checks: ['ISA 연 2,000만원 납입 한도 활용', '연금저축+IRP 세액공제 900만원 한도', '연 1~2회 정기 리밸런싱 일정 고정'] },
  '3-2': { name: '표준 중산층', returns: { low: 4, high: 6, note: 'TDF·혼합형 펀드 기준' }, desc: '재무 능력과 성향이 균형 잡힌 일반적인 중산층 투자자입니다. 시장 평균보다 약간 보수적인 수준을 목표로 하며, TDF 같은 단순한 전략이 잘 맞습니다.', strategic: { risky: 35, safe: 65 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '경기 사이클에 따라 ±5%p 조정, 리밸런싱 연 1회', advice: 'TDF(타겟데이트펀드) 또는 글로벌 자산 배분 펀드 1~2개로 단순화를 권장합니다. 복잡한 전략보다 꾸준한 납입이 장기적으로 더 큰 차이를 만듭니다.', checks: ['TDF 또는 밸런스드 펀드 1개 핵심 구성', 'IRP·연금저축 한도 먼저 채우기', '연 1회 포트폴리오 점검으로 충분'] },
  '2-2': { name: '성장 준비형', returns: { low: 3, high: 5, note: '채권 중심, 소액 주식 병행' }, desc: '재무 기반은 아직 미흡하지만 안정적인 성장을 원합니다. 재무 기반 강화와 소액 투자를 병행하는 과도기 단계입니다.', strategic: { risky: 30, safe: 70 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '비상금 미완성 시 위험자산 확대 금지, 완성 후 ±5%p', advice: '비상금과 저축률 확보를 먼저 완성하세요. 소액이라도 주식형 ETF에 월 정액 적립식(DCA)으로 투자 경험을 쌓아가는 것이 이 단계의 핵심입니다.', checks: ['비상금 3~6개월분 확보 후 투자 확대', '월 자동이체 DCA 투자 시작 (소액부터)', '부채 금리 > 기대 수익률이면 부채 상환 우선'] },
  '1-2': { name: '재무 재건형', returns: { low: 2, high: 4, note: '원금 보전 우선, 재무 구조 정리 단계' }, desc: '재무 기반이 매우 취약합니다. 지금은 투자 확대보다 재무 구조 정리가 절대 우선입니다.', strategic: { risky: 10, safe: 90 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '재무 구조 개선 단계 — 위험자산 확대는 3단계 이후', advice: '고금리 부채가 있다면 어떤 투자 수익보다 빠르게 자산을 잠식합니다. 재무 상담사와 함께 단계적 계획을 세우세요.', checks: ['금융 코치·재무 상담사 상담 적극 권장', '신용 점수 관리로 대출 금리 인하 추진', '소득 증대 방안(부업, 기술 습득) 병행'] },

  '5-3': { name: '균형 성장가', returns: { low: 5, high: 8, note: '글로벌 주식 ETF 50% + 채권·배당' }, desc: '탄탄한 재무 능력과 균형 잡힌 위험 성향의 이상적인 조합입니다. 주식과 채권을 균형 있게 배분하며 시장 평균 수익률을 목표로 합니다. 금융투자협회 준칙 기준 3등급 위험중립형에 해당합니다.', strategic: { risky: 60, safe: 40 }, tactical: { risky: 15, safe: 15 }, tacticalNote: '강세장 위험자산 최대 75%, 약세장 최소 45% — ±15%p', advice: 'Core-Satellite 전략이 적합합니다. 글로벌 지수 ETF를 핵심으로 하고, 배당주와 채권으로 인컴을 보완하세요. 재무 능력이 충분하므로 장기 복리 효과를 최대화하는 것이 목표입니다.', checks: ['글로벌 지수 ETF(S&P500·MSCI World) 핵심 50%', '연 2회 리밸런싱으로 목표 비중 유지', '세액공제 계좌 한도 최대 활용'] },
  '4-3': { name: '균형 투자자', returns: { low: 5, high: 8, note: '주식·채권 5:4, 국민연금형 배분' }, desc: '안정적인 재무 기반에서 시장 평균 수익률을 추구합니다. 변동성을 이해하고 장기 투자를 지향하는 성숙한 투자자입니다.', strategic: { risky: 55, safe: 45 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '주식 밸류에이션(P/E) 과열 시 -10%p, VIX 급등 후 +10%p', advice: '6:4 포트폴리오를 기반으로 운용하세요. 시장 하락 시 패닉 셀링을 하지 않는 것이 장기 성과를 결정짓는 가장 중요한 요소입니다.', checks: ['자동 적립식으로 감정 배제한 투자 시스템', '하락장 대응 기준 사전 작성 (예: -20% 추가 매수)', '은퇴 시점 역산하여 TDF 전환 타이밍 설계'] },
  '3-3': { name: '위험중립형 투자자', returns: { low: 5, high: 7, note: '주식·채권 균형(50:50) 혼합' }, desc: '재무 능력과 성향 모두 중간 수준의 균형 잡힌 투자자입니다. 금융투자협회 표준투자권유준칙 기준 3등급(위험중립형)에 정확히 해당합니다.', strategic: { risky: 50, safe: 50 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '경기 확장기 위험자산 +10%p, 침체 신호 시 -10%p', advice: '위험자산과 안전자산을 50:50으로 나누는 균형 포트폴리오가 가장 적합합니다. 지금 당장의 수익보다 10년·20년 복리 효과에 집중하세요.', checks: ['국내외 혼합형 인덱스 펀드 핵심 보유', 'IRP+연금저축 연간 900만원 세액공제 최대 활용', '비상금 6개월분 별도 유지'] },
  '2-3': { name: '성장 지향가', returns: { low: 4, high: 7, note: '주식 ETF 55%, 재무 기반 제약 반영' }, desc: '재무 기반은 중하 수준이지만 시장 수익률을 목표로 합니다. 성향이 능력보다 약간 앞서 있는 과도기적 유형입니다.', strategic: { risky: 45, safe: 55 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '비상금 확보 완료 전 ±5%p로 제한, 완료 후 ±10%p', advice: '월 정액 적립식(DCA)으로 투자를 시작하세요. 투자 금액이 소득의 20%를 초과하지 않도록 관리하고, 비상금을 동시에 확보하세요.', checks: ['비상금과 투자를 분리하여 병행 관리', '부채 금리 점검 후 상환 vs 투자 우선순위 결정', '월 투자는 소득의 10~20% 이내로'] },
  '1-3': { name: '고위험 노출형 ⚠', returns: { low: 2, high: 4, note: '능력 부족으로 보수적 운용 권고' }, desc: '재무 기반이 매우 취약하나 시장 평균 수익률을 목표로 합니다. 성향이 능력을 초과하는 불균형 상태입니다. 즉각적인 재무 구조 개선이 필요합니다.', strategic: { risky: 20, safe: 80 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '현재 단계 — 전술적 확대 자제, 안전자산 유지 우선', advice: '현재 성향이 재무 능력을 크게 초과합니다. 투자 확대를 중단하고 비상금 확보와 부채 상환에 집중하세요. 재무 기반이 갖춰진 후 투자를 늘려도 늦지 않습니다.', checks: ['신규 투자 확대 중단, 고위험 상품 정리 검토', '비상금 3개월분 확보를 최우선으로', '금융 상담 통해 부채 구조조정 검토'] },

  '5-4': { name: '성장 선구자', returns: { low: 7, high: 11, note: '글로벌 주식 ETF 65% + 성장 섹터' }, desc: '탄탄한 재무 능력과 적극적인 성향의 이상적인 조합입니다. 주식 중심 포트폴리오로 장기 성장을 추구하며, 시장 하락을 기회로 활용할 수 있습니다.', strategic: { risky: 70, safe: 30 }, tactical: { risky: 20, safe: 20 }, tacticalNote: '강세장 최대 90%, 약세장 최소 50% — 재무 능력 최상, ±20%p 적극 활용', advice: '높은 주식 비중이 장기적으로 최적입니다. 섹터 ETF와 개별 성장주는 전체의 20% 이내로 제한하고, 정기 리밸런싱을 신뢰하며 장기 보유하세요.', checks: ['글로벌 ETF 핵심 + 성장 섹터 위성 전략', '연 2회 리밸런싱으로 비중 유지', '레버리지 상품은 전체의 10% 이내로 엄격 제한'] },
  '4-4': { name: '적극 투자자', returns: { low: 6, high: 10, note: '주식 ETF 65%, 채권·리츠 완충' }, desc: '안정적인 재무 기반과 적극적 성향이 잘 맞는 조합입니다. 주식 중심으로 운용하며 변동성을 인내하고 장기 수익을 극대화합니다. 금융투자협회 준칙 기준 4등급(적극투자형)에 해당합니다.', strategic: { risky: 65, safe: 35 }, tactical: { risky: 15, safe: 15 }, tacticalNote: 'VIX 30 초과 시 위험자산 +15%p 적극 확대, 과열 시 -15%p', advice: '주식 중심 포트폴리오를 유지하되, 채권과 리츠로 변동성을 완충하세요. 시장 하락 시 추가 매수 여력을 항상 20% 확보해 두는 것이 핵심입니다.', checks: ['현금성 자산 20% 유지로 하락장 매수 여력 확보', '해외 ETF 비중 확대로 환율 분산 효과', '개별 주식은 리서치 역량 내에서만 편입'] },
  '3-4': { name: '위험 추구형', returns: { low: 5, high: 9, note: '주식 60%, 재무 기반 일부 제약' }, desc: '중간 수준의 재무 능력에 적극적인 성향이 결합된 유형입니다. 성향이 능력을 한 단계 앞서 있어 재무 기반 강화를 병행해야 합니다.', strategic: { risky: 60, safe: 40 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '재무 기반 강화와 병행 — 공격적 확대는 A축 상승 후', advice: '적극적 성향을 발휘하되 비상금과 연금 저축을 동시에 강화하세요. 재무 기반이 성향 수준까지 올라오면 주식 비중을 더 높일 수 있습니다.', checks: ['비상금 6개월분 확보와 적립식 투자 병행', '레버리지·파생 상품은 지금 단계에서 자제', '재무 기반 강화될수록 투자 비중 단계적 확대'] },
  '2-4': { name: '과잉 위험 노출형 ⚠', returns: { low: 3, high: 6, note: '능력 초과 — 보수적 운용으로 강제 조정' }, desc: '재무 기반에 비해 성향이 과도하게 공격적입니다. 실제 손실 발생 시 대응할 여력이 부족한 위험한 조합입니다.', strategic: { risky: 35, safe: 65 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '전술적 확대 자제 — 재무 기반 개선이 우선', advice: '마음은 공격적이지만 재무의 방패가 너무 얇습니다. 포트폴리오를 보수적으로 전환하고, 비상금과 저축률을 먼저 높이세요.', checks: ['현재 고위험 상품 비중 즉시 축소', '비상금 확보가 최우선 — 투자 확대 중단', '금융 코치 상담으로 현실적 투자 계획 수립'] },
  '1-4': { name: '도박적 위험 노출형 ⚠⚠', returns: { low: 2, high: 4, note: '즉각 보수적 전환 필요' }, desc: '극히 취약한 재무 기반에서 매우 공격적인 성향을 보입니다. 재무적 위기로 이어질 가능성이 높습니다. 즉각적인 전문가 상담이 필요합니다.', strategic: { risky: 10, safe: 90 }, tactical: { risky: 0, safe: 0 }, tacticalNote: '전술적 조정 없음 — 즉각 전문가 상담 필요', advice: '지금 당장 모든 고위험 투자를 중단하세요. 재무 상담사와 함께 현실적인 계획을 세우는 것이 가장 시급합니다.', checks: ['고위험 투자 즉시 중단', '전문 재무 상담사 상담 강력 권고', '기본 생활비 확보 우선 — 투자는 나중 문제'] },

  '5-5': { name: '공격적 선구자', returns: { low: 8, high: 15, note: '성장주·레버리지 포함, 변동성 높음' }, desc: '최상의 재무 능력과 공격적 성향이 완벽히 일치하는 이상적인 고성장 투자자입니다. 글로벌 성장 섹터와 레버리지 전략을 적극 활용할 수 있습니다. 금융투자협회 준칙 기준 1등급(공격투자형)에 해당합니다.', strategic: { risky: 80, safe: 20 }, tactical: { risky: 15, safe: 15, riskyDown: 20 }, tacticalNote: '강세장 최대 95%(+15%p), 약세장 최소 60%(−20%p) — 비대칭 전술 범위', advice: '능력과 성향이 완벽히 일치합니다. 분산 투자를 전제로 섹터 집중을 허용하지만, 레버리지와 파생 상품은 전체의 20% 이내로 엄격히 통제하세요.', checks: ['글로벌 분산을 전제로 섹터·테마 집중 허용', '레버리지 상품 20% 상한 엄수', '연간 세전 수익률 기록 및 벤치마크 대비 평가'] },
  '4-5': { name: '공격적 성장가', returns: { low: 7, high: 13, note: '성장주 70%, 일부 방어 자산' }, desc: '안정적인 재무 기반에서 최고의 수익을 추구합니다. 공격적 성향이 재무 능력을 약간 앞서 있어 일부 절제가 필요합니다.', strategic: { risky: 70, safe: 30 }, tactical: { risky: 15, safe: 15 }, tacticalNote: '방어형 30%는 하락장 매수 재원 — 전술 확대 시 최대 85%, 축소 시 최소 55% (±15%p)', advice: '공격적 성향이 재무 능력을 한 단계 초과합니다. 고위험 상품 비중을 70%로 절제하고, 나머지 30%는 방어형으로 유지하여 하락장 매수 재원으로 활용하세요.', checks: ['방어형 자산 30%는 하락장 추가 매수 재원', '개별 종목 집중도 관리 (단일 종목 10% 이내)', '레버리지는 전체 포트폴리오의 15% 이내'] },
  '3-5': { name: '공격 희망형 ⚠', returns: { low: 4, high: 8, note: '재무 기반 제약으로 조정 운용' }, desc: '중간 수준의 재무 능력에 최대 공격 성향이 결합됩니다. 성향이 능력을 초과하는 불균형 상태로, 실제 손실 시 대응 여력이 부족합니다.', strategic: { risky: 55, safe: 45 }, tactical: { risky: 10, safe: 10 }, tacticalNote: '재무 기반 강화 전 위험자산 65% 초과 금지', advice: '공격적 성향을 지금 100% 발휘하기에는 재무 기반이 부족합니다. 재무 기반을 강화하면서 주식 비중을 단계적으로 높여가세요.', checks: ['재무 기반 강화 로드맵 수립 (3~5년)', '고위험 파생·레버리지 현재 단계에서 제외', '포트폴리오 –20% 시 대응 시나리오 사전 작성'] },
  '2-5': { name: '충동적 위험 노출형 ⚠⚠', returns: { low: 3, high: 6, note: '능력 초과 — 보수적 강제 조정' }, desc: '취약한 재무 기반에서 최대 공격 성향을 보입니다. 한 번의 큰 손실이 재무 파탄으로 이어질 수 있는 위험한 상태입니다.', strategic: { risky: 30, safe: 70 }, tactical: { risky: 5, safe: 5 }, tacticalNote: '전술적 확대 강력 자제 — 기반 구축 단계', advice: '지금 당장의 공격적 투자 욕구를 자제해야 합니다. 5년 후 공격적 투자를 하기 위해 지금은 기반을 쌓는 시간입니다.', checks: ['모든 신용 투자·빚투 즉시 중단', '비상금 확보를 투자의 전제 조건으로 설정', '전문 재무 상담사 상담 강력 권고'] },
  '1-5': { name: '위기 상태 ⚠⚠⚠', returns: { low: 2, high: 3, note: '투자 중단 — 원금 보전만' }, desc: '극히 취약한 재무 기반에서 극단적 공격 성향을 보입니다. 심각한 재무 위기가 발생할 가능성이 높습니다. 즉각적인 전문가 개입이 필요합니다.', strategic: { risky: 0, safe: 100 }, tactical: { risky: 0, safe: 0 }, tacticalNote: '투자 중단 — 원금 보전 및 재무 위기 대응 최우선', advice: '지금 당장 모든 투자를 중단하고 전문가를 만나세요. 서민금융진흥원(1397) 무료 금융 상담을 활용하세요.', checks: ['모든 투자 즉시 중단 — 현금 확보 최우선', '서민금융진흥원 무료 상담 (1397) 활용', '생활비·주거 안정화 후 재무 재건 단계별 시작'] }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { answersA, answersB } = req.body;
  if (!answersA || !answersB) return res.status(400).json({ error: 'answers required' });

  const aScore = calcScore(answersA, WEIGHTS_A);
  const bScore = calcScore(answersB, WEIGHTS_B);
  const aG = getGrade(aScore);
  const bG = getGrade(bScore);
  const { grade: finalG, type: gapType } = getFinalResult(aG, bG);
  const pKey = `${aG}-${bG}`;
  const portfolio = P[pKey] || P['3-3'];
  const diff = Math.abs(aG - bG);

  res.json({
    aScore, bScore, aG, bG, finalG, gapType, pKey, diff,
    portfolio,
    gradeColors,
    aGradeLabels,
    bGradeNames
  });
};
