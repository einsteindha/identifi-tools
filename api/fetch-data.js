const ECOS_API_KEY = process.env.ECOS_API_KEY || 'RSVPYYLHM2SX5A2N181J';

const ASSET_DEF = {
  KOSPI_ALL:   {ticker:'^KS11',     cur:'KRW'},
  KOSPI_LARGE: {ticker:'069500.KS', cur:'KRW', proxy:'^KS11'},
  KOSDAQ:      {ticker:'^KQ11',     cur:'KRW'},
  KR_DIV:      {ticker:'105190.KS', cur:'KRW', proxy:'^KS11'},
  KR_VALUE:    {ticker:'143460.KS', cur:'KRW', proxy:'^KS11'},
  US_TOTAL:    {ticker:'VTI',       cur:'USD', proxy:'SPY'},
  SP500:       {ticker:'^GSPC',     cur:'USD'},
  US_GROWTH:   {ticker:'VUG',       cur:'USD', proxy:'SPY'},
  US_VALUE:    {ticker:'VTV',       cur:'USD', proxy:'SPY'},
  US_MID:      {ticker:'VO',        cur:'USD', proxy:'SPY'},
  US_SMALL:    {ticker:'^RUT',      cur:'USD'},
  US_SCV:      {ticker:'VBR',       cur:'USD', proxy:'IWM'},
  INTL_EX_US:  {ticker:'VEA',       cur:'USD', proxy:'EFA'},
  WORLD:       {ticker:'VT',        cur:'USD', proxy:'VTI'},
  EUROPE:      {ticker:'VGK',       cur:'USD', proxy:'EFA'},
  JAPAN:       {ticker:'EWJ',       cur:'USD'},
  EM:          {ticker:'VWO',       cur:'USD', proxy:'EEM'},
  KR_BOND_1Y:  {ecos:{stat:'721Y001',item:'5030000'}, dur:1,  cur:'KRW'},
  KR_BOND_3Y:  {ecos:{stat:'721Y001',item:'5020000'}, dur:3,  cur:'KRW'},
  KR_BOND_10Y: {ecos:{stat:'721Y001',item:'5050000'}, dur:10, cur:'KRW'},
  KR_CORP:     {ecos:{stat:'721Y001',item:'7020000'}, dur:3,  cur:'KRW'},
  US_STB:      {ticker:'SHY',       cur:'USD'},
  US_MTB:      {ticker:'IEF',       cur:'USD'},
  US_LTB:      {ticker:'TLT',       cur:'USD'},
  US_TBOND:    {ticker:'BND',       cur:'USD', proxy:'AGG'},
  TIPS:        {ticker:'TIP',       cur:'USD'},
  GLOBAL_BOND: {ticker:'BNDW',      cur:'USD', proxy:'BND'},
  GOLD:        {ticker:'GLD',       cur:'USD', proxy:'IAU'},
  COMMODITY:   {ticker:'DJP',       cur:'USD', proxy:'GSG'},
  US_REIT:     {ticker:'VNQ',       cur:'USD', proxy:'IYR'},
  KR_REIT:     {ticker:'088980.KS', cur:'KRW'},
  INTL_REIT:   {ticker:'VNQI',      cur:'USD', proxy:'VNQ'},
  GLOBAL_REIT: {ticker:'RWO',       cur:'USD', proxy:'VNQ'},
  CASH:        {ecos:{stat:'722Y001',item:'0101000',isCash:true}, cur:'KRW'},
};

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchYahoo(ticker, startYear, endYear) {
  const t1 = Math.floor(new Date(`${startYear}-01-01`).getTime() / 1000);
  const t2 = Math.floor(new Date(`${endYear}-12-31`).getTime() / 1000);
  const path = encodeURIComponent(ticker);

  for (const base of ['query1', 'query2']) {
    const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${path}?period1=${t1}&period2=${t2}&interval=1mo&events=adjclose&includeAdjustedClose=true`;
    try {
      const res = await fetch(url, { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.chart?.result?.[0];
      if (!r?.timestamp) continue;
      return r;
    } catch (e) { continue; }
  }
  throw new Error(`${ticker} 데이터 없음`);
}

function parseYahoo(r) {
  const ts = r.timestamp;
  const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close;
  if (!ts || !closes) throw new Error('데이터 없음');
  const priceMap = {};
  ts.forEach((t, i) => {
    const v = closes[i];
    if (!v || !isFinite(v) || v <= 0) return;
    const d = new Date(t * 1000);
    priceMap[`${d.getFullYear()}-${d.getMonth() + 1}`] = v;
  });
  // outlier filter: remove values >10x or <0.1x of 3-month median
  const keys = Object.keys(priceMap).sort((a, b) => {
    const [ay,am] = a.split('-').map(Number), [by,bm] = b.split('-').map(Number);
    return (ay*12+am) - (by*12+bm);
  });
  keys.forEach((k, i) => {
    const nb = [];
    for (let d = -3; d <= 3; d++) {
      if (d === 0 || !keys[i+d] || !priceMap[keys[i+d]]) continue;
      nb.push(priceMap[keys[i+d]]);
    }
    if (nb.length >= 2) {
      const med = nb.slice().sort((a,b)=>a-b)[Math.floor(nb.length/2)];
      const ratio = priceMap[k] / med;
      if (ratio > 10 || ratio < 0.1) delete priceMap[k];
    }
  });
  const first = new Date(ts[0] * 1000);
  return { priceMap, firstYear: first.getFullYear(), firstMonth: first.getMonth() + 1 };
}

async function fetchECOS(stat, item, startYear, endYear) {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10000/${stat}/M/${startYear}01/${endYear}12/${item}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.StatisticSearch?.row?.length) throw new Error('ECOS 데이터 없음');
  return data.StatisticSearch.row
    .map(r => ({ year: parseInt(r.TIME.slice(0,4)), month: parseInt(r.TIME.slice(4,6)), value: parseFloat(r.DATA_VALUE) }))
    .filter(r => !isNaN(r.value));
}

function yieldToReturnMap(yields, duration) {
  const priceMap = {};
  if (yields.length > 0) {
    const {year, month, value} = yields[0];
    priceMap[`${year}-${month}`] = value/100/12;
  }
  for (let i = 1; i < yields.length; i++) {
    const py = yields[i-1].value / 100;
    const cy = yields[i].value / 100;
    const modDur = duration / (1 + py);
    const ret = py/12 - modDur*(cy-py);
    const {year, month} = yields[i];
    priceMap[`${year}-${month}`] = ret;
  }
  return priceMap;
}

async function fetchOneAsset(assetId, startYear, endYear) {
  const def = ASSET_DEF[assetId];
  if (!def) throw new Error(`Unknown asset: ${assetId}`);

  if (def.ecos) {
    const yields = await fetchECOS(def.ecos.stat, def.ecos.item, startYear, endYear);
    if (!yields.length) throw new Error('데이터 없음');
    let priceMap;
    if (def.ecos.isCash) {
      priceMap = {};
      yields.forEach(y => { priceMap[`${y.year}-${y.month}`] = y.value/100/12; });
    } else {
      priceMap = yieldToReturnMap(yields, def.dur);
    }
    return { priceMap, firstYear: yields[0].year, firstMonth: yields[0].month, isReturn: true, proxyNote: null };
  }

  // Yahoo Finance
  const r = await fetchYahoo(def.ticker, startYear, endYear);
  const parsed = parseYahoo(r);
  let proxyNote = null;

  if (def.proxy && parsed.firstYear > startYear) {
    try {
      const pr = await fetchYahoo(def.proxy, startYear, parsed.firstYear);
      const parsedProxy = parseYahoo(pr);
      const listKey = `${parsed.firstYear}-${parsed.firstMonth}`;
      const actualFirst = parsed.priceMap[listKey];
      let proxyAtList = parsedProxy.priceMap[listKey];
      if (!proxyAtList) {
        for (let dm = -2; dm <= 2; dm++) {
          let m = parsed.firstMonth + dm, y = parsed.firstYear;
          if (m < 1) { m += 12; y--; } if (m > 12) { m -= 12; y++; }
          if (parsedProxy.priceMap[`${y}-${m}`]) { proxyAtList = parsedProxy.priceMap[`${y}-${m}`]; break; }
        }
      }
      if (actualFirst && proxyAtList) {
        const scale = actualFirst / proxyAtList;
        Object.entries(parsedProxy.priceMap).forEach(([k, v]) => {
          const [ky, km] = k.split('-').map(Number);
          if (ky < parsed.firstYear || (ky === parsed.firstYear && km < parsed.firstMonth)) {
            parsed.priceMap[k] = v * scale;
          }
        });
        parsed.firstYear = parsedProxy.firstYear;
        parsed.firstMonth = parsedProxy.firstMonth;
        proxyNote = `상장 전 기간은 ${def.proxy} 데이터로 대체`;
      }
    } catch (e) {}
  }

  return { priceMap: parsed.priceMap, firstYear: parsed.firstYear, firstMonth: parsed.firstMonth, isReturn: false, proxyNote };
}

async function fetchFXData(startYear, endYear) {
  try {
    const r = await fetchYahoo('USDKRW=X', startYear, endYear);
    const parsed = parseYahoo(r);
    const map = {};
    Object.entries(parsed.priceMap).forEach(([k, v]) => {
      if (!v || !isFinite(v) || v <= 0) return;
      const rate = v < 10 ? 1/v : v;
      if (rate >= 500 && rate <= 3000) map[k] = rate;
    });
    return map;
  } catch (e) {
    return null;
  }
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
    const { assetIds = [], startYear, endYear } = req.body;

    const [fxMap, ...assetResults] = await Promise.allSettled([
      fetchFXData(startYear, endYear),
      ...assetIds.map(id => fetchOneAsset(id, startYear, endYear)),
    ]);

    const assetData = {};
    assetIds.forEach((id, i) => {
      const r = assetResults[i];
      if (r.status === 'fulfilled') assetData[id] = r.value;
      else assetData[id] = { error: r.reason?.message || '데이터 없음' };
    });

    res.status(200).json({
      assetData,
      fxMap: fxMap.status === 'fulfilled' ? fxMap.value : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
