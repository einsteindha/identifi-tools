// ── 생애자금 시뮬레이터 계산 엔진 ────────────────────────────────
function randNorm(){
  let u,v,s;
  do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s>=1||s===0);
  return u*Math.sqrt(-2*Math.log(s)/s);
}

// 부채 1건의 나이별 {bal,payment} 스케줄 (원리금균등/원금균등/만기일시)
// originAge(대출실행 시점)는 currentAge보다 과거일 수 있음 — 이 경우 이미 진행된 상환분이 반영된
// 시뮬레이션 시작 시점(currentAge)의 정확한 잔액부터 계산된다.
function debtScheduleForOne(d, ages){
  const principal=d.principal||0, rate=(d.rate||0)/100, years=Math.max(1,d.years||1), originAge=d.originAge||0;
  const method=d.method||'equal_payment';
  const perYear=[];
  let bal=principal;
  if(method==='bullet'){
    for(let y=1;y<=years;y++){
      const interest=bal*rate;
      if(y===years){perYear.push({bal:0,payment:interest+bal});bal=0;}
      else perYear.push({bal,payment:interest});
    }
  }else if(method==='equal_principal'){
    const principalPay=principal/years;
    for(let y=1;y<=years;y++){
      const interest=bal*rate;
      bal=Math.max(0,bal-principalPay);
      perYear.push({bal,payment:principalPay+interest});
    }
  }else{
    const pmt=rate===0?principal/years:principal*rate/(1-Math.pow(1+rate,-years));
    for(let y=1;y<=years;y++){
      const interest=bal*rate;
      const principalPay=pmt-interest;
      bal=Math.max(0,bal-principalPay);
      perYear.push({bal,payment:pmt});
    }
  }
  return ages.map(age=>{
    if(age<originAge) return{bal:0,payment:0}; // 대출실행 전(미래 대출)에는 부채가 존재하지 않음
    const y=age-originAge;
    if(y>=years) return{bal:0,payment:0};
    return perYear[y];
  });
}

function buildDebtSchedule(debts, ages){
  const n=ages.length;
  const balance=new Array(n).fill(0), payment=new Array(n).fill(0);
  for(const d of (debts||[])){
    const sched=debtScheduleForOne(d, ages);
    for(let i=0;i<n;i++){balance[i]+=sched[i].bal;payment[i]+=sched[i].payment;}
  }
  return{balance,payment};
}

// 실물자산 여러 건: 매년 growthRate로 복리 증가. buyAge(매수시점)가 currentAge 이후이면 그 시점에
// 금융자산에서 매수금액 차감, sellAge(매도시점)가 있으면 그 시점 가치만큼 금융자산으로 편입.
// buyAge를 비워두면(null) "현재 이미 보유 중"으로 간주해 currentAge 시점 값 = value로 시작한다.
// 반환: realArr(실물자산 총액, 나이별) + cashAdj(매수/매도로 인한 금융자산 증감, 나이별)
function buildRealAssetsSchedule(realAssets, ages, currentAge){
  const n=ages.length;
  const realArr=new Array(n).fill(0);
  const cashAdj=new Array(n).fill(0);
  for(const item of (realAssets||[])){
    const rate=(item.growthRate||0)/100;
    const buyAge=(item.buyAge!=null && item.buyAge>currentAge) ? item.buyAge : currentAge;
    const sellAge=(item.sellAge!=null) ? item.sellAge : null;
    let cur=item.value||0, sold=false;
    for(let i=0;i<n;i++){
      const age=ages[i];
      if(age<buyAge) continue;
      if(age>buyAge) cur=cur*(1+rate);
      if(age===buyAge && buyAge>currentAge) cashAdj[i]-=cur;
      if(sold) continue;
      if(sellAge!=null && age===sellAge){
        cashAdj[i]+=cur;
        sold=true;
        continue;
      }
      realArr[i]+=cur;
    }
  }
  return{realArr,cashAdj};
}

// 구간이 startAge~endAge(둘 다 입력 UI상 "포함" 의미)인지 판정.
// 인접 구간이 경계 나이를 공유(예: ~65세 / 65세~)해도 이중 계산되지 않도록 종료 나이는 배타적으로 처리하되,
// 전체 시뮬레이션의 마지막 나이(lastAge)에서는 끝 경계를 포함해 마지막 해가 누락되지 않게 한다.
function inStageRange(age, startAge, endAge, lastAge){
  return age>=startAge && (age<endAge || (age===lastAge && age<=endAge));
}

// 일시(startAge===endAge) 또는 매년 반복(startAge<endAge) 흐름을 나이별 배열에 물가 반영해 더한다.
// 사용자가 직접 지정한 독립적인 구간이므로(생활비 단계처럼 자동으로 이어붙는 구조가 아님) 끝 나이를 포함한다.
function addFlow(arr, ages, currentAge, infl, startAge, endAge, amount){
  if(startAge===endAge){
    const idx=ages.indexOf(startAge);
    if(idx>=0) arr[idx]+=amount*Math.pow(1+infl, Math.max(0,startAge-currentAge));
    return;
  }
  for(let i=0;i<ages.length;i++){
    const age=ages[i];
    if(age>=startAge && age<=endAge){
      arr[i]+=amount*Math.pow(1+infl, Math.max(0,age-currentAge));
    }
  }
}

// 정기수입 - 생활비단계 - 일시/반복 유입출 = 나이별 순현금흐름 (물가/성장률 반영, 만원)
function buildCashflowArray(ages, currentAge, incomes, stages, events, inflationPct){
  const n=ages.length, arr=new Array(n).fill(0), infl=inflationPct/100, lastAge=ages[n-1];
  for(const inc of (incomes||[])){
    const growth=(inc.growth||0)/100;
    for(let i=0;i<n;i++){
      const age=ages[i];
      if(age>=inc.startAge && age<=inc.endAge){
        arr[i]+=(inc.annualAmount||0)*Math.pow(1+growth, age-inc.startAge);
      }
    }
  }
  for(const st of (stages||[])){
    for(let i=0;i<n;i++){
      const age=ages[i];
      if(inStageRange(age, st.startAge, st.endAge, lastAge)){
        arr[i]-=(st.monthlyAmount||0)*12*Math.pow(1+infl, Math.max(0,age-currentAge));
      }
    }
  }
  for(const ev of (events||[])){
    addFlow(arr, ages, currentAge, infl, ev.startAge, ev.endAge, ev.amount||0);
  }
  return arr;
}

// 지출·자산유출 (막대그래프용, 항상 양수, 만원): 생활비 단계 + 유출성 일시/반복 이벤트(음수 금액)만 포함, 유입 이벤트는 제외
function buildExpenseArray(ages, currentAge, stages, events, inflationPct){
  const n=ages.length, arr=new Array(n).fill(0), infl=inflationPct/100, lastAge=ages[n-1];
  for(const st of (stages||[])){
    for(let i=0;i<n;i++){
      const age=ages[i];
      if(inStageRange(age, st.startAge, st.endAge, lastAge)){
        arr[i]+=(st.monthlyAmount||0)*12*Math.pow(1+infl, Math.max(0,age-currentAge));
      }
    }
  }
  for(const ev of (events||[])){
    if((ev.amount||0)>=0) continue;
    addFlow(arr, ages, currentAge, infl, ev.startAge, ev.endAge, Math.abs(ev.amount));
  }
  return arr;
}

// 결정론적 금융자산 경로 (index 0 = 현재, index i>=1 = ages[i] 시점 말)
function detFinPath(finStart, expReturnPct, ages, netFlowArr){
  const r=expReturnPct/100, n=ages.length, path=new Array(n);
  path[0]=finStart;
  let b=finStart;
  for(let i=1;i<n;i++){b=b*(1+r)+netFlowArr[i];path[i]=b;}
  return path;
}

function monteCarlo(finStart, expReturnPct, volPct, ages, netFlowArr, realArr, debtBalanceArr, runs){
  const n=ages.length;
  const mu=(expReturnPct/100)-0.5*Math.pow(volPct/100,2), sigma=volPct/100;
  const nwPaths=new Array(runs), finPaths=new Array(runs);
  for(let r=0;r<runs;r++){
    let b=finStart;
    const nw=new Array(n), fp=new Array(n);
    fp[0]=b; nw[0]=realArr[0]+b-debtBalanceArr[0];
    for(let i=1;i<n;i++){
      const rr=Math.exp(mu+sigma*randNorm())-1;
      b=b*(1+rr)+netFlowArr[i];
      fp[i]=b; nw[i]=realArr[i]+b-debtBalanceArr[i];
    }
    nwPaths[r]=nw; finPaths[r]=fp;
  }
  const p10=new Array(n),p50=new Array(n),p90=new Array(n),fp10=new Array(n),fp50=new Array(n),fp90=new Array(n);
  for(let i=0;i<n;i++){
    const vals=nwPaths.map(p=>p[i]).sort((a,b)=>a-b);
    const fvals=finPaths.map(p=>p[i]).sort((a,b)=>a-b);
    const nn=vals.length;
    p10[i]=vals[Math.floor(nn*0.10)]; p50[i]=vals[Math.floor(nn*0.50)]; p90[i]=vals[Math.floor(nn*0.90)];
    fp10[i]=fvals[Math.floor(nn*0.10)]; fp50[i]=fvals[Math.floor(nn*0.50)]; fp90[i]=fvals[Math.floor(nn*0.90)];
  }
  let depletionAge=null;
  for(let i=0;i<n;i++){if(fp50[i]<=0){depletionAge=ages[i];break;}}
  let successCount=0;
  for(const nw of nwPaths) if(nw[n-1]>=0) successCount++;
  return{p10,p50,p90,fp10,fp50,fp90,depletionAge,successRate:successCount/runs*100};
}

module.exports=async(req,res)=>{
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    return res.status(200).end();
  }
  if(req.method!=='POST') return res.status(405).end();
  try{
    const body=req.body;
    const currentAge=Math.round(body.currentAge);
    const endAge=130;
    if(!(currentAge>=0 && currentAge<endAge)) return res.status(400).json({error:'currentAge invalid'});
    const ages=[];
    for(let a=currentAge;a<=endAge;a++) ages.push(a);

    const realAssets=body.realAssets||[];
    const finAsset=body.finAsset||{};
    const debts=body.debts||[];
    const runs=Math.min(20000, body.runs||10000);

    const{realArr,cashAdj:realCashAdj}=buildRealAssetsSchedule(realAssets, ages, currentAge);
    const{balance:debtBalanceArr,payment:debtPaymentArr}=buildDebtSchedule(debts, ages);
    const flowArr=buildCashflowArray(ages, currentAge, body.incomes||[], body.stages||[], body.events||[], body.inflation||0);
    const netFlowArr=flowArr.map((v,i)=>v-debtPaymentArr[i]+realCashAdj[i]);
    const expenseArr=buildExpenseArray(ages, currentAge, body.stages||[], body.events||[], body.inflation||0);

    const finStart=finAsset.current||0;
    const expReturn=finAsset.expReturn||0;
    const vol=finAsset.vol||0;

    const finPathDet=detFinPath(finStart, expReturn, ages, netFlowArr);
    const netWorthDet=ages.map((a,i)=>realArr[i]+finPathDet[i]-debtBalanceArr[i]);

    const mc=monteCarlo(finStart, expReturn, vol, ages, netFlowArr, realArr, debtBalanceArr, runs);

    // "완제 시점" = 잔액이 0보다 컸던 마지막 나이 다음 해. (미래에 대출을 실행하는 경우 원금이 생기기 전까지는
    // 잔액이 0이므로, 단순히 "처음 0이 되는 나이"를 찾으면 대출 실행 전인데 완제로 오판하게 된다.)
    let debtPayoffAge=null;
    if(debts.length>0){
      let lastPositiveIdx=-1;
      for(let i=0;i<ages.length;i++){ if(debtBalanceArr[i]>0) lastPositiveIdx=i; }
      if(lastPositiveIdx>=0 && lastPositiveIdx<ages.length-1) debtPayoffAge=ages[lastPositiveIdx+1];
    }

    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(200).json({
      ages, real:realArr, debtBalance:debtBalanceArr, finDet:finPathDet, netWorthDet, expense:expenseArr,
      p10:mc.p10, p50:mc.p50, p90:mc.p90, finP10:mc.fp10, finP50:mc.fp50, finP90:mc.fp90,
      depletionAge:mc.depletionAge, debtPayoffAge, successRate:mc.successRate
    });
  }catch(e){
    return res.status(500).json({error:e.message});
  }
};
