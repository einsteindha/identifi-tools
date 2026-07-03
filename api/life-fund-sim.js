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
    if(age<originAge) return{bal:principal,payment:0};
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

// 정기수입 - 생활비단계 - 일시유입출 = 나이별 순현금흐름 (물가/성장률 반영, 만원)
function buildCashflowArray(ages, currentAge, incomes, stages, events, inflationPct){
  const n=ages.length, arr=new Array(n).fill(0), infl=inflationPct/100;
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
      if(age>=st.startAge && age<=st.endAge){
        arr[i]-=(st.monthlyAmount||0)*12*Math.pow(1+infl, Math.max(0,age-currentAge));
      }
    }
  }
  for(const ev of (events||[])){
    const idx=ages.indexOf(ev.age);
    if(idx>=0) arr[idx]+=(ev.amount||0)*Math.pow(1+infl, Math.max(0,ev.age-currentAge));
  }
  return arr;
}

// 결정론적 금융자산 경로 (index 0 = 현재, index i>=1 = ages[i] 시점 말)
function detFinPath(finStart, expReturnPct, ages, netFlowArr){
  const r=expReturnPct/100, n=ages.length, path=new Array(n);
  path[0]=finStart;
  let b=finStart;
  for(let i=1;i<n;i++){b=Math.max(0,b*(1+r)+netFlowArr[i]);path[i]=b;}
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
      b=Math.max(0,b*(1+rr)+netFlowArr[i]);
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

    const finStart=finAsset.current||0;
    const expReturn=finAsset.expReturn||0;
    const vol=finAsset.vol||0;

    const finPathDet=detFinPath(finStart, expReturn, ages, netFlowArr);
    const netWorthDet=ages.map((a,i)=>realArr[i]+finPathDet[i]-debtBalanceArr[i]);

    const mc=monteCarlo(finStart, expReturn, vol, ages, netFlowArr, realArr, debtBalanceArr, runs);

    let debtPayoffAge=null;
    if(debts.length>0){
      for(let i=0;i<ages.length;i++){if(debtBalanceArr[i]<=0){debtPayoffAge=ages[i];break;}}
    }

    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(200).json({
      ages, real:realArr, debtBalance:debtBalanceArr, finDet:finPathDet, netWorthDet,
      p10:mc.p10, p50:mc.p50, p90:mc.p90, finP10:mc.fp10, finP50:mc.fp50, finP90:mc.fp90,
      depletionAge:mc.depletionAge, debtPayoffAge, successRate:mc.successRate
    });
  }catch(e){
    return res.status(500).json({error:e.message});
  }
};
