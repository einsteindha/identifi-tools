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

// ── prices.json 프리로드 ────────────────────────────────────────
// 페이지 로드 즉시 백그라운드에서 시작 → 버튼 클릭 시 이미 준비 완료
let _staticPricesData = null;
let _staticPricesPromise = null;

(function _initStaticPrices() {
  // localStorage 7일 캐시 확인 (즉시 동기 반환)
  try {
    const ts = +localStorage.getItem('bt_prices_ts') || 0;
    if (Date.now() - ts < 7 * 86_400_000) {
      const text = localStorage.getItem('bt_prices_data');
      if (text) { _staticPricesData = JSON.parse(text); return; }
    }
  } catch(e) {}

  // 캐시 없으면 백그라운드 fetch
  _staticPricesPromise = fetch('/asset-allocation-backtest/prices.json')
    .then(r => r.ok ? r.text() : null)
    .then(text => {
      if (!text) return null;
      const data = JSON.parse(text);
      _staticPricesData = data;
      try {
        localStorage.setItem('bt_prices_data', text);
        localStorage.setItem('bt_prices_ts', Date.now().toString());
      } catch(e) {}
      return data;
    })
    .catch(() => null);
})();

