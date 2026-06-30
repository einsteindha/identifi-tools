// ── 몬테카를로 기반 함수 ─────────────────────────────────────────
function randNorm(){
  let u,v,s;
  do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s>=1||s===0);
  return u*Math.sqrt(-2*Math.log(s)/s);
}

function mc(start,wAccum,accumYrs,wRetire,ret,vol,yrs,inherit,inflowArr,runs,retAccum,volAccum){
  let ok=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2),sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2),sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start,alive=true;
    for(let y=0;y<accumYrs;y++){const r=(Math.exp(muA+sigA*randNorm())-1)*100;b=Math.max(0,b*(1+r/100)+(wAccum[y]||0));}
    for(let y=1;y<=yrs;y++){
      const r=(Math.exp(muR+sigR*randNorm())-1)*100;
      b=b*(1+r/100)-(wRetire[y-1]||0);
      if(inflowArr[y-1]) b+=inflowArr[y-1];
      if(b<0){alive=false;break;}
    }
    if(alive&&b>=inherit)ok++;
  }
  return ok/runs;
}

function mcSeqRisk(start,wAccum,accumYrs,wRetire,ret,vol,yrs,inherit,inflowArr,runs,retAccum,volAccum,seqStart,seqDur,seqRet){
  let ok=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2),sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2),sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start,alive=true;
    for(let y=0;y<accumYrs;y++){const r=(Math.exp(muA+sigA*randNorm())-1)*100;b=Math.max(0,b*(1+r/100)+(wAccum[y]||0));}
    for(let y=1;y<=yrs;y++){
      const inSeq=(y-1>=seqStart&&y-1<seqStart+seqDur);
      const r=inSeq?seqRet:(Math.exp(muR+sigR*randNorm())-1)*100;
      b=b*(1+r/100)-(wRetire[y-1]||0);
      if(inflowArr[y-1]) b+=inflowArr[y-1];
      if(b<0){alive=false;break;}
    }
    if(alive&&b>=inherit)ok++;
  }
  return Math.round(ok/runs*100);
}

function mcPaths(start,wAccum,accumYrs,wRetire,ret,vol,yrs,inflowArr,runs,retAccum,volAccum){
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2),sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2),sigR=vol/100;
  const totalYrs=accumYrs+yrs;
  const paths=[];
  for(let i=0;i<runs;i++){
    let b=start;const path=[b];
    for(let y=0;y<accumYrs;y++){const r=(Math.exp(muA+sigA*randNorm())-1)*100;b=Math.max(0,b*(1+r/100)+(wAccum[y]||0));path.push(b);}
    for(let y=1;y<=yrs;y++){
      const r=(Math.exp(muR+sigR*randNorm())-1)*100;
      b=b*(1+r/100)-(wRetire[y-1]||0);
      if(inflowArr[y-1]) b+=inflowArr[y-1];
      b=Math.max(0,b);path.push(b);
    }
    paths.push(path);
  }
  const p10=[],p50=[],p90=[];
  for(let y=0;y<=totalYrs;y++){
    const vals=paths.map(p=>p[y]).sort((a,b)=>a-b);
    const n=vals.length;
    p10.push(vals[Math.floor(n*0.10)]);
    p50.push(vals[Math.floor(n*0.50)]);
    p90.push(vals[Math.floor(n*0.90)]);
  }
  return{p10,p50,p90};
}

function mcChained(start,wAccum,accumYrs,wA,deathY,wSolo,soloPeriod,ret,vol,inherit,inflowArrA,runs,retAccum,volAccum){
  let okTotal=0,okCouple=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2),sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2),sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start,alive=true;
    for(let y=0;y<accumYrs;y++){const r=(Math.exp(muA+sigA*randNorm())-1)*100;b=Math.max(0,b*(1+r/100)+(wAccum[y]||0));}
    for(let y=1;y<=deathY;y++){
      const r=(Math.exp(muR+sigR*randNorm())-1)*100;
      b=b*(1+r/100)-wA[y-1];
      if(inflowArrA[y-1]) b+=inflowArrA[y-1];
      if(b<0){alive=false;break;}
    }
    if(alive) okCouple++;
    if(alive&&soloPeriod>0){
      for(let y=1;y<=soloPeriod;y++){
        const r=(Math.exp(muR+sigR*randNorm())-1)*100;
        b=b*(1+r/100)-wSolo[y-1];
        if(b<0){alive=false;break;}
      }
    }
    if(alive&&b>=inherit) okTotal++;
  }
  return{probTotal:okTotal/runs,probCouple:okCouple/runs,condProb:okCouple>0?okTotal/okCouple:0};
}

function deterPathSeqFull(assetNow,wAccum,accumYrs,wRetire,retAccumPct,retPct,chartYrs,inflowArr,seqStart,seqDur,seqRet){
  let b=assetNow;const p=[b];
  for(let y=0;y<accumYrs;y++){b=Math.max(0,b*(1+retAccumPct/100)+(wAccum[y]||0));p.push(b);}
  for(let y=1;y<=chartYrs;y++){
    const inSeq=(y-1>=seqStart&&y-1<seqStart+seqDur);
    const r=inSeq?seqRet:retPct;
    b=b*(1+r/100)-(wRetire[y-1]||0);
    if(inflowArr&&inflowArr[y-1]) b+=inflowArr[y-1];
    p.push(Math.max(0,b));
  }
  return p;
}

// ── 화폐의 시간가치 / 인출 계산 함수 ────────────────────────────
function calcP(base,mode,ea,da,normalAge){
  if(mode==='early'){const a=-6*(normalAge-ea);return{sa:ea,amt:Math.round(base*(1+a/100)),adj:a};}
  if(mode==='defer'){const a=7.2*(da-normalAge);return{sa:da,amt:Math.round(base*(1+a/100)),adj:a};}
  return{sa:normalAge,amt:base,adj:0};
}

function calcSaveFV(base,inc,growR,r,n){
  if(n<=0) return 0;
  if(inc===0) return r>0?base*(Math.pow(1+r,n)-1)/r:base*n;
  const flatFV=r>0?base*(Math.pow(1+r,n)-1)/r:base*n;
  let growAnnFV;
  if(Math.abs(r-growR)<1e-9) growAnnFV=n*Math.pow(1+r,n-1);
  else growAnnFV=(Math.pow(1+r,n)-Math.pow(1+growR,n))/(r-growR);
  return flatFV+inc*growAnnFV;
}

function buildW(stagesData,pensions,years,infl,evts,retireAge,cashflowsData,fixedPensionsData){
  const activeS=stagesData.filter(s=>s.on);
  const monByY=new Array(years).fill(0);
  let cur=0;
  activeS.forEach(s=>{for(let y=cur;y<Math.min(cur+s.yrs,years);y++)monByY[y]=s.mon;cur+=s.yrs;});
  const lastMon=activeS.length?activeS[activeS.length-1].mon:200;
  for(let y=0;y<years;y++)if(monByY[y]===0)monByY[y]=lastMon;
  return Array.from({length:years},(_,i)=>{
    const inflFactor=Math.pow(1+infl/100,i+1);
    const living=monByY[i]*12;
    let totalP=0;
    pensions.forEach(p=>{if(i>=p.startY)totalP+=p.amt*12;});
    const ageAtY=retireAge+i;
    let extraCF=0;
    cashflowsData.forEach(cf=>{const end=cf.endAge>0?cf.endAge:200;if(ageAtY>=cf.startAge&&ageAtY<end)extraCF+=cf.amt*12;});
    let extraFP=0;
    fixedPensionsData.forEach(fp=>{const end=fp.endAge>0?fp.endAge:200;if(ageAtY>=fp.startAge&&ageAtY<end)extraFP+=fp.amt*12;});
    const evtCost=evts.filter(e=>{const ey=e.age-retireAge;return ey>=0&&Math.floor(ey)===i;})
      .reduce((s,e)=>s+e.amt*Math.pow(1+infl/100,e.age-retireAge),0);
    return living*inflFactor-totalP*inflFactor-extraCF*inflFactor-extraFP+evtCost;
  });
}

function buildInflowArr(years,retireAge,inflowsData,infl,hasSp,spExtra,spSave,spSaveInc,spSaveRate,spAge,spRet){
  return Array.from({length:years},(_,i)=>{
    const ageAtY=retireAge+i;
    const onceInflow=inflowsData.filter(e=>Math.floor(e.age)===ageAtY&&e.age>=retireAge)
      .reduce((s,e)=>s+e.amt*Math.pow(1+infl/100,e.age-retireAge),0);
    let spSaveInflow=0;
    if(hasSp&&i<spExtra){
      const curAge=retireAge+i,spIdx=curAge-spAge;
      if(spIdx>=0&&curAge<spRet) spSaveInflow=spSave+(spSaveInc>0?spSaveInc*Math.pow(1+spSaveRate/100,spIdx):0);
    }
    return onceInflow+spSaveInflow;
  });
}

function getLivingAtYear(coupleStages,yearFromRetire){
  const coupleOn=coupleStages.filter(s=>s.on);
  let cursor=0;
  for(const s of coupleOn){if(yearFromRetire<cursor+s.yrs)return s.mon;cursor+=s.yrs;}
  return coupleOn.length?coupleOn[coupleOn.length-1].mon:0;
}

function calcBufBySegments(retireAge,spRetireAge,meP,spP,bufYrs,coupleStages,cashflowsData,hasSp,age,spAge){
  const bufMonths=bufYrs*12;
  const spAgeAtMyRetire=hasSp?spAge+(retireAge-age):0;
  const T={
    mePen:meP.sa-retireAge,
    spRet:hasSp?spRetireAge-retireAge:null,
    spPen:hasSp&&spP?spP.sa-spAgeAtMyRetire:null,
  };
  const milestones=new Set([0]);
  if(T.spRet!==null&&T.spRet>0) milestones.add(T.spRet);
  if(T.mePen>0) milestones.add(T.mePen);
  if(T.spPen!==null&&T.spPen>0) milestones.add(T.spPen);
  const coupleOnStgs=coupleStages.filter(s=>s.on);
  let stgCursor=0;
  coupleOnStgs.forEach(s=>{stgCursor+=s.yrs;milestones.add(stgCursor);});
  if(stgCursor===0){const lastPen=Math.max(T.mePen,T.spPen!==null?T.spPen:0);milestones.add(lastPen+1);}
  const points=[...milestones].sort((a,b)=>a-b);
  const segments=[];
  for(let i=0;i<points.length-1;i++) segments.push({from:points[i],to:points[i+1]});
  const rows=[];
  segments.forEach(seg=>{
    const segMonths=(seg.to-seg.from)*12;
    const midY=(seg.from+seg.to)/2;
    const ageAtMid=retireAge+midY;
    const living=getLivingAtYear(coupleStages,Math.floor(midY));
    let pension=0;
    if(midY>=T.mePen) pension+=meP.amt;
    if(hasSp&&T.spPen!==null&&midY>=T.spPen) pension+=spP.amt;
    const meHasPen=midY>=T.mePen,spHasPen=hasSp&&T.spPen!==null&&midY>=T.spPen;
    let desc='';
    if(!meHasPen&&(!hasSp||!spHasPen)) desc=hasSp?'부부 모두 공적연금 미수령':'본인 공적연금 미수령';
    else if(meHasPen&&hasSp&&!spHasPen) desc='본인 연금 수령, 배우자 미수령';
    else if(!meHasPen&&hasSp&&spHasPen) desc='배우자 연금 수령, 본인 미수령';
    else desc=hasSp?'부부 모두 공적연금 수령':'본인 공적연금 수령';
    let extraIncome=0;
    cashflowsData.forEach(cf=>{const end=cf.endAge>0?cf.endAge:200;if(ageAtMid>=cf.startAge&&ageAtMid<end)extraIncome+=cf.amt;});
    const totalIncome=pension+extraIncome,netMon=Math.max(0,living-totalIncome);
    rows.push({from:seg.from,to:seg.to,fromAge:retireAge+seg.from,toAge:retireAge+seg.to,yrs:seg.to-seg.from,segMonths,living,desc,pension,extraIncome,totalIncome,netMon,monthsInBuf:0,segBuf:0});
  });
  let initBuf=0,monthsLeft=bufMonths;
  rows.forEach(r=>{const used=Math.min(r.segMonths,monthsLeft);r.monthsInBuf=used;r.segBuf=r.netMon*used;initBuf+=r.segBuf;monthsLeft-=used;});
  const totalRetYears=rows.length>0?rows[rows.length-1].to:0;
  let maxBuf=0,maxBufStartAge=retireAge;
  for(let si=0;si<rows.length;si++){
    const startYr=rows[si].from,remainMon=Math.max(0,(totalRetYears-startYr)*12);
    const winMon=Math.min(bufMonths,remainMon);
    if(winMon<=0) continue;
    let slide=0,ml=winMon;
    for(let i=si;i<rows.length&&ml>0;i++){const m=Math.min(rows[i].segMonths,ml);slide+=rows[i].netMon*m;ml-=m;}
    if(slide>maxBuf){maxBuf=slide;maxBufStartAge=retireAge+startYr;}
  }
  return{initBuf,maxBuf,maxBufStartAge,rows,bufAmt:initBuf};
}

// ── API 핸들러 ───────────────────────────────────────────────────
module.exports = async (req, res) => {
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    return res.status(200).end();
  }
  if(req.method!=='POST') return res.status(405).end();

  try {
    const body=req.body;
    const mode=body.mode||'main';

    // ── seq 모드 (시퀀스 차트 전용) ─────────────────────────────
    if(mode==='seq'){
      const{assetNow,wAccum,ytr,wA,ret,vol,retAccum,volAccum,chartYrs,inflowArrA,runs=10000,seqActive,seqStartV,seqDurV,seqRetV}=body;
      const fan=mcPaths(assetNow,wAccum||[],ytr||0,wA,ret,vol,chartYrs,inflowArrA||[],runs,retAccum,volAccum);
      let seqPath=null;
      if(seqActive) seqPath=deterPathSeqFull(assetNow,wAccum||[],ytr||0,wA,retAccum,ret,chartYrs,inflowArrA||[],seqStartV,seqDurV,seqRetV);
      return res.status(200).json({fan,seqPath});
    }

    // ── full 모드 (전체 계산 — 모든 금융 로직 서버 처리) ─────────
    if(mode==='full'){
      const{
        age,retAge,meLife,hasSp=false,spAge=0,spRet=0,spLife=0,
        assetNow=0,saveYr=0,saveInc=0,saveRate=0,
        spSave=0,spSaveInc=0,spSaveRate=0,
        retAccum=7,volAccum=15,ret=5,vol=15,
        infl=3,buf=2,inherit=0,
        mePenType='nps',meBase=0,meMode='normal',meEA=60,meDA=70,mePubAge=65,meNormalAge=65,
        spPenType='nps',spBase=0,spMode='normal',spEA=60,spDA=70,spPubAge=65,spNormalAge=65,
        stages=[],cashflows=[],fixedPensions=[],events=[],inflows=[],
        soloPensionTotal=0,
        runs=10000,seqActive=false,seqStartV=0,seqDurV=5,seqRetV=-15,
      }=body;

      // 기간 계산
      const ytr=Math.max(0,retAge-age);
      const mePeriod=Math.max(1,meLife-retAge);
      const meYears=meLife-age,spYears=hasSp?spLife-spAge:0;
      let soloWho,soloDeathY,soloPeriod,soloStartAge;
      if(hasSp){
        if(meYears<=spYears){soloWho='sp';soloDeathY=Math.max(0,meYears-ytr);soloPeriod=Math.max(0,spYears-meYears);soloStartAge=spAge+meYears;}
        else{soloWho='me';soloDeathY=Math.max(0,spYears-ytr);soloPeriod=Math.max(0,meYears-spYears);soloStartAge=age+spYears;}
      }else{soloWho='me';soloDeathY=0;soloPeriod=mePeriod;soloStartAge=retAge;}
      const periodA=hasSp?Math.max(1,soloDeathY):mePeriod;
      const spToRet=hasSp?Math.max(0,Math.min(spRet,retAge)-spAge):0;
      const spExtra=hasSp?Math.max(0,spRet-retAge):0;

      // 연금 계산
      const meP=mePenType==='pub'?{sa:mePubAge,amt:meBase,adj:0}:calcP(meBase,meMode,meEA,meDA,meNormalAge);
      const spP=hasSp?(spPenType==='pub'?{sa:spPubAge,amt:spBase,adj:0}:calcP(spBase,spMode,spEA,spDA,spNormalAge)):null;
      const mePstartY=Math.max(0,meP.sa-retAge);
      const spAgeAtRetire=hasSp?spAge+ytr:0;
      const spPstartY=hasSp&&spP?Math.max(0,spP.sa-spAgeAtRetire):999;

      // 적립기 미래가치
      const accumGrowth=Math.pow(1+retAccum/100,ytr);
      const saveFV=calcSaveFV(saveYr,saveInc,saveRate/100,retAccum/100,ytr);
      const spSaveFV=hasSp&&spToRet>0?calcSaveFV(spSave,spSaveInc,spSaveRate/100,retAccum/100,spToRet):0;

      // 적립기 연간 순저축 배열
      const wAccum=Array.from({length:Math.max(0,ytr)},(_,i)=>{
        const curAge=age+i;
        const yr1Save=saveYr+(saveInc>0?saveInc*Math.pow(1+saveRate/100,i):0);
        const spIdx=curAge-spAge;
        const yr1Sp=(hasSp&&curAge<spRet&&spIdx>=0)?spSave+(spSaveInc>0?spSaveInc*Math.pow(1+spSaveRate/100,spIdx):0):0;
        const inflowAmt=inflows.filter(e=>Math.floor(e.age)===curAge&&e.age<retAge).reduce((s,e)=>s+e.amt*Math.pow(1+infl/100,e.age-age),0);
        const eventAmt=events.filter(e=>Math.floor(e.age)===curAge&&e.age<retAge).reduce((s,e)=>s+e.amt*Math.pow(1+infl/100,e.age-age),0);
        let cfAmt=0;cashflows.forEach(cf=>{const end=cf.endAge>0?cf.endAge:retAge;if(curAge>=cf.startAge&&curAge<end&&curAge<retAge)cfAmt+=cf.amt*12*Math.pow(1+infl/100,i);});
        let fpAmt=0;fixedPensions.forEach(fp=>{const end=fp.endAge>0?fp.endAge:retAge;if(curAge>=fp.startAge&&curAge<end&&curAge<retAge)fpAmt+=fp.amt*12;});
        return yr1Save+yr1Sp+inflowAmt-eventAmt+cfAmt+fpAmt;
      });

      // 은퇴 시점 자산 (결정론적 계산)
      const preRetInflows=inflows.filter(e=>e.age>=age&&e.age<retAge).reduce((sum,e)=>sum+e.amt*Math.pow(1+retAccum/100,retAge-e.age)*Math.pow(1+infl/100,e.age-age),0);
      const preRetEvents=events.filter(e=>e.age>=age&&e.age<retAge).reduce((sum,e)=>sum+e.amt*Math.pow(1+infl/100,e.age-age)*Math.pow(1+retAccum/100,retAge-e.age),0);
      const preRetCashflows=cashflows.reduce((sum,cf)=>{
        const sA=Math.max(cf.startAge,age),eA=Math.min(cf.endAge>0?cf.endAge:retAge,retAge);
        if(sA>=eA)return sum;let fv=0;
        for(let y=0;y<eA-sA;y++)fv+=cf.amt*Math.pow(1+infl/100,sA-age+y)*Math.pow(1+retAccum/100,retAge-sA-y);
        return sum+fv;
      },0);
      const preRetFixed=fixedPensions.reduce((sum,fp)=>{
        const sA=Math.max(fp.startAge,age),eA=Math.min(fp.endAge>0?fp.endAge:retAge,retAge);
        if(sA>=eA)return sum;let fv=0;
        for(let y=0;y<eA-sA;y++)fv+=fp.amt*Math.pow(1+retAccum/100,retAge-sA-y);
        return sum+fv;
      },0);
      const assetAtRet=assetNow*accumGrowth+saveFV+spSaveFV+preRetInflows-preRetEvents+preRetCashflows+preRetFixed;

      // 인출 배열 구성
      const stagesCouple=stages.filter(s=>!s.solo);
      const stagesSolo=stages.filter(s=>s.solo);
      const pensionsA=hasSp
        ?[{startY:mePstartY,amt:meP.amt,_label:'본인 공적연금'},{startY:spPstartY,amt:spP.amt,_label:'배우자 공적연금'}]
        :[{startY:mePstartY,amt:meP.amt,_label:'본인 공적연금'}];
      const wA=buildW(stagesCouple,pensionsA,periodA,infl,events,retAge,cashflows,fixedPensions);
      const inflowArrA=buildInflowArr(periodA,retAge,inflows,infl,hasSp,spExtra,spSave,spSaveInc,spSaveRate,spAge,spRet);

      // 버퍼 계산
      const{initBuf,maxBuf,maxBufStartAge,rows:bufRows,bufAmt}=calcBufBySegments(
        retAge,hasSp?spRet:retAge,meP,spP,buf,stagesCouple,cashflows,hasSp,age,spAge
      );

      // 파생 표시값
      const investable=Math.max(0,assetAtRet-bufAmt);
      const netRet=Math.max(0.01,ret-infl);
      const rateA=investable>0&&isFinite(wA[0]/investable)?(wA[0]/investable)*100:0;
      const wAPV=wA.reduce((s,w,i)=>s+w/Math.pow(1+netRet/100,i+1),0);
      const inflowPV=inflowArrA.reduce((s,v,i)=>s+v/Math.pow(1+ret/100,i+1),0);
      const neededA=wAPV+inherit*Math.pow(1+netRet/100,-periodA)+bufAmt-inflowPV;
      const gapA=assetAtRet-neededA;
      const totalEvtFV=events.reduce((s,e)=>{const ey=e.age-retAge;return s+(ey>=0?e.amt*Math.pow(1+infl/100,ey):0);},0);
      const totalInflowFV=inflows.reduce((s,e)=>{const ey=e.age-retAge;return s+(ey>=0?e.amt*Math.pow(1+infl/100,ey):0);},0);

      // 몬테카를로: 동반 시나리오
      const _mcRaw=mc(assetNow,wAccum,ytr,wA,ret,vol,periodA,inherit,inflowArrA,runs,retAccum,volAccum);
      const probA=Math.round(_mcRaw*100);
      const fanA=mcPaths(assetNow,wAccum,ytr,wA,ret,vol,mePeriod,inflowArrA,runs,retAccum,volAccum);
      let seqProb=null,seqFullWithAccum=null,seqEndVal=null,medEndVal=null;
      if(seqActive){
        seqProb=mcSeqRisk(assetNow,wAccum,ytr,wA,ret,vol,periodA,inherit,inflowArrA,runs,retAccum,volAccum,seqStartV,seqDurV,seqRetV);
        seqFullWithAccum=deterPathSeqFull(assetNow,wAccum,ytr,wA,retAccum,ret,mePeriod,inflowArrA,seqStartV,seqDurV,seqRetV);
        const ei=Math.min(ytr+seqStartV+seqDurV,seqFullWithAccum.length-1);
        seqEndVal=seqFullWithAccum[ei];medEndVal=fanA.p50[ei]||0;
      }

      // 몬테카를로: 독거 시나리오
      let wS=null,assetAtDeath=null,soloBufAmt=null,rateS=null;
      let chainedResult=null,fanS90=null,fanS50=null,fanS10=null;
      let wSPV=null,neededS=null,gapS=null,probS=null,condProbS=null,monS=null;
      if(hasSp&&soloPeriod>0){
        const dY=Math.min(soloDeathY,periodA),dYIdx=ytr+dY;
        assetAtDeath=fanA.p50[dYIdx]??0;
        wS=buildW(stagesSolo,[{startY:0,amt:soloPensionTotal,_label:'독거자 공적연금'}],soloPeriod,infl,[],soloStartAge,cashflows,fixedPensions);
        soloBufAmt=0;
        const soloActiveStgs=stagesSolo.filter(s=>s.on);
        if(soloActiveStgs.length>0){
          let sMonLeft=Math.min(buf*12,soloPeriod*12),sCursor=0;
          for(const sg of soloActiveStgs){
            if(sMonLeft<=0)break;
            const midAge=soloStartAge+sCursor+sg.yrs/2;
            let sCF=0;cashflows.forEach(cf=>{const end=cf.endAge>0?cf.endAge:200;if(midAge>=cf.startAge&&midAge<end)sCF+=cf.amt;});
            const net=Math.max(0,sg.mon-soloPensionTotal-sCF);
            const used=Math.min(sg.yrs*12,sMonLeft);
            soloBufAmt+=net*used;sMonLeft-=used;sCursor+=sg.yrs;
          }
        }
        const soloInvestable=Math.max(0,assetAtDeath-soloBufAmt);
        rateS=soloInvestable>0?(wS[0]/soloInvestable)*100:0;
        chainedResult=mcChained(assetNow,wAccum,ytr,wA,dY,wS,soloPeriod,ret,vol,inherit,inflowArrA,runs,retAccum,volAccum);
        fanS90=mcPaths(fanA.p90[dYIdx]??0,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
        fanS50=mcPaths(fanA.p50[dYIdx]??0,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
        fanS10=mcPaths(fanA.p10[dYIdx]??0,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
        wSPV=wS.reduce((s,w,i)=>s+w/Math.pow(1+netRet/100,i+1),0);
        neededS=wSPV+inherit*Math.pow(1+netRet/100,-soloPeriod)+soloBufAmt;
        gapS=assetAtDeath-neededS;
        probS=Math.round(chainedResult.probTotal*100);
        condProbS=Math.round(chainedResult.condProb*100);
        monS=Math.round(soloInvestable*(rateS/100)/12+soloPensionTotal);
      }

      return res.status(200).json({
        meP,spP,mePstartY,spPstartY,spAgeAtRetire,
        ytr,periodA,mePeriod,soloPeriod,soloDeathY,soloWho,soloStartAge,spExtra,
        assetAtRet,saveFV,spSaveFV,wAccum,wA,inflowArrA,
        initBuf,maxBuf,maxBufStartAge,bufRows,bufAmt,
        investable,rateA,netRet,wAPV,inflowPV,neededA,gapA,
        totalEvtFV,totalInflowFV,
        probA,fanA,seqProb,seqFullWithAccum,seqEndVal,medEndVal,
        wS,assetAtDeath,soloBufAmt,rateS,chainedResult,fanS90,fanS50,fanS10,
        wSPV,neededS,gapS,probS,condProbS,monS,
      });
    }

    // ── couple / solo / main (하위 호환) ─────────────────────────
    const{assetNow,wAccum,ytr,wA,wS,ret,vol,retAccum,volAccum,periodA,chartPeriodA,soloDeathY,soloPeriod,inherit,inflowArrA,runs=10000,seqActive,seqStartV,seqDurV,seqRetV,chartYrs}=body;
    if(mode==='couple'){
      const _mcRaw=mc(assetNow,wAccum,ytr,wA,ret,vol,periodA,inherit,inflowArrA,runs,retAccum,volAccum);
      const probA=Math.round(_mcRaw*100);
      const fanA=mcPaths(assetNow,wAccum,ytr,wA,ret,vol,chartPeriodA,inflowArrA,runs,retAccum,volAccum);
      let seqProb=null;
      if(seqActive) seqProb=mcSeqRisk(assetNow,wAccum,ytr,wA,ret,vol,periodA,inherit,inflowArrA,runs,retAccum,volAccum,seqStartV,seqDurV,seqRetV);
      return res.status(200).json({probA,fanA,seqProb});
    }
    if(mode==='solo'){
      const{startS90=0,startS50=0,startS10=0}=body;
      const chainedResult=mcChained(assetNow,wAccum,ytr,wA,soloDeathY,wS,soloPeriod,ret,vol,inherit,inflowArrA,runs,retAccum,volAccum);
      const fanS90=mcPaths(startS90,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
      const fanS50=mcPaths(startS50,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
      const fanS10=mcPaths(startS10,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
      return res.status(200).json({chainedResult,fanS90,fanS50,fanS10});
    }
    // main (하위 호환)
    const _mcRaw=mc(assetNow,wAccum,ytr,wA,ret,vol,periodA,inherit,inflowArrA,runs,retAccum,volAccum);
    const probA=Math.round(_mcRaw*100);
    const fanA=mcPaths(assetNow,wAccum,ytr,wA,ret,vol,chartPeriodA,inflowArrA,runs,retAccum,volAccum);
    const chainedResult=mcChained(assetNow,wAccum,ytr,wA,soloDeathY,wS,soloPeriod,ret,vol,inherit,inflowArrA,runs,retAccum,volAccum);
    const startS90=fanA.p90[body.dYIdx]??0,startS50=fanA.p50[body.dYIdx]??0,startS10=fanA.p10[body.dYIdx]??0;
    const fanS90=mcPaths(startS90,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
    const fanS50=mcPaths(startS50,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
    const fanS10=mcPaths(startS10,[],0,wS,ret,vol,soloPeriod,[],runs,retAccum,volAccum);
    res.status(200).json({probA,fanA,chainedResult,fanS90,fanS50,fanS10});
  } catch(e) {
    res.status(500).json({error:e.message});
  }
};
