const yangBench = {
  emergency:   { 20: 2,  30: 4,  40: 4,  50: 4,  55: 6  },
  debtTot:     { 20: 40, 30: 40, 40: 40, 50: 30, 55: 20 },
  dsr:         { 20: 25, 30: 25, 40: 25, 50: 25, 55: 0  },
  housing:     { 20: 20, 30: 20, 40: 20, 50: 20, 55: 20 },
  consumer:    { 20: 10, 30: 10, 40: 10, 50: 10, 55: 10 },
  savings:     { 20: 20, 30: 20, 40: 20, 50: 30, 55: 30 },
  investAsset: { 20: 10, 30: 20, 40: 30, 50: 30, 55: 30 },
  finAsset:    { 20: 20, 30: 30, 40: 40, 50: 40, 55: 40 },
  budget:      { 20: 50, 30: 60, 40: 70, 50: 70, 55: 70 },
  insurance:   { 20: 3,  30: 5,  40: 7,  50: 10, 55: 10 },
};

const sgwBench = {
  budget:      { 20: 50, 30: 70, 40: 80, 50: 80, 55: 80 },
  emergency:   { 20: 2,  30: 3,  40: 4,  50: 4,  55: 6  },
  debtTot:     { 20: 40, 30: 40, 40: 40, 50: 40, 55: 40 },
  dsr:         { 20: 30, 30: 30, 40: 30, 50: 30, 55: 30 },
  savings:     { 20: 50, 30: 30, 40: 20, 50: 20, 55: 20 },
  investFlow:  { 20: 40, 30: 30, 40: 30, 50: 30, 55: 30 },
};

function yv(k, ag) { return yangBench[k][ag] ?? yangBench[k][20]; }
function sgwv(k, ag) { return sgwBench[k][ag] ?? sgwBench[k][20]; }

function pct(v) { return (v * 100).toFixed(1) + '%'; }
function fmt(n) { return Math.round(n).toLocaleString(); }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { bs, cf, inputs, mode, age } = req.body;
  if (!bs || !cf) return res.status(400).json({ error: 'bs and cf required' });

  const ag = age || 30;
  const iM = cf.iM || 0;
  const liqAsset = bs.aLiq || 0;
  const monthlyExp = (cf.varM || 0) + (cf.fixM || 0);
  const efRatio = monthlyExp > 0 ? liqAsset / monthlyExp : 0;
  const debtRatio = bs.aTotal > 0 ? bs.lTotal / bs.aTotal : 0;

  const inp = inputs || {};
  const e_mint_y = inp.e_mint_y || 0;
  const e_oint_y = inp.e_oint_y || 0;
  const s_mprin_y = inp.s_mprin_y || 0;
  const s_oprin_y = inp.s_oprin_y || 0;
  const s_mamort_y = inp.s_mamort_y || 0;
  const s_oamort_y = inp.s_oamort_y || 0;
  const e_ins_y = inp.e_ins_y || 0;
  const s_fund_y = inp.s_fund_y || 0;
  const s_pen_y = inp.s_pen_y || 0;
  const s_isa_y = inp.s_isa_y || 0;

  const totalDebtSvc = e_mint_y / 12 + e_oint_y / 12 + s_mprin_y / 12 + s_oprin_y / 12 + s_mamort_y / 12 + s_oamort_y / 12;
  const dsr = iM > 0 ? totalDebtSvc / iM : 0;
  const housingDebtSvc = e_mint_y / 12 + s_mprin_y / 12 + s_mamort_y / 12;
  const housingRatio = iM > 0 ? housingDebtSvc / iM : 0;
  const consDebtSvc = e_oint_y / 12 + s_oprin_y / 12 + s_oamort_y / 12;
  const consRatio = iM > 0 ? consDebtSvc / iM : 0;
  const savRate = iM > 0 ? ((cf.savM || 0) + (cf.princM || 0)) / iM : 0;
  const investRatio = bs.aTotal > 0 ? bs.aInv / bs.aTotal : 0;
  const finRatio = bs.aTotal > 0 ? bs.aFin / bs.aTotal : 0;
  const budgetRatio = iM > 0 ? (cf.totExpM || 0) / iM : 0;
  const insRatio = iM > 0 ? e_ins_y / 12 / iM : 0;
  const investFlowM = (s_fund_y + s_pen_y + s_isa_y) / 12;
  const investFlowRatio = (cf.savM || 0) + (cf.princM || 0) > 0 ? investFlowM / ((cf.savM || 0) + (cf.princM || 0)) : 0;

  let ratios;

  if (mode === 'book') {
    ratios = [
      { grp: '유동성', q: '급할 때 쓸 수 있는 비상자금이 충분한가요?', v: efRatio.toFixed(1) + '개월', bench: '권장 3~6개월 생활비', pv: efRatio / 6, cls: efRatio >= 3 ? (efRatio <= 12 ? 'ok' : 'warn') : (efRatio >= 1 ? 'warn' : 'bad'), st: efRatio >= 3 ? (efRatio <= 12 ? '✅ 잘 준비됐어요' : '⚠️ 너무 많이 묶여 있어요') : (efRatio >= 1 ? '⚠️ 조금 부족해요' : '🚨 비상자금이 없어요'), why: '갑작스러운 실직·의료비 등에 대비해 3~6개월 생활비를 예금·CMA에 별도 보관하세요.' },
      { grp: '유동성', q: '비상자금이 한 달 생활비는 되나요?', v: efRatio.toFixed(1) + '개월', bench: '최소 1개월 이상', pv: efRatio / 3, cls: efRatio >= 1 ? 'ok' : 'bad', st: efRatio >= 1 ? '✅ 최소 유동성 확보' : '🚨 당장 현금이 없어요', why: '예상치 못한 지출에 즉시 대응할 수 있는 현금. 1개월 생활비는 반드시 유동성 자산으로 보유하세요.' },
      { grp: '안정성', q: '내 재산 중 빚이 얼마나 되나요?', v: pct(debtRatio), bench: '건전 기준 40% 이하', pv: debtRatio / 0.4, cls: debtRatio <= 0.4 ? 'ok' : debtRatio <= 0.6 ? 'warn' : 'bad', st: debtRatio <= 0.4 ? '✅ 부채 수준이 건전해요' : debtRatio <= 0.6 ? '⚠️ 조금 높아요' : '🚨 부채가 많아요', why: '총 자산 중 부채 비율. 40% 이하가 안전하며, 높을수록 금리 상승·자산 하락 시 위험합니다.' },
      { grp: '안정성', q: '버는 돈 중 대출 갚는 데 얼마나 쓰나요?', v: pct(dsr), bench: '건전 기준 36% 이하', pv: dsr / 0.36, cls: dsr <= 0.36 ? 'ok' : dsr <= 0.5 ? 'warn' : 'bad', st: dsr <= 0.36 ? '✅ 상환 부담이 적정해요' : dsr <= 0.5 ? '⚠️ 상환 부담이 높아요' : '🚨 상환 부담이 과중해요', why: `월 소득 중 모든 대출 원리금 합계 비율(DSR)${cf.amortM > 0 ? ' — 원리금 통합 입력분 ' + fmt(cf.amortM) + '만원/월 포함' : ''}. 36% 초과 시 생활이 빠듯해지고 추가 대출도 어렵습니다.` },
      { grp: '안정성', q: '집 관련 대출 상환이 얼마나 되나요?', v: pct(housingRatio), bench: '건전 기준 28% 이하', pv: housingRatio / 0.28, cls: housingRatio <= 0.28 ? 'ok' : housingRatio <= 0.4 ? 'warn' : 'bad', st: housingRatio <= 0.28 ? '✅ 주거 부담이 적정해요' : '⚠️ 주거 부담이 다소 높아요', why: `월 수입 대비 주택 대출 원리금 비율${s_mamort_y > 0 ? ' — 주담대 원리금 통합 입력분 ' + fmt(s_mamort_y / 12) + '만원/월 포함' : ''}. 28% 이하여야 다른 생활과 저축도 여유 있게 가능합니다.` },
      { grp: '안정성', q: '소비성 대출(신용대출 등)은 얼마나 되나요?', v: pct(consRatio), bench: '건전 기준 20% 이하', pv: consRatio / 0.2, cls: consRatio <= 0.2 ? 'ok' : consRatio <= 0.3 ? 'warn' : 'bad', st: consRatio <= 0.2 ? '✅ 소비성 부채가 적정해요' : '🚨 소비성 부채 정리가 필요해요', why: '신용대출·카드론 등 소비성 부채는 금리가 높아 재무에 가장 나쁜 영향을 줍니다. 최우선으로 갚으세요.' },
      { grp: '성장성', q: '버는 돈 중 얼마나 저축·투자하고 있나요?', v: pct(savRate), bench: '권장 10% 이상 (이상적 20%)', pv: savRate / 0.2, cls: savRate >= 0.1 ? 'ok' : savRate >= 0.05 ? 'warn' : 'bad', st: savRate >= 0.2 ? '✅ 훌륭한 저축률이에요' : savRate >= 0.1 ? '✅ 양호한 저축률이에요' : savRate >= 0.05 ? '⚠️ 저축률을 높여야 해요' : '🚨 저축이 거의 없어요', why: '미래 재무목표 달성의 핵심입니다. 수입의 최소 10%, 가능하면 20% 이상을 저축하는 것이 목표입니다.' },
      { grp: '성장성', q: '미래를 위한 투자 자산은 얼마나 되나요?', v: pct(investRatio), bench: '연령에 따라 다름', pv: investRatio / 0.5, cls: investRatio >= 0.3 ? 'ok' : investRatio >= 0.15 ? 'warn' : 'bad', st: investRatio >= 0.3 ? '✅ 투자 자산이 충분해요' : investRatio >= 0.15 ? '⚠️ 투자 자산을 늘려가세요' : '🚨 투자 자산이 부족해요', why: '주식·펀드·ETF·연금 등 투자자산은 장기적으로 자산을 불리는 엔진입니다. 나이가 젊을수록 더 높은 비중이 권장됩니다.' },
    ];
  } else if (mode === 'yang') {
    const agLabel = ag + (ag === 55 ? '세 이상' : '대');
    const ef = yv('emergency', ag), dt = yv('debtTot', ag), ds = yv('dsr', ag), h = yv('housing', ag);
    const c = yv('consumer', ag), sv = yv('savings', ag), inv = yv('investAsset', ag);
    const fin = yv('finAsset', ag), bud = yv('budget', ag), ins = yv('insurance', ag);
    const efByIncome = iM > 0 ? liqAsset / iM : 0;
    ratios = [
      { grp: '유동성', q: '월수입 대비 비상자금이 충분한가요?', v: efByIncome.toFixed(1) + '배', bench: `월수입 ${ef}배 이상 (${agLabel})`, pv: efByIncome / ef, cls: efByIncome >= ef ? 'ok' : efByIncome >= ef * 0.6 ? 'warn' : 'bad', st: efByIncome >= ef ? `✅ ${ef}배 기준 충족` : `⚠️ ${ef}배 목표 미달`, why: `${agLabel} 기준 월수입의 ${ef}배를 유동성 자산으로 보유하는 것이 권장됩니다.` },
      { grp: '안정성', q: '보험료가 적정한가요?', v: pct(insRatio), bench: `수입의 ${ins}% 전후 (${agLabel})`, pv: insRatio / (ins / 100), cls: insRatio >= ins / 100 * 0.7 && insRatio <= ins / 100 * 1.3 ? 'ok' : insRatio <= ins / 100 * 1.5 ? 'warn' : 'bad', st: insRatio <= ins / 100 * 1.3 ? `✅ 보험료 적정` : `⚠️ 보험료 점검 필요`, why: `보장성 보험료는 수입의 ${ins}% 수준이 적정합니다. 과도하면 저축 여력이 줄고, 부족하면 위험에 노출됩니다.` },
      { grp: '안정성', q: '내 재산 중 빚이 얼마나 되나요?', v: pct(debtRatio), bench: `${dt}% 이하 (${agLabel})`, pv: debtRatio / (dt / 100), cls: debtRatio <= dt / 100 ? 'ok' : debtRatio <= dt / 100 + 0.1 ? 'warn' : 'bad', st: debtRatio <= dt / 100 ? '✅ 부채 수준 건전' : '🚨 부채 감축이 필요해요', why: `${agLabel} 기준 총자산 대비 총부채 ${dt}% 이하가 권장됩니다.` },
      { grp: '안정성', q: '버는 돈 중 대출 갚는 데 얼마나 쓰나요?', v: pct(dsr), bench: `${ds}% 이하 (${agLabel})`, pv: ds > 0 ? dsr / (ds / 100) : dsr > 0 ? 2 : 0, cls: (ds === 0 ? (dsr === 0 ? 'ok' : 'bad') : dsr <= ds / 100 ? 'ok' : dsr <= ds / 100 + 0.1 ? 'warn' : 'bad'), st: ds === 0 ? (dsr === 0 ? '✅ 부채 없음' : '🚨 은퇴 후 부채 위험') : (dsr <= ds / 100 ? '✅ 상환 부담 적정' : '🚨 상환 부담 과중'), why: `${agLabel} 기준 총부채상환비율 ${ds}% 이하가 권장됩니다.` },
      { grp: '안정성', q: '주택 관련 대출 부담은요?', v: pct(housingRatio), bench: `${h}% 이하 (${agLabel})`, pv: housingRatio / (h / 100), cls: housingRatio <= h / 100 ? 'ok' : housingRatio <= h / 100 + 0.1 ? 'warn' : 'bad', st: housingRatio <= h / 100 ? '✅ 주거부채 적정' : '⚠️ 주거부채 부담 과다', why: `주거 관련 대출 원리금이 월수입의 ${h}%를 넘지 않도록 관리하세요.` },
      { grp: '안정성', q: '소비성 대출(신용대출 등)은요?', v: pct(consRatio), bench: `${c}% 이하 (${agLabel})`, pv: consRatio / (c / 100), cls: consRatio <= c / 100 ? 'ok' : consRatio <= c / 100 + 0.1 ? 'warn' : 'bad', st: consRatio <= c / 100 ? '✅ 소비성 부채 양호' : '🚨 즉시 정리 필요', why: `소비성 부채는 고금리라 재무에 매우 불리합니다. 월수입의 ${c}% 이하로 줄여야 합니다.` },
      { grp: '성장성', q: '생활비 대비 수입 균형은 어떤가요?', v: pct(budgetRatio), bench: `지출/수입 ${bud}% 이하 (${agLabel})`, pv: budgetRatio / (bud / 100), cls: budgetRatio <= bud / 100 ? 'ok' : budgetRatio <= bud / 100 + 0.1 ? 'warn' : 'bad', st: budgetRatio <= bud / 100 ? '✅ 지출 관리가 잘 돼요' : '🚨 지출이 수입을 초과해요', why: '수입 대비 지출(생활비+고정지출) 비율. 너무 높으면 저축할 여유가 없습니다.' },
      { grp: '성장성', q: '저축을 충분히 하고 있나요?', v: pct(savRate), bench: `${sv}% 이상 (${agLabel})`, pv: savRate / (sv / 100), cls: savRate >= sv / 100 ? 'ok' : savRate >= sv / 100 * 0.7 ? 'warn' : 'bad', st: savRate >= sv / 100 ? `✅ ${sv}% 목표 달성` : `⚠️ 저축률 ${sv}% 목표 미달`, why: `${agLabel} 기준 수입의 ${sv}% 이상을 저축·투자에 배분하는 것이 권장됩니다.` },
      { grp: '성장성', q: '투자 자산 비중이 충분한가요?', v: pct(investRatio), bench: `금융투자자산/총자산 ${inv}% 이상 (${agLabel})`, pv: investRatio / (inv / 100), cls: investRatio >= inv / 100 ? 'ok' : investRatio >= inv / 100 * 0.6 ? 'warn' : 'bad', st: investRatio >= inv / 100 ? '✅ 투자자산 비중 양호' : '⚠️ 투자자산 확대 필요', why: `${agLabel} 기준 총자산 중 금융투자자산(주식·펀드·연금 등) 비중 ${inv}% 이상이 권장됩니다.` },
      { grp: '성장성', q: '금융자산 전체 비중은 어떤가요?', v: pct(finRatio), bench: `금융자산/총자산 ${fin}% 이상 (${agLabel})`, pv: finRatio / (fin / 100), cls: finRatio >= fin / 100 ? 'ok' : finRatio >= fin / 100 * 0.6 ? 'warn' : 'bad', st: finRatio >= fin / 100 ? '✅ 금융자산 비중 양호' : '⚠️ 금융자산 확대 필요', why: `부동산에 집중된 자산은 유동성이 낮아 위기 시 대응이 어렵습니다. 금융자산 비중 ${fin}% 이상을 권장합니다.` },
    ];
  } else {
    // sgw
    const agLabel = ag + (ag === 55 ? '세 이상' : '대');
    const bud = sgwv('budget', ag), ef = sgwv('emergency', ag), dt = sgwv('debtTot', ag);
    const ds = sgwv('dsr', ag), sv = sgwv('savings', ag), iv = sgwv('investFlow', ag);
    ratios = [
      { grp: '유동성', q: '비상자금이 생활비의 몇 달치인가요?', v: efRatio.toFixed(1) + '개월', bench: `유동성자산/월지출 ${ef}배 이상 (${agLabel})`, pv: efRatio / ef, cls: efRatio >= ef ? 'ok' : efRatio >= ef * 0.6 ? 'warn' : 'bad', st: efRatio >= ef ? `✅ ${ef}개월치 확보` : `⚠️ ${ef}개월치 미달`, why: `유동성자산/월평균총지출 ${ef}배 이상 권장. 갑작스러운 실직·의료비 등 비상상황에 대비해 별도 보관하세요. (서민금융진흥원 기준)` },
      { grp: '안정성', q: '생활비가 수입 범위 내에 있나요?', v: pct(budgetRatio), bench: `총지출/총소득 ${bud}% 이하 (${agLabel})`, pv: budgetRatio / (bud / 100), cls: budgetRatio <= bud / 100 ? 'ok' : budgetRatio <= bud / 100 + 0.05 ? 'warn' : 'bad', st: budgetRatio <= bud / 100 ? '✅ 가계수지 양호' : '🚨 지출이 수입을 초과', why: `총지출/총소득 ${bud}% 이하가 건전 기준입니다. 초과 시 저축 여력이 없거나 적자 상태입니다. (서민금융진흥원 기준)` },
      { grp: '안정성', q: '내 재산 중 빚이 얼마나 되나요?', v: pct(debtRatio), bench: `총부채/총자산 ${dt}% 이하 (전 연령)`, pv: debtRatio / (dt / 100), cls: debtRatio <= dt / 100 ? 'ok' : debtRatio <= dt / 100 + 0.1 ? 'warn' : 'bad', st: debtRatio <= dt / 100 ? '✅ 부채 수준 건전' : '🚨 부채 감축 필요', why: `총부채/총자산 ${dt}% 이하가 권장됩니다. 높을수록 금리 상승·자산 하락 시 위험합니다. (서민금융진흥원 기준)` },
      { grp: '안정성', q: '버는 돈 중 대출 갚는 데 얼마나 쓰나요?', v: pct(dsr), bench: `총부채상환액/총소득 ${ds}% 이하 (전 연령)`, pv: ds > 0 ? dsr / (ds / 100) : dsr > 0 ? 2 : 0, cls: dsr <= ds / 100 ? 'ok' : dsr <= ds / 100 + 0.05 ? 'warn' : 'bad', st: dsr <= ds / 100 ? '✅ 상환 부담 적정' : '🚨 상환 부담 과중', why: `총부채상환액/총소득 ${ds}% 이하가 건전 기준입니다. 초과 시 생활 여유가 줄고 추가 충격에 취약합니다. (서민금융진흥원 기준)` },
      { grp: '성장성', q: '버는 돈 중 얼마나 저축하고 있나요?', v: pct(savRate), bench: `총저축/총소득 ${sv}% 이상 (${agLabel})`, pv: sv > 0 ? savRate / (sv / 100) : savRate > 0 ? 2 : 0, cls: savRate >= sv / 100 ? 'ok' : savRate >= sv / 100 * 0.7 ? 'warn' : 'bad', st: savRate >= sv / 100 ? `✅ ${sv}% 목표 달성` : `⚠️ 저축률 ${sv}% 미달`, why: `총저축/총소득 ${sv}% 이상 권장. 젊을수록 더 높은 저축률로 장기 자산을 쌓아야 합니다. (서민금융진흥원 기준)` },
      { grp: '성장성', q: '저축 중 투자성 저축 비중은요?', v: pct(investFlowRatio), bench: `금융투자저축/총저축 ${iv}% 이상 (${agLabel})`, pv: iv > 0 ? investFlowRatio / (iv / 100) : 0, cls: investFlowRatio >= iv / 100 ? 'ok' : investFlowRatio >= iv / 100 * 0.6 ? 'warn' : 'bad', st: investFlowRatio >= iv / 100 ? '✅ 투자성 저축 비중 양호' : '⚠️ 투자성 저축 확대 필요', why: `펀드·ETF·연금저축·IRP 등 금융투자저축이 총저축의 ${iv}% 이상이 권장됩니다. (서민금융진흥원 기준)` },
    ];
  }

  const good = ratios.filter(r => r.cls === 'ok');
  const warn = ratios.filter(r => r.cls === 'warn');
  const bad = ratios.filter(r => r.cls === 'bad');
  const score = bs.aTotal === 0 && iM === 0 ? null : Math.round((good.length * 10 + warn.length * 5) / ratios.length * 10);
  const scoreMsg = score === null ? null : score >= 80 ? '재무 관리를 훌륭하게 하고 계세요' : score >= 60 ? '몇 가지 항목만 개선하면 더 탄탄해집니다' : score >= 40 ? '지금부터 하나씩 정리해 나가면 됩니다' : '가장 위험한 항목부터 해결하세요';

  res.json({ ratios, score, scoreMsg, goodCount: good.length, warnCount: warn.length, badCount: bad.length });
};
