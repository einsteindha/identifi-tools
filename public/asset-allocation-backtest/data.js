// ── ECOS API KEY ────────────────────────────────────────────────
const ECOS_API_KEY = 'RSVPYYLHM2SX5A2N181J';

// ── Portfolio colors ───────────────────────────────────────────
const P_COLORS = ['#185FA5','#1D9E75','#D85A30'];
const P_BG     = ['rgba(24,95,165,.12)','rgba(29,158,117,.12)','rgba(216,90,48,.12)'];

// ── Asset class definitions ────────────────────────────────────
const ASSET_DEF = {
  // 국내 주식
  KOSPI_ALL:   {name:'KOSPI 전체',         ticker:'^KS11',     cur:'KRW', grp:'국내 주식'},
  KOSPI_LARGE: {name:'KOSPI 대형주',        ticker:'069500.KS', cur:'KRW', grp:'국내 주식', proxy:'^KS11'},
  KOSDAQ:      {name:'코스닥',              ticker:'^KQ11',     cur:'KRW', grp:'국내 주식'},
  KR_DIV:      {name:'국내 배당주',         ticker:'105190.KS', cur:'KRW', grp:'국내 주식', proxy:'^KS11'},
  KR_VALUE:    {name:'국내 가치주',          ticker:'143460.KS', cur:'KRW', grp:'국내 주식', proxy:'^KS11'},
  // 해외 주식 - 미국
  US_TOTAL:    {name:'미국 전체 주식시장',  ticker:'VTI',       cur:'USD', grp:'해외 주식-미국', proxy:'SPY'},
  SP500:       {name:'미국 대형주',          ticker:'^GSPC',     cur:'USD', grp:'해외 주식-미국'},
  US_GROWTH:   {name:'미국 대형 성장주',    ticker:'VUG',       cur:'USD', grp:'해외 주식-미국', proxy:'SPY'},
  US_VALUE:    {name:'미국 대형 가치주',    ticker:'VTV',       cur:'USD', grp:'해외 주식-미국', proxy:'SPY'},
  US_MID:      {name:'미국 중형주',         ticker:'VO',        cur:'USD', grp:'해외 주식-미국', proxy:'SPY'},
  US_SMALL:    {name:'미국 소형주',         ticker:'^RUT',      cur:'USD', grp:'해외 주식-미국'},
  US_SCV:      {name:'미국 소형 가치주',    ticker:'VBR',       cur:'USD', grp:'해외 주식-미국', proxy:'IWM'},
  // 해외 주식 - 글로벌
  INTL_EX_US:  {name:'선진국 주식 (미국 제외)', ticker:'VEA',   cur:'USD', grp:'해외 주식-글로벌', proxy:'EFA'},
  WORLD:       {name:'선진국 주식 (미국 포함)', ticker:'VT',    cur:'USD', grp:'해외 주식-글로벌', proxy:'VTI'},
  EUROPE:      {name:'유럽 주식',           ticker:'VGK',       cur:'USD', grp:'해외 주식-글로벌', proxy:'EFA'},
  JAPAN:       {name:'일본 주식',           ticker:'EWJ',       cur:'USD', grp:'해외 주식-글로벌'},
  EM:          {name:'이머징 마켓',         ticker:'VWO',       cur:'USD', grp:'해외 주식-글로벌', proxy:'EEM'},
  // 국내 채권
  KR_BOND_1Y:  {name:'국내 단기채 (1년)',   ecos:{stat:'721Y001',item:'5030000'}, dur:1,  cur:'KRW', grp:'국내 채권'},
  KR_BOND_3Y:  {name:'국내 중기채 (3년)',   ecos:{stat:'721Y001',item:'5020000'}, dur:3,  cur:'KRW', grp:'국내 채권'},
  KR_BOND_10Y: {name:'국내 장기채 (10년)',  ecos:{stat:'721Y001',item:'5050000'}, dur:10, cur:'KRW', grp:'국내 채권'},
  KR_CORP:     {name:'국내 회사채 (AA-)',   ecos:{stat:'721Y001',item:'7020000'}, dur:3,  cur:'KRW', grp:'국내 채권'},
  // 해외 채권
  US_STB:      {name:'미국 단기국채',       ticker:'SHY',       cur:'USD', grp:'해외 채권'},
  US_MTB:      {name:'미국 중기국채',       ticker:'IEF',       cur:'USD', grp:'해외 채권'},
  US_LTB:      {name:'미국 장기국채',       ticker:'TLT',       cur:'USD', grp:'해외 채권'},
  US_TBOND:    {name:'미국 전체 채권시장',  ticker:'BND',       cur:'USD', grp:'해외 채권', proxy:'AGG'},
  TIPS:        {name:'TIPS (물가연동채)',   ticker:'TIP',       cur:'USD', grp:'해외 채권'},
  GLOBAL_BOND: {name:'글로벌 채권',         ticker:'BNDW',      cur:'USD', grp:'해외 채권', proxy:'BND'},
  // 대안자산
  GOLD:        {name:'금',                  ticker:'GLD',       cur:'USD', grp:'대안자산', proxy:'IAU'},
  COMMODITY:   {name:'원자재',              ticker:'DJP',       cur:'USD', grp:'대안자산', proxy:'GSG'},
  US_REIT:     {name:'미국 리츠',           ticker:'VNQ',       cur:'USD', grp:'대안자산', proxy:'IYR'},
  KR_REIT:     {name:'국내 리츠',           ticker:'088980.KS', cur:'KRW', grp:'대안자산'},
  INTL_REIT:   {name:'글로벌 리츠 (미국 제외)', ticker:'VNQI',  cur:'USD', grp:'대안자산', proxy:'VNQ'},
  GLOBAL_REIT: {name:'글로벌 리츠 (전체)', ticker:'RWO',       cur:'USD', grp:'대안자산', proxy:'VNQ'},
  CASH:        {name:'현금 (콜금리)',        ecos:{stat:'722Y001',item:'0101000',isCash:true}, cur:'KRW', grp:'대안자산'},
};

const ASSET_GROUPS = ['국내 주식','해외 주식-미국','해외 주식-글로벌','국내 채권','해외 채권','대안자산'];
const ASSET_GROUP_LABEL = {'국내 주식':'국내 주식','해외 주식-미국':'해외 주식 - 미국','해외 주식-글로벌':'해외 주식 - 글로벌','국내 채권':'국내 채권','해외 채권':'해외 채권','대안자산':'대안자산'};

// ── Presets ────────────────────────────────────────────────────
const PRESETS = {
  '올웨더 (Ray Dalio)':  {cat:'글로벌 분산형', rows:[['SP500',30],['US_LTB',40],['US_MTB',15],['GOLD',7.5],['COMMODITY',7.5]]},
  '영구 포트폴리오':      {cat:'글로벌 분산형', rows:[['SP500',25],['US_LTB',25],['GOLD',25],['CASH',25]]},
  '아이비 포트폴리오':    {cat:'글로벌 분산형', rows:[['US_TOTAL',20],['INTL_EX_US',20],['US_TBOND',20],['COMMODITY',20],['US_REIT',20]]},
  '한국형 60/40':         {cat:'한국 투자자형', rows:[['KOSPI_ALL',50],['KR_BOND_3Y',40],['CASH',10]]},
  '국내외 균형':          {cat:'한국 투자자형', rows:[['KOSPI_ALL',30],['SP500',20],['INTL_EX_US',10],['KR_BOND_3Y',30],['GOLD',10]]},
  '적극 성장형':          {cat:'한국 투자자형', rows:[['KOSPI_ALL',30],['SP500',40],['EM',10],['KR_BOND_3Y',15],['GOLD',5]]},
  '안정 배당형':          {cat:'한국 투자자형', rows:[['KOSPI_LARGE',20],['KR_DIV',20],['US_REIT',15],['KR_BOND_3Y',35],['CASH',10]]},
  '주식/채권 60/40':      {cat:'미국 중심형',   rows:[['US_TOTAL',60],['US_TBOND',40]]},
  '3펀드 포트폴리오':     {cat:'미국 중심형',   rows:[['US_TOTAL',50],['INTL_EX_US',30],['US_TBOND',20]]},
  '워런 버핏 유언장':     {cat:'미국 중심형',   rows:[['SP500',90],['US_STB',10]]},
};

// ── State ──────────────────────────────────────────────────────
const CY = new Date().getFullYear();
const state = {
  settings:{startYear:2006, endYear:CY, initialAmount:1000, annualAddition:0, additionTiming:'start', rebalancing:'annual', benchmark:'none'},
  portfolios:[{name:'포트폴리오 1'},{name:'포트폴리오 2'},{name:'포트폴리오 3'}],
  rows: Array.from({length:8}, ()=>({assetId:'', weights:['','','']})),
};
const dataCache = new Map();
let fxCache = null;

// ── Data fetching ──────────────────────────────────────────────
const PROXIES = [
  u=>`https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
  u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,
  u=>`https://thingproxy.freeboard.io/fetch/${u}`,
  u=>`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];
let _wpi = -1;
let _ecosProxy = undefined; // undefined=미시도, null=직접호출, 0~3=프록시 인덱스

async function tryFetch(url, makeProxy){
  const pu = makeProxy ? makeProxy(url) : url;
  const r = await fetch(pu, {signal:AbortSignal.timeout(9000)});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  if(!text || text.trim().startsWith('<')) throw new Error('HTML response');
  const parsed = JSON.parse(text);
  if(parsed.contents){
    const inner = JSON.parse(parsed.contents);
    return inner;
  }
  return parsed;
}

async function yahooFetch(url){
  if(_wpi !== -1){
    try{ return await tryFetch(url, PROXIES[_wpi]); }catch(e){ _wpi=-1; }
  }
  return new Promise((resolve, reject) => {
    const cands = [
      {idx:-1, fn:()=>tryFetch(url,null)},
      ...PROXIES.map((p,i)=>({idx:i, fn:()=>tryFetch(url,p)})),
    ];
    let settled=0, done=false;
    cands.forEach(({idx,fn})=>{
      fn().then(d=>{ if(!done){done=true;_wpi=idx;resolve(d);} })
         .catch(()=>{ settled++; if(settled===cands.length&&!done) reject(new Error('모든 프록시 실패')); });
    });
  });
}

async function fetchYahooPrices(ticker, startYear, endYear){
  const t1 = Math.floor(new Date(`${startYear}-01-01`).getTime()/1000);
  const t2 = Math.floor(new Date(`${endYear}-12-31`).getTime()/1000);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${t1}&period2=${t2}&interval=1mo&events=adjclose`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${t1}&period2=${t2}&interval=1mo&events=adjclose`,
  ];
  let result = null;
  for(const url of urls){
    try{
      const d = await yahooFetch(url);
      const r = d?.chart?.result?.[0];
      if(r){ result=r; break; }
    }catch(e){}
  }
  if(!result) throw new Error(`${ticker} 데이터 없음`);
  const ts = result.timestamp;
  const closes = result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close;
  if(!ts||!closes) throw new Error(`${ticker} 데이터 없음`);
  const priceMap = {};
  ts.forEach((t,i)=>{
    if(!closes[i] || !isFinite(closes[i])) return; // null, 0, NaN 제거
    const d = new Date(t*1000);
    priceMap[`${d.getFullYear()}-${d.getMonth()+1}`] = closes[i];
  });
  // 인접 ±3개월 중앙값 대비 10배 이상 벗어난 값 제거 (API 일시 오류 방어)
  const sKeys = Object.keys(priceMap).sort((a,b)=>{
    const [ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);
    return (ay*12+am)-(by*12+bm);
  });
  sKeys.forEach((k,i)=>{
    const nb=[];
    for(let d=-3;d<=3;d++){
      if(d===0||!sKeys[i+d]||!priceMap[sKeys[i+d]]) continue;
      nb.push(priceMap[sKeys[i+d]]);
    }
    if(nb.length>=2){
      const med=nb.slice().sort((a,b)=>a-b)[Math.floor(nb.length/2)];
      const r=priceMap[k]/med;
      if(r>10||r<0.1) delete priceMap[k];
    }
  });
  const first = new Date(ts[0]*1000);
  return {priceMap, firstYear:first.getFullYear(), firstMonth:first.getMonth()+1};
}

async function fetchECOSData(stat, item, startYear, endYear){
  if(ECOS_API_KEY==='YOUR_ECOS_API_KEY') throw new Error('ECOS API 키 미설정');
  const s = `${startYear}01`, e = `${endYear}12`;
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10000/${stat}/M/${s}/${e}/${item}`;

  const toRows = d => {
    if(!d?.StatisticSearch?.row?.length) return null;
    return d.StatisticSearch.row
      .map(r=>({year:parseInt(r.TIME.slice(0,4)),month:parseInt(r.TIME.slice(4,6)),value:parseFloat(r.DATA_VALUE)}))
      .filter(r=>!isNaN(r.value));
  };

  // 캐싱된 프록시 먼저 시도
  if(_ecosProxy !== undefined){
    try{
      const d = await tryFetch(url, _ecosProxy===null ? null : PROXIES[_ecosProxy]);
      const rows = toRows(d);
      if(rows?.length) return rows;
    }catch(e){ _ecosProxy=undefined; }
  }

  // 직접 + 프록시 전체 병렬 시도 (yahooFetch 동일 패턴)
  return new Promise((resolve,reject)=>{
    const cands=[
      {key:null, fn:()=>tryFetch(url,null)},
      ...PROXIES.map((p,i)=>({key:i, fn:()=>tryFetch(url,p)})),
    ];
    let settled=0, done=false;
    cands.forEach(({key,fn})=>{
      fn()
        .then(d=>{
          const rows=toRows(d);
          if(!done&&rows?.length){ done=true; _ecosProxy=key; resolve(rows); }
          else{ settled++; if(settled===cands.length&&!done) reject(new Error('ECOS 데이터 없음')); }
        })
        .catch(()=>{ settled++; if(settled===cands.length&&!done) reject(new Error('ECOS 데이터 없음')); });
    });
  });
}

// Convert bond yield series → monthly price return series
function yieldToReturnMap(yields, duration){
  const priceMap = {};
  // 첫 달은 이전 수익률 변화 없으므로 쿠폰 수익만 반영
  if(yields.length > 0){
    const {year, month, value} = yields[0];
    priceMap[`${year}-${month}`] = value/100/12;
  }
  for(let i=1; i<yields.length; i++){
    const py = yields[i-1].value / 100;
    const cy = yields[i].value / 100;
    const modDur = duration / (1 + py);
    const ret = py/12 - modDur*(cy-py);
    const {year,month} = yields[i];
    priceMap[`${year}-${month}`] = ret;
  }
  return priceMap; // key → monthly return (not price)
}

async function fetchAssetData(assetId, startYear, endYear){
  const cacheKey = `${assetId}_${startYear}_${endYear}`;
  if(dataCache.has(cacheKey)) return dataCache.get(cacheKey);

  const def = ASSET_DEF[assetId];
  let data = null;

  if(def.ecos){
    // ECOS-based asset (Korean bonds, cash)
    const yields = await fetchECOSData(def.ecos.stat, def.ecos.item, startYear, endYear);
    if(!yields.length) throw new Error(`${def.name} 데이터 없음`);
    const first = yields[0];
    let priceMap;
    if(def.ecos.isCash){
      priceMap = {};
      yields.forEach(y=>{ priceMap[`${y.year}-${y.month}`] = y.value/100/12; }); // 첫 달 포함
    } else {
      priceMap = yieldToReturnMap(yields, def.dur);
    }
    data = {priceMap, firstYear:first.year, firstMonth:first.month, isReturn:true, proxyNote:null};
  } else {
    // Yahoo Finance asset
    try{
      const r = await fetchYahooPrices(def.ticker, startYear, endYear);
      let proxyNote = null;
      // If data starts late and we have a proxy, try to extend
      if(def.proxy && r.firstYear > startYear){
        try{
          const pr = await fetchYahooPrices(def.proxy, startYear, r.firstYear);
          // Stitch: scale proxy prices to match actual at listing
          const listKey = `${r.firstYear}-${r.firstMonth}`;
          const actualFirst = r.priceMap[listKey];
          // Find proxy price at listing
          let proxyAtList = pr.priceMap[listKey];
          if(!proxyAtList){
            // Try adjacent months
            for(let dm=-2;dm<=2;dm++){
              let m=r.firstMonth+dm, y=r.firstYear;
              if(m<1){m+=12;y--;} if(m>12){m-=12;y++;}
              if(pr.priceMap[`${y}-${m}`]){proxyAtList=pr.priceMap[`${y}-${m}`];break;}
            }
          }
          if(actualFirst && proxyAtList){
            const scale = actualFirst / proxyAtList;
            // Add proxy prices before listing
            Object.entries(pr.priceMap).forEach(([k,v])=>{
              const [ky,km] = k.split('-').map(Number);
              if(ky < r.firstYear || (ky===r.firstYear && km < r.firstMonth)){
                r.priceMap[k] = v * scale;
              }
            });
            r.firstYear = pr.firstYear;
            r.firstMonth = pr.firstMonth;
            proxyNote = `상장 전 기간은 ${def.proxy} 데이터로 대체`;
          }
        }catch(e){}
      }
      if(def.est && def.note && !proxyNote) proxyNote = def.note;
      data = {priceMap:r.priceMap, firstYear:r.firstYear, firstMonth:r.firstMonth, isReturn:false, proxyNote};
    }catch(e){
      throw new Error(`${def.name}: ${e.message}`);
    }
  }
  dataCache.set(cacheKey, data);
  return data;
}

async function fetchFX(startYear, endYear){
  const key = `${startYear}_${endYear}`;
  if(fxCache && fxCache.key===key) return fxCache.map;
  try{
    const r = await fetchYahooPrices('USDKRW=X', startYear, endYear);
    // USDKRW=X는 USD→KRW (≈1350) 반환이 정상
    // 만약 KRW→USD (≈0.00073)로 오면 역수 처리
    const map = {};
    Object.entries(r.priceMap).forEach(([k,v]) => {
      if(!v || !isFinite(v) || v <= 0) return;
      const rate = v < 10 ? 1/v : v; // per-entry 역수 처리 (0.001 → 1000)
      if(rate >= 500 && rate <= 3000) map[k] = rate; // 비합리적 FX 값 제거
    });
    fxCache = {key, map};
    return map;
  }catch(e){
    return null;
  }
}
