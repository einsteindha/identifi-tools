function randNorm(){
  let u,v,s;
  do{u=Math.random()*2-1;v=Math.random()*2-1;s=u*u+v*v;}while(s>=1||s===0);
  return u*Math.sqrt(-2*Math.log(s)/s);
}

function mc(start, wAccum, accumYrs, wRetire, ret, vol, yrs, inherit, inflowArr, runs, retAccum, volAccum){
  let ok=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2), sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2), sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start, alive=true;
    for(let y=0;y<accumYrs;y++){
      const r=(Math.exp(muA+sigA*randNorm())-1)*100;
      b=Math.max(0, b*(1+r/100)+(wAccum[y]||0));
    }
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

function mcSeqRisk(start, wAccum, accumYrs, wRetire, ret, vol, yrs, inherit, inflowArr, runs, retAccum, volAccum, seqStart, seqDur, seqRet){
  let ok=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2), sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2), sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start, alive=true;
    for(let y=0;y<accumYrs;y++){
      const r=(Math.exp(muA+sigA*randNorm())-1)*100;
      b=Math.max(0, b*(1+r/100)+(wAccum[y]||0));
    }
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

function mcPaths(start, wAccum, accumYrs, wRetire, ret, vol, yrs, inflowArr, runs, retAccum, volAccum){
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2), sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2), sigR=vol/100;
  const totalYrs=accumYrs+yrs;
  const paths=[];
  for(let i=0;i<runs;i++){
    let b=start;
    const path=[b];
    for(let y=0;y<accumYrs;y++){
      const r=(Math.exp(muA+sigA*randNorm())-1)*100;
      b=Math.max(0, b*(1+r/100)+(wAccum[y]||0));
      path.push(b);
    }
    for(let y=1;y<=yrs;y++){
      const r=(Math.exp(muR+sigR*randNorm())-1)*100;
      b=b*(1+r/100)-(wRetire[y-1]||0);
      if(inflowArr[y-1]) b+=inflowArr[y-1];
      b=Math.max(0,b);
      path.push(b);
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
  return {p10,p50,p90};
}

function mcChained(start, wAccum, accumYrs, wA, deathY, wSolo, soloPeriod, ret, vol, inherit, inflowArrA, runs, retAccum, volAccum){
  let okTotal=0, okCouple=0;
  const muA=(retAccum/100)-0.5*Math.pow(volAccum/100,2), sigA=volAccum/100;
  const muR=(ret/100)-0.5*Math.pow(vol/100,2), sigR=vol/100;
  for(let i=0;i<runs;i++){
    let b=start, alive=true;
    for(let y=0;y<accumYrs;y++){
      const r=(Math.exp(muA+sigA*randNorm())-1)*100;
      b=Math.max(0, b*(1+r/100)+(wAccum[y]||0));
    }
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
  return {
    probTotal: okTotal/runs,
    probCouple: okCouple/runs,
    condProb: okCouple>0 ? okTotal/okCouple : 0,
  };
}

function deterPathSeqFull(assetNow, wAccum, accumYrs, wRetire, retAccumPct, retPct, chartYrs, inflowArr, seqStart, seqDur, seqRet){
  let b=assetNow; const p=[b];
  for(let y=0;y<accumYrs;y++){
    b=Math.max(0,b*(1+retAccumPct/100)+(wAccum[y]||0));
    p.push(b);
  }
  for(let y=1;y<=chartYrs;y++){
    const inSeq=(y-1>=seqStart&&y-1<seqStart+seqDur);
    const r=inSeq?seqRet:retPct;
    b=b*(1+r/100)-(wRetire[y-1]||0);
    if(inflowArr&&inflowArr[y-1]) b+=inflowArr[y-1];
    p.push(Math.max(0,b));
  }
  return p;
}

module.exports = async (req, res) => {
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','POST');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    return res.status(200).end();
  }
  if(req.method!=='POST') return res.status(405).end();

  try {
    const {
      mode='main',
      assetNow, wAccum, ytr,
      wA, wS,
      ret, vol, retAccum, volAccum,
      periodA, chartPeriodA,
      soloDeathY, soloPeriod, dYIdx,
      inherit, inflowArrA,
      runs=10000,
      seqActive, seqStartV, seqDurV, seqRetV,
      chartYrs,
    } = req.body;

    if(mode==='seq'){
      const fan = mcPaths(assetNow, wAccum||[], ytr||0, wA, ret, vol, chartYrs, inflowArrA||[], runs, retAccum, volAccum);
      let seqPath = null;
      if(seqActive){
        seqPath = deterPathSeqFull(assetNow, wAccum||[], ytr||0, wA, retAccum, ret, chartYrs, inflowArrA||[], seqStartV, seqDurV, seqRetV);
      }
      return res.status(200).json({ fan, seqPath });
    }

    if(mode==='couple'){
      const _mcRaw = mc(assetNow, wAccum, ytr, wA, ret, vol, periodA, inherit, inflowArrA, runs, retAccum, volAccum);
      const probA  = Math.round(_mcRaw * 100);
      const fanA   = mcPaths(assetNow, wAccum, ytr, wA, ret, vol, chartPeriodA, inflowArrA, runs, retAccum, volAccum);
      let seqProb = null;
      if(seqActive){
        seqProb = mcSeqRisk(assetNow, wAccum, ytr, wA, ret, vol, periodA, inherit, inflowArrA, runs, retAccum, volAccum, seqStartV, seqDurV, seqRetV);
      }
      return res.status(200).json({ probA, fanA, seqProb });
    }

    if(mode==='solo'){
      const chainedResult = mcChained(assetNow, wAccum, ytr, wA, soloDeathY, wS, soloPeriod, ret, vol, inherit, inflowArrA, runs, retAccum, volAccum);
      const {startS90=0, startS50=0, startS10=0} = req.body;
      const fanS90 = mcPaths(startS90, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
      const fanS50 = mcPaths(startS50, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
      const fanS10 = mcPaths(startS10, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
      return res.status(200).json({ chainedResult, fanS90, fanS50, fanS10 });
    }

    // mode === 'main' (backward compat)
    const _mcRaw = mc(assetNow, wAccum, ytr, wA, ret, vol, periodA, inherit, inflowArrA, runs, retAccum, volAccum);
    const probA  = Math.round(_mcRaw * 100);
    const fanA   = mcPaths(assetNow, wAccum, ytr, wA, ret, vol, chartPeriodA, inflowArrA, runs, retAccum, volAccum);
    const chainedResult = mcChained(assetNow, wAccum, ytr, wA, soloDeathY, wS, soloPeriod, ret, vol, inherit, inflowArrA, runs, retAccum, volAccum);
    const startS90 = fanA.p90[dYIdx] ?? 0;
    const startS50 = fanA.p50[dYIdx] ?? 0;
    const startS10 = fanA.p10[dYIdx] ?? 0;
    const fanS90 = mcPaths(startS90, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
    const fanS50 = mcPaths(startS50, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
    const fanS10 = mcPaths(startS10, [], 0, wS, ret, vol, soloPeriod, [], runs, retAccum, volAccum);
    res.status(200).json({ probA, fanA, chainedResult, fanS90, fanS50, fanS10 });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
