// scripts/generate-prices.js
// Usage: node scripts/generate-prices.js
// Requires Node.js 18+ (native fetch)
// Env: ECOS_API_KEY (optional)

const fs = require('fs');
const path = require('path');

const ECOS_API_KEY = process.env.ECOS_API_KEY || 'RSVPYYLHM2SX5A2N181J';
const START_YEAR = 1993;
const END_YEAR = new Date().getFullYear();
const OUT_PATH = path.join(__dirname, '../public/asset-allocation-backtest/prices.json');

const ASSET_DEF = {
  KOSPI_ALL:   { ticker: '^KS11',     cur: 'KRW' },
  KOSPI_LARGE: { ticker: '069500.KS', cur: 'KRW', proxy: '^KS11' },
  KOSDAQ:      { ticker: '^KQ11',     cur: 'KRW' },
  KR_DIV:      { ticker: '105190.KS', cur: 'KRW', proxy: '^KS11' },
  KR_VALUE:    { ticker: '143460.KS', cur: 'KRW', proxy: '^KS11' },
  US_TOTAL:    { ticker: 'VTI',       cur: 'USD', proxy: 'SPY' },
  SP500:       { ticker: '^GSPC',     cur: 'USD' },
  US_GROWTH:   { ticker: 'VUG',       cur: 'USD', proxy: 'SPY' },
  US_VALUE:    { ticker: 'VTV',       cur: 'USD', proxy: 'SPY' },
  US_MID:      { ticker: 'VO',        cur: 'USD', proxy: 'SPY' },
  US_SMALL:    { ticker: '^RUT',      cur: 'USD' },
  US_SCV:      { ticker: 'VBR',       cur: 'USD', proxy: 'IWM' },
  INTL_EX_US:  { ticker: 'VEA',       cur: 'USD', proxy: 'EFA' },
  WORLD:       { ticker: 'VT',        cur: 'USD', proxy: 'VTI' },
  EUROPE:      { ticker: 'VGK',       cur: 'USD', proxy: 'EFA' },
  JAPAN:       { ticker: 'EWJ',       cur: 'USD' },
  EM:          { ticker: 'VWO',       cur: 'USD', proxy: 'EEM' },
  KR_BOND_1Y:  { ecos: { stat: '721Y001', item: '5030000' }, dur: 1,  cur: 'KRW' },
  KR_BOND_3Y:  { ecos: { stat: '721Y001', item: '5020000' }, dur: 3,  cur: 'KRW' },
  KR_BOND_10Y: { ecos: { stat: '721Y001', item: '5050000' }, dur: 10, cur: 'KRW' },
  KR_CORP:     { ecos: { stat: '721Y001', item: '7020000' }, dur: 3,  cur: 'KRW' },
  US_STB:      { ticker: 'SHY',       cur: 'USD' },
  US_MTB:      { ticker: 'IEF',       cur: 'USD' },
  US_LTB:      { ticker: 'TLT',       cur: 'USD' },
  US_TBOND:    { ticker: 'BND',       cur: 'USD', proxy: 'AGG' },
  TIPS:        { ticker: 'TIP',       cur: 'USD' },
  GLOBAL_BOND: { ticker: 'BNDW',      cur: 'USD', proxy: 'BND' },
  GOLD:        { ticker: 'GLD',       cur: 'USD', proxy: 'IAU' },
  COMMODITY:   { ticker: 'DJP',       cur: 'USD', proxy: 'GSG' },
  US_REIT:     { ticker: 'VNQ',       cur: 'USD', proxy: 'IYR' },
  KR_REIT:     { ticker: '088980.KS', cur: 'KRW' },
  INTL_REIT:   { ticker: 'VNQI',      cur: 'USD', proxy: 'VNQ' },
  GLOBAL_REIT: { ticker: 'RWO',       cur: 'USD', proxy: 'VNQ' },
  CASH:        { ecos: { stat: '722Y001', item: '0101000', isCash: true }, cur: 'KRW' },
};

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

const STOOQ_MAP = {
  'VTI': 'vti.us', 'VEA': 'vea.us', 'BND': 'bnd.us', 'GLD': 'gld.us', 'VNQ': 'vnq.us',
  'VUG': 'vug.us', 'VTV': 'vtv.us', 'VO': 'vo.us', 'VBR': 'vbr.us', 'VT': 'vt.us',
  'VGK': 'vgk.us', 'EWJ': 'ewj.us', 'VWO': 'vwo.us', 'SHY': 'shy.us', 'IEF': 'ief.us',
  'TLT': 'tlt.us', 'AGG': 'agg.us', 'TIP': 'tip.us', 'BNDW': 'bndw.us', 'DJP': 'djp.us',
  'IYR': 'iyr.us', 'VNQI': 'vnqi.us', 'RWO': 'rwo.us', 'SPY': 'spy.us', 'EFA': 'efa.us',
  'IWM': 'iwm.us', 'EEM': 'eem.us', 'IAU': 'iau.us', 'GSG': 'gsg.us',
  '^GSPC': 'spx',
  '^KS11': '^kos11', '^KQ11': '^kosq',
  'USDKRW=X': null,
};

// ── Yahoo Auth ──────────────────────────────────────────────────────────
let _yfCrumb = null, _yfCookie = null;

async function getYFAuth() {
  if (_yfCrumb) return { crumb: _yfCrumb, cookie: _yfCookie };
  try {
    const fcRes = await fetch('https://fc.yahoo.com/', {
      headers: YAHOO_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    const rawCookies = fcRes.headers.getSetCookie ? fcRes.headers.getSetCookie() : [fcRes.headers.get('set-cookie') || ''];
    const a1 = rawCookies.map(c => c.split(';')[0]).find(c => c.startsWith('A1=')) || '';
    if (!a1) throw new Error('no cookie');
    const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...YAHOO_HEADERS, Cookie: a1 },
      signal: AbortSignal.timeout(10000),
    });
    const crumb = (await crumbRes.text()).trim();
    if (crumb && !crumb.startsWith('<') && crumb !== 'null') {
      _yfCrumb = crumb;
      _yfCookie = a1;
      console.log('  [Yahoo] 인증 성공');
    }
  } catch (e) {
    console.log(`  [Yahoo] 인증 실패: ${e.message} (crumb 없이 계속)`);
  }
  return { crumb: _yfCrumb, cookie: _yfCookie };
}

// ── Yahoo fetch ─────────────────────────────────────────────────────────
async function fetchYahooRaw(ticker, startYear, endYear) {
  const t1 = Math.floor(new Date(`${startYear}-01-01`).getTime() / 1000);
  const t2 = Math.floor(new Date(`${endYear}-12-31`).getTime() / 1000);
  const { crumb, cookie } = await getYFAuth();
  const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : '';
  const cookieHdr = cookie ? { Cookie: cookie } : {};

  for (const base of ['query1', 'query2']) {
    const url = `https://${base}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${t1}&period2=${t2}&interval=1mo&events=adjclose&includeAdjustedClose=true${crumbParam}`;
    try {
      const res = await fetch(url, {
        headers: { ...YAHOO_HEADERS, ...cookieHdr },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.chart?.result?.[0];
      if (r?.timestamp) return r;
    } catch (e) { continue; }
  }
  return null;
}

// ── Stooq fetch ─────────────────────────────────────────────────────────
async function fetchStooq(ticker, startYear, endYear) {
  const stooqTicker = STOOQ_MAP[ticker];
  if (!stooqTicker) return null;
  const d1 = `${startYear}0101`, d2 = `${endYear}1231`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqTicker)}&d1=${d1}&d2=${d2}&i=m`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'] },
      signal: AbortSignal.timeout(20000),
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
  } catch (e) { return null; }
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
  const keys = Object.keys(priceMap).sort((a, b) => {
    const [ay, am] = a.split('-').map(Number), [by, bm] = b.split('-').map(Number);
    return (ay * 12 + am) - (by * 12 + bm);
  });
  keys.forEach((k, i) => {
    const nb = [];
    for (let d = -3; d <= 3; d++) {
      if (d === 0 || !keys[i + d] || !priceMap[keys[i + d]]) continue;
      nb.push(priceMap[keys[i + d]]);
    }
    if (nb.length >= 2) {
      const med = nb.slice().sort((a, b) => a - b)[Math.floor(nb.length / 2)];
      const ratio = priceMap[k] / med;
      if (ratio > 10 || ratio < 0.1) delete priceMap[k];
    }
  });
  const first = new Date(ts[0] * 1000);
  return { priceMap, firstYear: first.getFullYear(), firstMonth: first.getMonth() + 1 };
}

function normalizeFetch(result) {
  if (result.source === 'stooq') return result.parsed;
  return parseYahoo(result.data);
}

// Yahoo + Stooq 병렬 경쟁 (먼저 성공한 쪽 반환)
async function fetchYahoo(ticker, startYear, endYear) {
  const yahooP = fetchYahooRaw(ticker, startYear, endYear)
    .then(r => r ? { source: 'yahoo', data: r } : Promise.reject(new Error('yahoo null')));

  const stooqP = STOOQ_MAP[ticker]
    ? fetchStooq(ticker, startYear, endYear)
        .then(r => r ? { source: 'stooq', parsed: r } : Promise.reject(new Error('stooq null')))
    : Promise.reject(new Error('no stooq mapping'));

  const result = await Promise.any([yahooP, stooqP]).catch(() => null);
  if (result) return result;
  throw new Error(`${ticker} 모두 실패 (Yahoo+Stooq)`);
}

// ── ECOS ────────────────────────────────────────────────────────────────
async function fetchECOS(stat, item, startYear, endYear) {
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/10000/${stat}/M/${startYear}01/${endYear}12/${item}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`ECOS HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.StatisticSearch?.row?.length) throw new Error('ECOS 데이터 없음');
      return data.StatisticSearch.row
        .map(r => ({ year: parseInt(r.TIME.slice(0, 4)), month: parseInt(r.TIME.slice(4, 6)), value: parseFloat(r.DATA_VALUE) }))
        .filter(r => !isNaN(r.value));
    } catch (e) {
      if (attempt === 2) throw e;
      await delay(2000);
    }
  }
}

function yieldToReturnMap(yields, duration) {
  const priceMap = {};
  if (yields.length > 0) {
    const { year, month, value } = yields[0];
    priceMap[`${year}-${month}`] = value / 100 / 12;
  }
  for (let i = 1; i < yields.length; i++) {
    const py = yields[i - 1].value / 100;
    const cy = yields[i].value / 100;
    const modDur = duration / (1 + py);
    const ret = py / 12 - modDur * (cy - py);
    const { year, month } = yields[i];
    priceMap[`${year}-${month}`] = ret;
  }
  return priceMap;
}

// ── 단일 자산 fetch ──────────────────────────────────────────────────────
async function fetchOneAsset(assetId) {
  const def = ASSET_DEF[assetId];
  if (!def) throw new Error(`Unknown asset: ${assetId}`);

  // ECOS 자산 (국내 채권/현금)
  if (def.ecos) {
    const yields = await fetchECOS(def.ecos.stat, def.ecos.item, START_YEAR, END_YEAR);
    if (!yields.length) throw new Error('데이터 없음');
    let priceMap;
    if (def.ecos.isCash) {
      priceMap = {};
      yields.forEach(y => { priceMap[`${y.year}-${y.month}`] = y.value / 100 / 12; });
    } else {
      priceMap = yieldToReturnMap(yields, def.dur);
    }
    return { priceMap, firstYear: yields[0].year, firstMonth: yields[0].month, isReturn: true, proxyNote: null };
  }

  // Yahoo + Stooq 자산
  let fetchResult;
  try {
    fetchResult = await fetchYahoo(def.ticker, START_YEAR, END_YEAR);
  } catch (primaryErr) {
    if (def.proxy) {
      try {
        fetchResult = await fetchYahoo(def.proxy, START_YEAR, END_YEAR);
        const parsed = normalizeFetch(fetchResult);
        return { priceMap: parsed.priceMap, firstYear: parsed.firstYear, firstMonth: parsed.firstMonth, isReturn: false, proxyNote: `${def.ticker} 로드 실패, ${def.proxy} 데이터로 대체` };
      } catch (proxyErr) {
        throw new Error(`${primaryErr.message} / proxy: ${proxyErr.message}`);
      }
    }
    throw primaryErr;
  }

  const parsed = normalizeFetch(fetchResult);
  let proxyNote = null;

  // 상장 전 기간 proxy 연장
  if (def.proxy && parsed.firstYear > START_YEAR) {
    try {
      const pr = await fetchYahoo(def.proxy, START_YEAR, parsed.firstYear);
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

  return { priceMap: parsed.priceMap, firstYear: parsed.firstYear, firstMonth: parsed.firstMonth, isReturn: false, proxyNote };
}

async function fetchFX() {
  try {
    const fetchResult = await fetchYahoo('USDKRW=X', START_YEAR, END_YEAR);
    const parsed = normalizeFetch(fetchResult);
    const map = {};
    Object.entries(parsed.priceMap).forEach(([k, v]) => {
      if (!v || !isFinite(v) || v <= 0) return;
      const rate = v < 10 ? 1 / v : v;
      if (rate >= 500 && rate <= 3000) map[k] = rate;
    });
    return Object.keys(map).length > 0 ? map : null;
  } catch (e) {
    return null;
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log(`\n자산 가격 데이터 생성 시작 (${START_YEAR}-${END_YEAR})`);
  console.log('='.repeat(50));

  // Yahoo 인증 먼저 (이후 모든 요청에서 재사용)
  console.log('\n[1/3] Yahoo Finance 인증...');
  await getYFAuth();

  // FX 데이터
  console.log('\n[2/3] 환율 데이터 (USDKRW)...');
  const fxMap = await fetchFX();
  if (fxMap) {
    const pts = Object.keys(fxMap).length;
    console.log(`  ✓ 환율 ${pts}개 데이터 포인트`);
  } else {
    console.log('  ✗ 환율 데이터 실패');
  }

  // 전체 자산 fetch (배치: 5개씩, 배치 간 1.5초 대기)
  console.log('\n[3/3] 자산 데이터...');
  const allAssets = Object.keys(ASSET_DEF);
  const results = {};
  const BATCH_SIZE = 5;

  for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
    const batch = allAssets.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(id => fetchOneAsset(id))
    );
    batchResults.forEach((r, j) => {
      const id = batch[j];
      if (r.status === 'fulfilled') {
        results[id] = r.value;
        const pts = Object.keys(r.value.priceMap).length;
        const proxy = r.value.proxyNote ? ` (proxy 연장 포함)` : '';
        console.log(`  ✓ ${id.padEnd(12)} ${pts}개 포인트${proxy}`);
      } else {
        results[id] = { error: r.reason?.message || '실패' };
        console.log(`  ✗ ${id.padEnd(12)} ${r.reason?.message}`);
      }
    });
    if (i + BATCH_SIZE < allAssets.length) {
      await delay(1500);
    }
  }

  // 결과 요약
  const successCount = Object.values(results).filter(v => !v.error).length;
  const failCount = allAssets.length - successCount;
  console.log(`\n결과: ${successCount}/${allAssets.length} 성공${failCount > 0 ? `, ${failCount} 실패` : ''}`);

  if (failCount > 0) {
    console.log('\n실패한 자산:');
    Object.entries(results).filter(([, v]) => v.error).forEach(([id, v]) => {
      console.log(`  - ${id}: ${v.error}`);
    });
  }

  // 정밀도 최적화 (파일 크기 축소)
  // 가격 자산: 소수점 2자리 / 수익률 자산: 유효숫자 7자리 / 환율: 소수점 2자리
  function roundMap(priceMap, isReturn) {
    const out = {};
    for (const [k, v] of Object.entries(priceMap)) {
      if (!isFinite(v)) continue;
      out[k] = isReturn
        ? parseFloat(v.toPrecision(7))      // 월 수익률 – 복리 정확도 유지
        : Math.round(v * 100) / 100;        // 가격 – 센트 단위로 충분
    }
    return out;
  }

  for (const [id, asset] of Object.entries(results)) {
    if (!asset.error && asset.priceMap) {
      asset.priceMap = roundMap(asset.priceMap, asset.isReturn);
    }
  }
  const roundedFxMap = fxMap ? roundMap(fxMap, false) : null;

  // 파일 저장
  const output = {
    generated: new Date().toISOString().slice(0, 10),
    generatedAt: Date.now(),
    coverageStart: START_YEAR,
    coverageEnd: END_YEAR,
    assets: results,
    fxMap: roundedFxMap,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output));

  const fileSize = fs.statSync(OUT_PATH).size;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n저장 완료: ${OUT_PATH}`);
  console.log(`파일 크기: ${(fileSize / 1024).toFixed(0)} KB`);
  console.log(`소요 시간: ${elapsed}초\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
