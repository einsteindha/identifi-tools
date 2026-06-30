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
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

// 모듈 레벨 캐시 (같은 Vercel 인스턴스 내 재사용)
let _yfCrumb = null, _yfCookie = null, _yfAuthTime = 0;
let _authPromise = null; // singleton: 동시 crumb 요청 방지
const _dataCache = new Map();

async function _doGetYFAuth() {
  try {
    const fcRes = await fetch('https://fc.yahoo.com/', { headers: YAHOO_HEADERS, signal: AbortSignal.timeout(5000) });
    const rawCookies = fcRes.headers.getSetCookie ? fcRes.headers.getSetCookie() : [fcRes.headers.get('set-cookie') || ''];
    const a1 = rawCookies.map(c => c.split(';')[0]).find(c => c.startsWith('A1=')) || '';
    if (!a1) throw new Error('no cookie');
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...YAHOO_HEADERS, Cookie: a1 },
      signal: AbortSignal.timeout(5000),
    });
    const crumb = (await crumbRes.text()).trim();
    if (crumb && !crumb.startsWith('<') && crumb !== 'null') {
      _yfCrumb = crumb; _yfCookie = a1; _yfAuthTime = Date.now();
    }
  } catch(e) { /* 인증 실패 시 crumb 없이 진행 */ }
  return { crumb: _yfCrumb, cookie: _yfCookie };
}

async function getYFAuth() {
  if (_yfCrumb && (Date.now() - _yfAuthTime) < 3_600_000) return { crumb: _yfCrumb, cookie: _yfCookie };
  // 동시 요청이 있으면 같은 promise를 공유 (중복 crumb 요청 방지)
  if (!_authPromise) {
    _authPromise = _doGetYFAuth().finally(() => { _authPromise = null; });
  }
  return _authPromise;
}

async function fetchYahooRaw(ticker, startYear, endYear) {
  const t1 = Math.floor(new Date(`${startYear}-01-01`).getTime() / 1000);
  const t2 = Math.floor(new Date(`${endYear}-12-31`).getTime() / 1000);
  const path = encodeURIComponent(ticker);
  const { crumb, cookie } = await getYFAuth();
  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : '';
  const cookieHdr = cookie ? { Cookie: cookie } : {};

  for (const base of ['query1', 'query2']) {
    const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${path}?period1=${t1}&period2=${t2}&interval=1mo&events=adjclose&includeAdjustedClose=true${crumbParam}`;
    try {
      const res = await fetch(url, { headers: { ...YAHOO_HEADERS, ...cookieHdr }, signal: AbortSignal.timeout(7000) });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.chart?.result?.[0];
      if (!r?.timestamp) continue;
      return r;
    } catch (e) { continue; }
  }
  return null;
}

// Stooq CSV 소스 매핑 (인증 불필요, Yahoo 실패 시 경쟁/폴백)
const STOOQ_MAP = {
  // 미국 ETF
  'VTI':'vti.us','VEA':'vea.us','BND':'bnd.us','GLD':'gld.us','VNQ':'vnq.us',
  'VUG':'vug.us','VTV':'vtv.us','VO':'vo.us','VBR':'vbr.us','VT':'vt.us',
  'VGK':'vgk.us','EWJ':'ewj.us','VWO':'vwo.us','SHY':'shy.us','IEF':'ief.us',
  'TLT':'tlt.us','AGG':'agg.us','TIP':'tip.us','BNDW':'bndw.us','DJP':'djp.us',
  'IYR':'iyr.us','VNQI':'vnqi.us','RWO':'rwo.us','SPY':'spy.us','EFA':'efa.us',
  'IWM':'iwm.us','EEM':'eem.us','IAU':'iau.us','GSG':'gsg.us',
  '^GSPC':'spx',
  // 한국 지수 (Stooq 한국 섹션)
  '^KS11':'^kos11','^KQ11':'^kosq',
};

async function fetchStooq(ticker, startYear, endYear) {
  const stooqTicker = STOOQ_MAP[ticker];
  if (!stooqTicker) return null;
  const d1 = `${startYear}0101`, d2 = `${endYear}1231`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqTicker)}&d1=${d1}&d2=${d2}&i=m`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.startsWith('No data') || text.includes('Przekroczony')) return null;
    const lines = text.trim().split('\n');
    if (lines.length < 3) return null;
    const priceMap = {};
    let fy = null, fm = null;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 5) continue;
      const [dateStr, , , , closeStr] = cols;
      const v = parseFloat(closeStr);
      if (!isFinite(v) || v <= 0) continue;
      const [y, m] = dateStr.split('-').map(Number);
      if (!fy) { fy = y; fm = m; }
      priceMap[`${y}-${m}`] = v;
    }
    if (!fy || Object.keys(priceMap).length === 0) return null;
    return { priceMap, firstYear: fy, firstMonth: fm };
  } catch(e) {
    return null;
  }
}

// Yahoo와 Stooq를 병렬로 경쟁시켜 먼저 성공한 결과 반환
async function fetchYahoo(ticker, startYear, endYear) {
  const yahooP = fetchYahooRaw(ticker, startYear, endYear)
    .then(r => r ? { source: 'yahoo', data: r } : Promise.reject(new Error('yahoo null')))
    .catch(e => Promise.reject(e));

  const stooqP = STOOQ_MAP[ticker]
    ? fetchStooq(ticker, startYear, endYear)
        .then(r => r ? { source: 'stooq', parsed: r } : Promise.reject(new Error('stooq null')))
        .catch(e => Promise.reject(e))
    : Promise.reject(new Error('no stooq mapping'));

  // Promise.any: 둘 중 하나라도 성공하면 즉시 반환
  const result = await Promise.any([yahooP, stooqP]).catch(() => null);
  if (result) return result;
  throw new Error(`${ticker} 데이터 없음 (Yahoo+Stooq 모두 실패)`);
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
  // outlier filter
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

// fetchYahoo 결과를 { priceMap, firstYear, firstMonth } 형태로 정규화
function normalizeFetch(result) {
  if (result.source === 'stooq') return result.parsed;
  return parseYahoo(result.data);
}

async function fetchECOS(stat, item, startYear, endYear) {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10000/${stat}/M/${startYear}01/${endYear}12/${item}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.StatisticSearch?.row?.length) throw new Error('ECOS 데이터 없음');
      return data.StatisticSearch.row
        .map(r => ({ year: parseInt(r.TIME.slice(0,4)), month: parseInt(r.TIME.slice(4,6)), value: parseFloat(r.DATA_VALUE) }))
        .filter(r => !isNaN(r.value));
    } catch(e) {
      if (attempt === 1) throw e;
      await new Promise(r => setTimeout(r, 1500)); // 재시도 전 1.5초 대기
    }
  }
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
  const ck = `${assetId}_${startYear}_${endYear}`;
  if (_dataCache.has(ck)) return _dataCache.get(ck);

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
    const r = { priceMap, firstYear: yields[0].year, firstMonth: yields[0].month, isReturn: true, proxyNote: null };
    _dataCache.set(ck, r);
    return r;
  }

  // Yahoo Finance (+ Stooq 폴백) 시도
  let fetchResult;
  try {
    fetchResult = await fetchYahoo(def.ticker, startYear, endYear);
  } catch(primaryErr) {
    // primary ticker 실패 → proxy ticker로 전체 기간 대체
    if (def.proxy) {
      try {
        fetchResult = await fetchYahoo(def.proxy, startYear, endYear);
        const parsed = normalizeFetch(fetchResult);
        const r = { priceMap: parsed.priceMap, firstYear: parsed.firstYear, firstMonth: parsed.firstMonth, isReturn: false, proxyNote: `${def.ticker} 로드 실패, ${def.proxy} 데이터로 대체` };
        _dataCache.set(ck, r);
        return r;
      } catch(proxyErr) {
        throw new Error(`${assetId}: ${primaryErr.message} / proxy: ${proxyErr.message}`);
      }
    }
    throw primaryErr;
  }

  const parsed = normalizeFetch(fetchResult);
  let proxyNote = null;

  // 상장 전 기간 proxy로 연장
  if (def.proxy && parsed.firstYear > startYear) {
    try {
      const pr = await fetchYahoo(def.proxy, startYear, parsed.firstYear);
      const parsedProxy = normalizeFetch(pr);
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

  const result = { priceMap: parsed.priceMap, firstYear: parsed.firstYear, firstMonth: parsed.firstMonth, isReturn: false, proxyNote };
  _dataCache.set(ck, result);
  return result;
}

async function fetchFXData(startYear, endYear) {
  try {
    const fetchResult = await fetchYahoo('USDKRW=X', startYear, endYear);
    const parsed = normalizeFetch(fetchResult);
    const map = {};
    Object.entries(parsed.priceMap).forEach(([k, v]) => {
      if (!v || !isFinite(v) || v <= 0) return;
      const rate = v < 10 ? 1/v : v;
      if (rate >= 500 && rate <= 3000) map[k] = rate;
    });
    return Object.keys(map).length > 0 ? map : null;
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

    // 병렬 fetch 전에 Yahoo 인증을 미리 워밍업 (경쟁 조건 방지)
    await getYFAuth();

    const [fxResult, ...assetResults] = await Promise.allSettled([
      fetchFXData(startYear, endYear),
      ...assetIds.map(id => fetchOneAsset(id, startYear, endYear)),
    ]);

    const assetData = {};
    assetIds.forEach((id, i) => {
      const r = assetResults[i];
      if (r.status === 'fulfilled') assetData[id] = r.value;
      else assetData[id] = { error: r.reason?.message || '데이터 없음' };
    });

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      assetData,
      fxMap: fxResult.status === 'fulfilled' ? fxResult.value : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
