const CRISES = [
  {name:'IMF 외환위기',   s:{y:1997,m:10}, e:{y:1998,m:6}},
  {name:'닷컴버블',       s:{y:2000,m:3},  e:{y:2002,m:10}},
  {name:'카드대란',       s:{y:2003,m:1},  e:{y:2003,m:9}},
  {name:'글로벌 금융위기',s:{y:2007,m:11}, e:{y:2009,m:3}},
  {name:'코로나19',       s:{y:2020,m:1},  e:{y:2020,m:3}},
  {name:'금리인상 충격',  s:{y:2022,m:1},  e:{y:2022,m:9}},
];

function runEngine(portfolioRows, assetDataMap, fxMap, settings, assetDefs) {
  const {startYear, endYear, initialAmount, annualAddition, additionTiming='start', rebalancing} = settings;
  const initKRW = initialAmount * 10000;
  const addKRW   = annualAddition * 10000;

  const assets = portfolioRows
    .filter(r => r.assetId && parseFloat(r.weight)>0 && assetDataMap[r.assetId])
    .map(r => ({id:r.assetId, w:parseFloat(r.weight)/100, data:assetDataMap[r.assetId], def:assetDefs[r.assetId]||{cur:'KRW'}}));

  if(!assets.length) return null;

  const totalW = assets.reduce((s,a)=>s+a.w,0);
  assets.forEach(a=>a.w/=totalW);

  const getFX = (y,m) => {
    if(!fxMap) return 1350;
    const v = fxMap[`${y}-${m}`];
    if(v) return v;
    const prevKey = m === 1  ? `${y-1}-12` : `${y}-${m-1}`;
    const nextKey = m === 12 ? `${y+1}-1`  : `${y}-${m+1}`;
    return fxMap[prevKey] || fxMap[nextKey] || 1350;
  };

  const getPrice = (asset, y, m) => {
    const key = `${y}-${m}`;
    const data = asset.data;
    if(data.isReturn) return null;
    const p = data.priceMap[key];
    if(!p || !isFinite(p)) return null;
    if(asset.def.cur === 'USD') return p * getFX(y,m);
    return p;
  };

  const getReturn = (asset, y, m) => {
    if(!asset.data.isReturn) return null;
    return asset.data.priceMap[`${y}-${m}`] ?? null;
  };

  const months = [];
  for(let y=startYear; y<=endYear; y++){
    const mMax = y===endYear ? new Date().getMonth()+1 : 12;
    for(let m=1; m<=mMax; m++) months.push({y,m});
  }

  const holdings = {};
  const lastPrice = {};
  let initialized = false;
  let firstDate = null;
  const monthlyValues = [];

  const shouldRebal = (m) => {
    if(rebalancing==='none') return false;
    if(rebalancing==='annual') return m===1;
    if(rebalancing==='semi') return m===1||m===7;
    if(rebalancing==='quarterly') return [1,4,7,10].includes(m);
    return false;
  };

  months.forEach(({y,m}) => {
    if(initialized && addKRW > 0){
      const addThisMonth =
        additionTiming === 'monthly'             ? addKRW :
        additionTiming === 'end'   && m === 12   ? addKRW :
        additionTiming === 'start' && m === 1    ? addKRW : 0;
      if(addThisMonth > 0){
        assets.forEach(a => {
          const add = addThisMonth * a.w;
          if(a.data.isReturn){
            holdings[a.id] = (holdings[a.id]||0) + add;
          } else {
            const p = getPrice(a, y, m);
            if(p) holdings[a.id] = (holdings[a.id]||0) + add/p;
          }
        });
      }
    }

    if(initialized){
      assets.forEach(a => {
        if(!a.data.isReturn) return;
        const ret = getReturn(a, y, m);
        if(ret !== null && holdings[a.id] != null){
          holdings[a.id] *= (1 + ret);
        }
      });
    }

    assets.forEach(a => {
      if(!a.data.isReturn){ const p = getPrice(a,y,m); if(p!=null) lastPrice[a.id]=p; }
    });

    const avail = assets.map(a => {
      if(a.data.isReturn) return getReturn(a, y, m) !== null;
      return getPrice(a, y, m) !== null;
    });

    if(!initialized && !avail.some(Boolean)) return;

    let justInitialized = false;
    if(!initialized){
      initialized = true;
      justInitialized = true;
      firstDate = {y,m};
      const availW = assets.reduce((s,a,i)=>avail[i]?s+a.w:s,0);
      assets.forEach((a,i) => {
        if(!avail[i]) return;
        const alloc = initKRW * (a.w / availW);
        if(a.data.isReturn){
          holdings[a.id] = alloc;
        } else {
          const p = getPrice(a, y, m);
          if(p) holdings[a.id] = alloc / p;
        }
      });
    }

    const assetVals = assets.map((a,i) => {
      if(holdings[a.id] == null) return 0;
      if(a.data.isReturn) return holdings[a.id];
      const p = getPrice(a, y, m) ?? lastPrice[a.id];
      return p ? holdings[a.id] * p : 0;
    });
    const total = assetVals.reduce((s,v)=>s+v,0);
    monthlyValues.push({y,m,value:total,assetVals:[...assetVals]});

    if(initialized && !justInitialized && shouldRebal(m) && total>0){
      const rebalAvailW = assets.reduce((s,a,i)=>avail[i]?s+a.w:s,0)||1;
      assets.forEach((a,i) => {
        if(!avail[i]) return;
        const target = total * (a.w / rebalAvailW);
        if(a.data.isReturn){
          holdings[a.id] = target;
        } else {
          const p = getPrice(a, y, m);
          if(p) holdings[a.id] = target / p;
        }
      });
    }
  });

  if(!monthlyValues.length) return null;

  const iv = monthlyValues[0].value;
  const fv = monthlyValues[monthlyValues.length-1].value;
  const yrs = monthlyValues.length / 12;
  const cagr = yrs > 0 ? (Math.pow(fv/iv, 1/yrs)-1)*100 : 0;

  const mRets = [];
  for(let i=1; i<monthlyValues.length; i++){
    mRets.push((monthlyValues[i].value - monthlyValues[i-1].value) / monthlyValues[i-1].value);
  }
  const avgR = mRets.reduce((s,v)=>s+v,0)/(mRets.length||1);
  const variance = mRets.reduce((s,v)=>s+(v-avgR)**2,0)/(mRets.length||1);
  const annualVol = Math.sqrt(variance)*Math.sqrt(12)*100;

  const rfRate = 0.03;
  const sharpe = annualVol>0 ? (cagr/100 - rfRate) / (annualVol/100) : 0;

  const negRets = mRets.filter(r=>r<0);
  const downDev = negRets.length ? Math.sqrt(negRets.reduce((s,r)=>s+r**2,0)/mRets.length)*Math.sqrt(12)*100 : 0;
  const sortino = downDev>0 ? (cagr/100 - rfRate) / (downDev/100) : 0;

  let peak = iv, mdd = 0, mddEnd = null;
  monthlyValues.forEach(p => {
    if(p.value>peak) peak=p.value;
    const dd = (peak-p.value)/peak;
    if(dd>mdd){ mdd=dd; mddEnd={y:p.y,m:p.m}; }
  });

  const yearEndVal = {};
  monthlyValues.forEach(p => { yearEndVal[p.y] = p.value; });
  const sortedYrs = Object.keys(yearEndVal).map(Number).sort((a,b)=>a-b);
  const annualRets = sortedYrs.map((y, i) => {
    const endVal   = yearEndVal[y];
    const startVal = i === 0
      ? monthlyValues.find(p => p.y === y).value
      : yearEndVal[sortedYrs[i-1]];
    return { year: y, ret: (endVal - startVal) / startVal * 100 };
  });

  const bestYear  = annualRets.reduce((a,b)=>a.ret>b.ret?a:b, annualRets[0]);
  const worstYear = annualRets.reduce((a,b)=>a.ret<b.ret?a:b, annualRets[0]);
  const arithMean = annualRets.reduce((s,r)=>s+r.ret,0)/annualRets.length;

  const assetMetrics = assets.map(a => {
    const empty = {standaloneCagr:0, standaloneVol:0,
      standaloneBest:{ret:-Infinity,y:'—'}, standaloneWorst:{ret:Infinity,y:'—'}};

    if(a.data.isReturn) {
      const mData = [];
      months.forEach(({y,m}) => {
        const ret = a.data.priceMap[`${y}-${m}`];
        if(ret != null) mData.push({t:y*12+m, y, ret});
      });
      if(!mData.length) return empty;

      let compound = 1;
      const byYr = {};
      mData.forEach(({y,ret}) => {
        compound *= (1+ret);
        byYr[y] = (byYr[y]||1) * (1+ret);
      });
      const yr = (mData[mData.length-1].t - mData[0].t) / 12;
      const cagr = yr>0 ? (Math.pow(compound,1/yr)-1)*100 : 0;

      const rArr = mData.map(d=>d.ret);
      const avgR = rArr.reduce((s,v)=>s+v,0)/(rArr.length||1);
      const vol = Math.sqrt(rArr.reduce((s,v)=>s+(v-avgR)**2,0)/(rArr.length||1))*Math.sqrt(12)*100;

      const aRets = Object.entries(byYr).map(([y,val])=>({y:+y, ret:(val-1)*100}));
      return {
        standaloneCagr: cagr, standaloneVol: vol,
        standaloneBest:  aRets.reduce((a,b)=>a.ret>b.ret?a:b, {ret:-Infinity,y:'—'}),
        standaloneWorst: aRets.reduce((a,b)=>a.ret<b.ret?a:b, {ret:Infinity, y:'—'}),
      };
    } else {
      const mData = [];
      months.forEach(({y,m}) => {
        const rawP = a.data.priceMap[`${y}-${m}`];
        if(!rawP || !isFinite(rawP)) return;
        const p = a.def.cur==='USD' ? rawP*getFX(y,m) : rawP;
        mData.push({t:y*12+m, y, p});
      });
      if(!mData.length) return empty;

      const yr = (mData[mData.length-1].t - mData[0].t) / 12;
      const cagr = yr>0 ? (Math.pow(mData[mData.length-1].p/mData[0].p,1/yr)-1)*100 : 0;

      const mRets = [];
      for(let i=1;i<mData.length;i++){
        if(mData[i].t===mData[i-1].t+1)
          mRets.push((mData[i].p-mData[i-1].p)/mData[i-1].p);
      }
      const avgR = mRets.length ? mRets.reduce((s,v)=>s+v,0)/mRets.length : 0;
      const vol = mRets.length ? Math.sqrt(mRets.reduce((s,v)=>s+(v-avgR)**2,0)/mRets.length)*Math.sqrt(12)*100 : 0;

      const byYr = {};
      mData.forEach(({y,p}) => {
        if(!byYr[y]) byYr[y]={s:p,e:p}; else byYr[y].e=p;
      });
      const aRets = Object.entries(byYr).map(([y,{s,e}])=>({y:+y, ret:(e-s)/s*100}));
      return {
        standaloneCagr: cagr, standaloneVol: vol,
        standaloneBest:  aRets.reduce((a,b)=>a.ret>b.ret?a:b, {ret:-Infinity,y:'—'}),
        standaloneWorst: aRets.reduce((a,b)=>a.ret<b.ret?a:b, {ret:Infinity, y:'—'}),
      };
    }
  });

  return {
    monthlyValues, assets: assets.map(a=>({id:a.id, w:a.w})),
    firstDate, cagr, annualVol, sharpe, sortino, mdd, mddEnd,
    annualRets, bestYear, worstYear, arithMean, downDev,
    totalReturn: (fv-iv)/iv*100, iv, fv, yrs,
    assetMetrics,
  };
}

function getCrisisReturn(monthlyValues, crisis) {
  const sk = crisis.s.y*12+crisis.s.m;
  const ek = crisis.e.y*12+crisis.e.m;
  const sv = monthlyValues.find(p=>p.y*12+p.m>=sk);
  const ev = [...monthlyValues].reverse().find(p=>p.y*12+p.m<=ek);
  if(!sv||!ev) return null;
  return (ev.value-sv.value)/sv.value*100;
}

function computeRolling(monthlyValues, years) {
  const n = years * 12;
  const results = [];
  for(let i=n; i<monthlyValues.length; i++){
    const sv = monthlyValues[i-n].value;
    const ev = monthlyValues[i].value;
    const ret = (Math.pow(ev/sv, 1/years)-1)*100;
    results.push(ret);
  }
  if(!results.length) return null;
  return {
    avg: results.reduce((s,v)=>s+v,0)/results.length,
    max: Math.max(...results),
    min: Math.min(...results),
    count: results.length,
  };
}

function pearsonCorr(a, b) {
  const pairs=[];
  const n=Math.min(a.length,b.length);
  for(let i=0;i<n;i++){ if(a[i]!=null&&b[i]!=null) pairs.push([a[i],b[i]]); }
  if(pairs.length<3) return 0;
  const ma=pairs.reduce((s,p)=>s+p[0],0)/pairs.length;
  const mb=pairs.reduce((s,p)=>s+p[1],0)/pairs.length;
  let num=0,da=0,db=0;
  pairs.forEach(([x,y])=>{num+=(x-ma)*(y-mb);da+=(x-ma)**2;db+=(y-mb)**2;});
  return da&&db?num/Math.sqrt(da*db):0;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { portfolios, assetDataMap, fxMap, settings, assetDefs } = req.body;

    const results = portfolios.map(p => {
      if (!p.active) return null;
      try {
        const result = runEngine(p.rows, assetDataMap, fxMap, settings, assetDefs || {});
        if (!result) return null;

        const crisisReturns = {};
        CRISES.forEach(c => {
          crisisReturns[c.name] = getCrisisReturn(result.monthlyValues, c);
        });

        const rollingReturns = {};
        [1, 3, 5, 7, 10].forEach(yr => {
          rollingReturns[yr] = computeRolling(result.monthlyValues, yr);
        });

        const retSeries = result.assets.map((a, ai) => {
          const vals = result.monthlyValues.map(m => m.assetVals[ai]);
          const rets = [];
          for (let i = 1; i < vals.length; i++) {
            rets.push(vals[i-1] > 0 && vals[i] > 0
              ? (vals[i] - vals[i-1]) / vals[i-1]
              : null);
          }
          return rets;
        });

        const n = result.assets.length;
        const correlationMatrix = Array.from({length: n}, (_, i) =>
          Array.from({length: n}, (_, j) =>
            i === j ? 1 : pearsonCorr(retSeries[i], retSeries[j])
          )
        );

        return { ...result, crisisReturns, rollingReturns, correlationMatrix };
      } catch (e) {
        return { error: e.message };
      }
    });

    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
