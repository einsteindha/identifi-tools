// ── Backtest engine ────────────────────────────────────────────
function runEngine(portfolioRows, assetDataMap, fxMap, settings){
  const {startYear, endYear, initialAmount, annualAddition, additionTiming='start', rebalancing} = settings;
  const initKRW = initialAmount * 10000;
  const addKRW   = annualAddition * 10000;

  // Build active assets (assetId, weight, data)
  const assets = portfolioRows
    .filter(r => r.assetId && parseFloat(r.weight)>0 && assetDataMap[r.assetId])
    .map(r => ({id:r.assetId, w:parseFloat(r.weight)/100, data:assetDataMap[r.assetId], def:ASSET_DEF[r.assetId]}));

  if(!assets.length) return null;

  // Normalize weights
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

  // Get price in KRW for an asset at year/month
  const getPrice = (asset, y, m) => {
    const key = `${y}-${m}`;
    const data = asset.data;
    if(data.isReturn) return null; // handled differently
    const p = data.priceMap[key];
    if(!p || !isFinite(p)) return null; // null, 0, NaN, Infinity 모두 결측 처리
    if(asset.def.cur === 'USD') return p * getFX(y,m);
    return p;
  };

  // For return-based assets (bonds, cash), get monthly return
  const getReturn = (asset, y, m) => {
    if(!asset.data.isReturn) return null;
    return asset.data.priceMap[`${y}-${m}`] ?? null;
  };

  // Build month list
  const months = [];
  for(let y=startYear; y<=endYear; y++){
    const mMax = y===endYear ? new Date().getMonth()+1 : 12;
    for(let m=1; m<=mMax; m++) months.push({y,m});
  }

  // Holdings: price-based assets → units; return-based → KRW value
  const holdings = {}; // id → {units or value, type}
  const lastPrice = {}; // carry-forward: last known price in KRW per asset
  let initialized = false;
  let firstDate = null;
  const monthlyValues = [];

  const shouldRebal = (m, idx) => {
    if(rebalancing==='none') return false;
    if(rebalancing==='annual') return m===1;
    if(rebalancing==='semi') return m===1||m===7;
    if(rebalancing==='quarterly') return [1,4,7,10].includes(m);
    return false;
  };

  months.forEach(({y,m}, mi) => {
    // Additional contribution by timing
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

    // Apply monthly return for return-based assets
    if(initialized){
      assets.forEach(a => {
        if(!a.data.isReturn) return;
        const ret = getReturn(a, y, m);
        if(ret !== null && holdings[a.id] != null){
          holdings[a.id] *= (1 + ret);
        }
      });
    }

    // Update carry-forward prices
    assets.forEach(a => {
      if(!a.data.isReturn){ const p = getPrice(a,y,m); if(p!=null) lastPrice[a.id]=p; }
    });

    // Check which assets have data this month
    const avail = assets.map(a => {
      if(a.data.isReturn) return getReturn(a, y, m) !== null;
      return getPrice(a, y, m) !== null;
    });

    // Before initialization skip entirely if no asset has data; after init always proceed
    if(!initialized && !avail.some(Boolean)) return;

    // Initialize
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

    // Compute total portfolio value (use carry-forward price when current month has no data)
    const assetVals = assets.map((a,i) => {
      if(holdings[a.id] == null) return 0;
      if(a.data.isReturn) return holdings[a.id];
      const p = getPrice(a, y, m) ?? lastPrice[a.id];
      return p ? holdings[a.id] * p : 0;
    });
    const total = assetVals.reduce((s,v)=>s+v,0);
    monthlyValues.push({y,m,value:total,assetVals:[...assetVals]});

    // Rebalance (초기화 직후 달은 스킵 — 미할당 자산 자금 소실 방지)
    if(initialized && !justInitialized && shouldRebal(m, mi) && total>0){
      // 데이터 없는 자산 비중을 가용 자산에 재배분 — 자금 소실 방지
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

  // Compute metrics
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

  // Risk-free rate: use average ECOS 1Y bond or default 3%
  const rfRate = 0.03;
  const sharpe = annualVol>0 ? (cagr/100 - rfRate) / (annualVol/100) : 0;

  // Downside deviation (vs 0)
  const negRets = mRets.filter(r=>r<0);
  const downDev = negRets.length ? Math.sqrt(negRets.reduce((s,r)=>s+r**2,0)/mRets.length)*Math.sqrt(12)*100 : 0;
  const sortino = downDev>0 ? (cagr/100 - rfRate) / (downDev/100) : 0;

  // MDD
  let peak = iv, mdd = 0, mddEnd = null;
  monthlyValues.forEach(p => {
    if(p.value>peak) peak=p.value;
    const dd = (peak-p.value)/peak;
    if(dd>mdd){ mdd=dd; mddEnd={y:p.y,m:p.m}; }
  });

  // Annual returns: year-end to year-end (중간 누락 월에 강건)
  const yearEndVal = {};
  monthlyValues.forEach(p => { yearEndVal[p.y] = p.value; });
  const sortedYrs = Object.keys(yearEndVal).map(Number).sort((a,b)=>a-b);
  const annualRets = sortedYrs.map((y, i) => {
    const endVal   = yearEndVal[y];
    const startVal = i === 0
      ? monthlyValues.find(p => p.y === y).value   // 첫 해: 첫 데이터 포인트 기준
      : yearEndVal[sortedYrs[i-1]];                // 이후: 전년 연말 기준
    return { year: y, ret: (endVal - startVal) / startVal * 100 };
  });

  // Best/worst year
  const bestYear = annualRets.reduce((a,b)=>a.ret>b.ret?a:b, annualRets[0]);
  const worstYear = annualRets.reduce((a,b)=>a.ret<b.ret?a:b, annualRets[0]);

  // Arithmetic mean
  const arithMean = annualRets.reduce((s,r)=>s+r.ret,0)/annualRets.length;

  // Standalone asset metrics — portfolio allocation/rebalancing 과 독립적
  const assetMetrics = assets.map(a => {
    const empty = {standaloneCagr:0, standaloneVol:0,
      standaloneBest:{ret:-Infinity,y:'—'}, standaloneWorst:{ret:Infinity,y:'—'}};

    if(a.data.isReturn) {
      // return-based assets (bonds, cash): priceMap 값이 월별 수익률
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
      // price-based assets: priceMap 원가격 + FX 직접 적용 (carry-forward 없음)
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

      // 연속된 월 사이 수익률만 vol에 반영
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
    monthlyValues, assets, firstDate, cagr, annualVol, sharpe, sortino, mdd, mddEnd,
    annualRets, bestYear, worstYear, arithMean, downDev,
    totalReturn: (fv-iv)/iv*100, iv, fv, yrs,
    assetMetrics,
  };
}

// ── Crisis periods ─────────────────────────────────────────────
const CRISES = [
  {name:'IMF 외환위기',   s:{y:1997,m:10}, e:{y:1998,m:6}},
  {name:'닷컴버블',       s:{y:2000,m:3},  e:{y:2002,m:10}},
  {name:'카드대란',       s:{y:2003,m:1},  e:{y:2003,m:9}},
  {name:'글로벌 금융위기',s:{y:2007,m:11}, e:{y:2009,m:3}},
  {name:'코로나19',       s:{y:2020,m:1},  e:{y:2020,m:3}},
  {name:'금리인상 충격',  s:{y:2022,m:1},  e:{y:2022,m:9}},
];

function getCrisisReturn(monthlyValues, crisis){
  const sk = crisis.s.y*12+crisis.s.m;
  const ek = crisis.e.y*12+crisis.e.m;
  const sv = monthlyValues.find(p=>p.y*12+p.m>=sk);
  const ev = [...monthlyValues].reverse().find(p=>p.y*12+p.m<=ek);
  if(!sv||!ev) return null;
  return (ev.value-sv.value)/sv.value*100;
}

// Rolling returns
function computeRolling(monthlyValues, years){
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

// Correlation matrix — null 값은 건너뜀 (미상장·누락 구간 제외)
function pearsonCorr(a,b){
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
