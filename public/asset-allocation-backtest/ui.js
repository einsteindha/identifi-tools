let activeTab = 'settings';
let gearTarget = -1;
let gearSubview = '';

const CRISES = [
  {name:'IMF 외환위기',   s:{y:1997,m:10}, e:{y:1998,m:6}},
  {name:'닷컴버블',       s:{y:2000,m:3},  e:{y:2002,m:10}},
  {name:'카드대란',       s:{y:2003,m:1},  e:{y:2003,m:9}},
  {name:'글로벌 금융위기',s:{y:2007,m:11}, e:{y:2009,m:3}},
  {name:'코로나19',       s:{y:2020,m:1},  e:{y:2020,m:3}},
  {name:'금리인상 충격',  s:{y:2022,m:1},  e:{y:2022,m:9}},
];

// ── Modal open/close ───────────────────────────────────────────
function _noScroll(e){
  // Allow touchmove only inside scrollable modal regions
  if(e.target.closest('.modal-body,.gear-popup')) return;
  e.preventDefault();
}
function openModal(){
  document.getElementById('modalOverlay').classList.add('open');
  document.body.dataset.scrollY = window.scrollY;
  if('ontouchstart' in window){
    // iOS: prevent background scroll via touchmove; keep body un-fixed so
    // position:fixed children (gear popup) remain touch-scrollable
    document.addEventListener('touchmove', _noScroll, {passive:false});
  } else {
    document.body.style.overflow = 'hidden';
  }
  renderModal();
}
function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  if('ontouchstart' in window){
    document.removeEventListener('touchmove', _noScroll);
  } else {
    document.body.style.overflow = '';
  }
  window.scrollTo(0, parseInt(document.body.dataset.scrollY||'0'));
  closeGearPopup();
}
function handleOverlayClick(e){
  if(e.target === document.getElementById('modalOverlay')) closeModal();
}
function switchTab(tab){
  activeTab=tab;
  document.querySelectorAll('.modal-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tabBtn-'+tab).classList.add('active');
  renderModal();
}
function renderModal(){
  if(activeTab==='settings') renderSettingsTab();
  else renderPortfolioTab();
}

// ── Settings tab ───────────────────────────────────────────────
function renderSettingsTab(){
  const s=state.settings;
  const yearOpts = (sel,min,max) => {
    let h='';
    for(let y=max;y>=min;y--) h+=`<option value="${y}" ${y==sel?'selected':''}>${y}년</option>`;
    return h;
  };
  document.getElementById('modalBody').innerHTML=`
  <div class="settings-section">
    <div class="settings-section-title">백테스트 기간</div>
    <div class="settings-grid-2">
      <div class="field"><div class="field-label">시작 연도</div>
        <select class="field-select" id="s-startYear" onchange="state.settings.startYear=+this.value">${yearOpts(s.startYear,1994,CY-1)}</select>
      </div>
      <div class="field"><div class="field-label">종료 연도</div>
        <select class="field-select" id="s-endYear" onchange="state.settings.endYear=+this.value">${yearOpts(s.endYear,1995,CY)}</select>
      </div>
    </div>
  </div>
  <div class="settings-section">
    <div class="settings-section-title">투자 금액</div>
    <div class="settings-grid">
      <div class="field"><div class="field-label">초기 투자금 (만원)</div>
        <input class="field-input" type="number" id="s-init" value="${s.initialAmount}" min="100" step="100" oninput="state.settings.initialAmount=+this.value||1000">
      </div>
      <div class="field"><div class="field-label">납입 시점</div>
        <select class="field-select" id="s-timing" onchange="state.settings.additionTiming=this.value">
          <option value="start"   ${s.additionTiming==='start'  ?'selected':''}>연초</option>
          <option value="end"     ${s.additionTiming==='end'    ?'selected':''}>연말</option>
          <option value="monthly" ${s.additionTiming==='monthly'?'selected':''}>매월</option>
        </select>
      </div>
      <div class="field"><div class="field-label">납입금액 (만원)</div>
        <input class="field-input" type="number" id="s-add" value="${s.annualAddition}" min="0" step="100" oninput="state.settings.annualAddition=+this.value||0">
      </div>
    </div>
  </div>
  <div class="settings-section">
    <div class="settings-section-title">운용 설정</div>
    <div class="settings-grid-2">
      <div class="field"><div class="field-label">리밸런싱 주기</div>
        <select class="field-select" id="s-rebal" onchange="state.settings.rebalancing=this.value">
          <option value="none" ${s.rebalancing==='none'?'selected':''}>없음</option>
          <option value="annual" ${s.rebalancing==='annual'?'selected':''}>연 1회 (1월)</option>
          <option value="semi" ${s.rebalancing==='semi'?'selected':''}>반기 (1·7월)</option>
          <option value="quarterly" ${s.rebalancing==='quarterly'?'selected':''}>분기 (1·4·7·10월)</option>
        </select>
      </div>
      <div class="field"><div class="field-label">벤치마크</div>
        <select class="field-select" id="s-bench" onchange="state.settings.benchmark=this.value">
          <option value="none" ${s.benchmark==='none'?'selected':''}>없음</option>
          <option value="0" ${s.benchmark==='0'?'selected':''}>포트폴리오 1</option>
          <option value="1" ${s.benchmark==='1'?'selected':''}>포트폴리오 2</option>
          <option value="2" ${s.benchmark==='2'?'selected':''}>포트폴리오 3</option>
        </select>
      </div>
    </div>
  </div>
  <div class="note-banner">ℹ 납입금액은 선택한 시점당 금액입니다 (연초·연말: 연 1회 / 매월: 매월). 환율 변동은 USD 자산에 자동 반영됩니다 (Yahoo Finance KRW=X).</div>`;
}

// ── Asset select options HTML ──────────────────────────────────
function assetOptions(selectedId){
  let h = `<option value="">— 자산 선택 —</option>`;
  ASSET_GROUPS.forEach(grp => {
    const ids = Object.keys(ASSET_DEF).filter(k => ASSET_DEF[k].grp === grp);
    if(!ids.length) return;
    h += `<optgroup label="${ASSET_GROUP_LABEL[grp]||grp}">`;
    ids.forEach(id => {
      const def = ASSET_DEF[id];
      h += `<option value="${id}" ${id===selectedId?'selected':''}>${def.name}</option>`;
    });
    h += `</optgroup>`;
  });
  return h;
}

// ── Portfolio tab ──────────────────────────────────────────────
function renderPortfolioTab(){
  const rows = state.rows;
  const portHeaders = state.portfolios.map((p,i) => `
    <th class="port-col" style="color:${P_COLORS[i]}">
      <input class="port-name-input" value="${escHtml(p.name)}" style="color:${P_COLORS[i]}"
        oninput="state.portfolios[${i}].name=this.value">
      <button class="gear-btn" onclick="openGearPopup(${i},event)" title="포트폴리오 옵션">⚙</button>
    </th>`).join('');

  const rowsHtml = rows.map((row,ri) => {
    const wCells = row.weights.map((w,pi) =>
      `<td><input class="weight-input" type="number" min="0" max="100" step="0.5" value="${w}" placeholder=""
        oninput="updateWeight(${ri},${pi},this.value)" style="border-color:${P_COLORS[pi]}22"></td>`
    ).join('');
    return `<tr>
      <td><select class="asset-select" onchange="updateAsset(${ri},this.value)">${assetOptions(row.assetId)}</select></td>
      ${wCells}
      <td><button class="remove-row-btn" onclick="removeRow(${ri})">×</button></td>
    </tr>`;
  }).join('');

  const sums = [0,1,2].map(pi => rows.reduce((s,r)=>s+(parseFloat(r.weights[pi])||0),0));
  const sumCells = sums.map((s,pi) => {
    const ok = Math.abs(s-100) < 0.1;
    const cls = s===0 ? '' : ok ? 'sum-ok' : 'sum-bad';
    return `<td class="${cls}" style="color:${P_COLORS[pi]}">${s>0?s.toFixed(1)+'%':'—'}</td>`;
  }).join('');

  document.getElementById('modalBody').innerHTML = `
  <div class="port-header">
    <div style="font-size:.8rem;color:var(--text3)">각 포트폴리오의 자산 비중을 입력하세요. 합계가 100%여야 합니다.</div>
  </div>
  <div class="port-scroll">
    <table class="port-table">
      <thead><tr><th>자산군</th>${portHeaders}<th style="width:32px"></th></tr></thead>
      <tbody id="portTableBody">${rowsHtml}</tbody>
      <tfoot><tr><td style="color:var(--text2);font-size:.78rem">합계</td>${sumCells}<td></td></tr></tfoot>
    </table>
  </div>
  <button class="add-row-btn" onclick="addRow()">+ 자산 추가</button>
  <div id="assetNoteList"></div>`;
  updateAssetNotes();
}

function updateAsset(ri, val){
  state.rows[ri].assetId = val;
  updateAssetNotes();
}

function updateAssetNotes(){
  const list = document.getElementById('assetNoteList');
  if(!list) return;
  const seen = new Set();
  const items = [];
  state.rows.forEach(r => {
    if(!r.assetId || seen.has(r.assetId)) return;
    seen.add(r.assetId);
    const def = ASSET_DEF[r.assetId];
    if(!def) return;
    if(def.est) items.push({name:def.name, msg:def.note||'추정 데이터', level:'warn'});
    else if(def.proxy) items.push({name:def.name, msg:`ETF 상장 이전 기간은 ${def.proxy} 데이터로 연장`, level:'info'});
  });
  list.innerHTML = items.length
    ? items.map(it =>
        `<div class="asset-note-item ${it.level==='warn'?'note-warn':'note-info'}">`+
        `${it.level==='warn'?'⚠':'ℹ'} <b>${escHtml(it.name)}</b> — ${escHtml(it.msg)}</div>`
      ).join('')
    : '';
}
function updateWeight(ri, pi, val){
  state.rows[ri].weights[pi] = val;
  // Update sum display
  const sums = [0,1,2].map(p => state.rows.reduce((s,r)=>s+(parseFloat(r.weights[p])||0),0));
  const tfoot = document.querySelector('.port-table tfoot tr');
  if(tfoot) {
    const tds = tfoot.querySelectorAll('td');
    sums.forEach((s,p) => {
      const ok = Math.abs(s-100) < 0.1;
      if(tds[p+1]){
        tds[p+1].className = s===0 ? '' : ok ? 'sum-ok' : 'sum-bad';
        tds[p+1].style.color = P_COLORS[p];
        tds[p+1].textContent = s>0 ? s.toFixed(1)+'%' : '—';
      }
    });
  }
}
function addRow(){
  if(state.rows.length >= 30){ alert('자산은 최대 30개까지 추가할 수 있습니다.'); return; }
  state.rows.push({assetId:'', weights:['','','']});
  renderPortfolioTab();
}
function removeRow(ri){
  if(state.rows.length <= 1) return;
  state.rows.splice(ri,1);
  renderPortfolioTab();
}

// ── Gear popup ─────────────────────────────────────────────────
function openGearPopup(pi, event){
  event.stopPropagation();
  gearTarget = pi;
  gearSubview = '';
  renderGearMain(pi);
  positionPopup(event.currentTarget);
}
function positionPopup(btn){
  const popup = document.getElementById('gearPopup');
  const rect = btn.getBoundingClientRect();
  const vh = window.innerHeight;
  const maxH = Math.min(vh * 0.7, 400);
  popup.style.maxHeight = maxH + 'px';
  const spaceBelow = vh - rect.bottom - 8;
  const spaceAbove = rect.top - 8;
  if(spaceBelow >= Math.min(maxH, 200) || spaceBelow >= spaceAbove){
    popup.style.top = (rect.bottom + 4) + 'px';
    popup.style.bottom = 'auto';
  } else {
    popup.style.bottom = (vh - rect.top + 4) + 'px';
    popup.style.top = 'auto';
  }
  popup.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  popup.classList.add('open');
}
function closeGearPopup(){
  document.getElementById('gearPopup').classList.remove('open');
  gearTarget = -1;
}
document.addEventListener('click', e => {
  if(!document.getElementById('gearPopup').contains(e.target) && !e.target.classList.contains('gear-btn')){
    closeGearPopup();
  }
});

function renderGearMain(pi){
  const other = [0,1,2].filter(x=>x!==pi).map(x=>`
    <div class="gear-item" onclick="copyFromPortfolio(${x})">
      <span style="color:${P_COLORS[x]}">${escHtml(state.portfolios[x].name)}</span>
    </div>`).join('');

  const presetCats = [...new Set(Object.values(PRESETS).map(p=>p.cat))];
  const presetHtml = presetCats.map(cat => {
    const names = Object.keys(PRESETS).filter(k=>PRESETS[k].cat===cat);
    return `<div class="gear-category">${cat}</div>` + names.map(n =>
      `<div class="gear-item" onclick="applyPreset('${escHtml(n)}')">${n}</div>`
    ).join('');
  }).join('<hr class="gear-divider">');

  document.getElementById('gearPopup').innerHTML = `
    <div class="gear-item" onclick="applyEqual()">균등 배분</div>
    <div class="gear-item" onclick="applyNormalize()">합계 100%로 정규화</div>
    <div class="gear-item danger" onclick="applyClear()">비중 초기화</div>
    <hr class="gear-divider">
    <div class="gear-category">다른 포트폴리오에서 복사</div>
    ${other}
    <hr class="gear-divider">
    <div class="gear-category">프리셋 불러오기</div>
    ${presetHtml}`;
}

function applyEqual(){
  const pi = gearTarget;
  const activeRows = state.rows.filter(r=>r.assetId);
  if(!activeRows.length){ closeGearPopup(); return; }
  const w = (100/activeRows.length).toFixed(1);
  state.rows.forEach(r => { if(r.assetId) r.weights[pi] = w; });
  closeGearPopup(); renderPortfolioTab();
}
function applyNormalize(){
  const pi = gearTarget;
  const total = state.rows.reduce((s,r)=>s+(parseFloat(r.weights[pi])||0),0);
  if(!total){ closeGearPopup(); return; }
  state.rows.forEach(r => {
    const w = parseFloat(r.weights[pi])||0;
    r.weights[pi] = w ? parseFloat((w/total*100).toFixed(2)).toString() : '';
  });
  closeGearPopup(); renderPortfolioTab();
}
function applyClear(){
  const pi = gearTarget;
  state.rows.forEach(r => { r.weights[pi] = ''; });
  closeGearPopup(); renderPortfolioTab();
}
function copyFromPortfolio(from){
  const pi = gearTarget;
  state.rows.forEach(r => { r.weights[pi] = r.weights[from]; });
  closeGearPopup(); renderPortfolioTab();
}
function applyPreset(name){
  const pi = gearTarget;
  const preset = PRESETS[name];
  if(!preset){ closeGearPopup(); return; }
  // Reset weights for this portfolio
  state.rows.forEach(r => { r.weights[pi] = ''; });
  // Apply preset rows
  preset.rows.forEach(([assetId, w]) => {
    let row = state.rows.find(r => r.assetId === assetId);
    if(!row){
      // Find empty row or add new one
      row = state.rows.find(r => !r.assetId);
      if(!row){
        if(state.rows.length >= 30){ return; }
        row = {assetId:'', weights:['','','']};
        state.rows.push(row);
      }
      row.assetId = assetId;
    }
    row.weights[pi] = w.toString();
  });
  closeGearPopup(); renderPortfolioTab();
}

// ── Run backtest ───────────────────────────────────────────────
async function doRunBacktest(){
  closeModal();

  // Validate
  const s = state.settings;
  if(s.startYear >= s.endYear){ alert('종료 연도는 시작 연도보다 커야 합니다.'); openModal(); return; }

  // Collect active portfolios
  const activePorts = state.portfolios.map((p,pi)=>{
    const rows = state.rows
      .filter(r => r.assetId && parseFloat(r.weights[pi])>0)
      .map(r => ({assetId:r.assetId, weight:parseFloat(r.weights[pi])}));
    const totalW = rows.reduce((s,r)=>s+r.weight,0);
    return {name:p.name, rows, totalW, active: rows.length>0};
  });

  const anyActive = activePorts.some(p=>p.active);
  if(!anyActive){ alert('최소 1개 포트폴리오에 자산을 입력하세요.'); openModal(); switchTab('assets'); return; }

  // Warn about weight sums
  const badPort = activePorts.find(p=>p.active && Math.abs(p.totalW-100)>0.5);
  if(badPort){
    if(!confirm(`${badPort.name}의 비중 합계가 ${badPort.totalW.toFixed(1)}%입니다. 자동으로 정규화하고 계속할까요?`))
      { openModal(); switchTab('assets'); return; }
  }

  showLoading();

  // Collect unique assets
  const uniqueAssets = new Set();
  activePorts.forEach(p => p.rows.forEach(r => uniqueAssets.add(r.assetId)));

  const steps = ['데이터 로딩 중...', '백테스트 계산'];
  renderLoadingSteps(steps);

  try{
    let stepIdx = 0;
    updateStep(stepIdx++, 'active');

    // 데이터 fetch: 메모리 캐시 → localStorage(24h) → 서버 API 순으로 확인
    const cacheKey = `${Array.from(uniqueAssets).sort().join(',')}_${s.startYear}_${s.endYear}`;
    let fxMap, assetDataMap;
    if(dataCache.has(cacheKey)){
      ({fxMap, assetDataMap} = dataCache.get(cacheKey));
    } else {
      // localStorage 확인 (24시간 TTL)
      let fetched = null;
      try{
        const lsRaw = localStorage.getItem('bt_' + cacheKey);
        if(lsRaw){
          const {data, ts} = JSON.parse(lsRaw);
          if(Date.now() - ts < 86_400_000) fetched = data;
          else localStorage.removeItem('bt_' + cacheKey);
        }
      }catch(e){}

      if(!fetched){
        const fetchRes = await fetch('/api/fetch-data', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ assetIds: Array.from(uniqueAssets), startYear: s.startYear, endYear: s.endYear }),
        });
        if(!fetchRes.ok) throw new Error('데이터 서버 오류');
        fetched = await fetchRes.json();
        try{ localStorage.setItem('bt_' + cacheKey, JSON.stringify({data: fetched, ts: Date.now()})); }catch(e){}
      }

      fxMap = fetched.fxMap;
      assetDataMap = fetched.assetData;
      dataCache.set(cacheKey, {fxMap, assetDataMap});
    }

    const warnings = [];
    Array.from(uniqueAssets).forEach(id=>{
      const d = assetDataMap[id];
      if(!d || d.error) warnings.push(`${ASSET_DEF[id]?.name||id}: 데이터 로드 실패 — 제외됨`);
      else if(d.proxyNote) warnings.push(`${ASSET_DEF[id].name}: ${d.proxyNote}`);
    });
    updateStep(stepIdx-1, 'done');

    updateStep(stepIdx++, 'active');
    const assetDefs = {};
    const cleanAssetDataMap = {};
    Array.from(uniqueAssets).forEach(id => {
      assetDefs[id] = { cur: ASSET_DEF[id]?.cur || 'KRW' };
      if(assetDataMap[id] && !assetDataMap[id].error) cleanAssetDataMap[id] = assetDataMap[id];
    });
    const apiRes = await fetch('/api/backtest-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolios: activePorts, assetDataMap: cleanAssetDataMap, fxMap, settings: s, assetDefs }),
    });
    if (!apiRes.ok) throw new Error('백테스트 서버 오류');
    const { results: rawResults, error: apiError } = await apiRes.json();
    if (apiError) throw new Error(apiError);
    const results = rawResults.map((r, i) => {
      if (!r) return null;
      if (r.error) { warnings.push(`${activePorts[i].name}: 계산 오류 — ${r.error}`); return null; }
      return r;
    });
    updateStep(stepIdx-1, 'done');

    await new Promise(r=>setTimeout(r,200));
    renderResults(results, activePorts, warnings, s);
  }catch(e){
    hideLoading();
    document.getElementById('emptyState').style.display='none';
    document.getElementById('resultsArea').innerHTML=`<div class="error-banner">오류: ${e.message}</div>`;
    document.getElementById('resultsArea').style.display='block';
  }
}

// ── Render results ─────────────────────────────────────────────
let _charts = [];
function destroyCharts(){ _charts.forEach(c=>{try{c.destroy();}catch(e){}}); _charts=[]; }

function renderResults(results, ports, warnings, settings){
  hideLoading();
  destroyCharts();

  const active = results.map((r,i)=>r?i:-1).filter(i=>i>=1||i===0);
  if(!active.length){
    document.getElementById('resultsArea').innerHTML=`<div class="error-banner">유효한 백테스트 결과가 없습니다. 데이터를 확인하세요.</div>`;
    document.getElementById('resultsArea').style.display='block';
    return;
  }

  const pct = v => (v>=0?'+':'')+v.toFixed(2)+'%';
  const manwon = v => Math.round(v/10000).toLocaleString('ko-KR')+'만원';
  const fmtDate = ({y,m}) => `${y}.${String(m).padStart(2,'0')}`;

  // Period string
  const validResults = results.filter(Boolean);
  const firstStart = validResults.reduce((a,b)=>
    (a.firstDate.y*12+a.firstDate.m < b.firstDate.y*12+b.firstDate.m) ? a : b
  ).firstDate;
  const lastEnd = validResults[0].monthlyValues.slice(-1)[0];
  const periodStr = `${fmtDate(firstStart)} — ${fmtDate({y:lastEnd.y,m:lastEnd.m})}`;

  const warnHTML = warnings.map(w=>`<div class="note-banner">⚠ ${w}</div>`).join('');

  // ── 1. Performance summary ──────────────────────────────────
  const rows1 = [
    ['초기 투자금', i=>manwon(results[i].iv)],
    ['최종 자산',   i=>manwon(results[i].fv)],
    ['총 수익률',   i=>`<span class="${results[i].totalReturn>=0?'positive':'negative'}">${pct(results[i].totalReturn)}</span>`],
    ['CAGR',        i=>`<span class="${results[i].cagr>=0?'positive':'negative'}">${pct(results[i].cagr)}</span>`],
    ['표준편차',       i=>results[i].annualVol.toFixed(2)+'%'],
    ['최대 낙폭(MDD)',i=>`<span class="negative">-${(results[i].mdd*100).toFixed(2)}%</span>${results[i].mddEnd?` <small style="color:var(--text3)">(${fmtDate(results[i].mddEnd)})</small>`:''}` ],
    ['샤프지수',    i=>results[i].sharpe.toFixed(2)],
    ['소르티노지수',i=>results[i].sortino.toFixed(2)],
    ['최고 연도',   i=>`${pct(results[i].bestYear.ret)} (${results[i].bestYear.year}년)`],
    ['최저 연도',   i=>`${pct(results[i].worstYear.ret)} (${results[i].worstYear.year}년)`],
  ];

  const nActive = results.filter(Boolean).length;
  const labelPct   = nActive===1?52:nActive===2?40:26;
  const crisisPct  = nActive===1?55:nActive===2?42:30;
  const perfMinW   = nActive===1?300:nActive===2?420:520;
  const crisisMinW = nActive===1?300:nActive===2?400:480;

  const thCols = results.map((r,i)=>r?`<th class="p${i+1}-col">${escHtml(ports[i].name)}</th>`:'').join('');
  const perfRows = rows1.map(([label, fn])=>{
    const cells = results.map((r,i)=>r?`<td>${fn(i)}</td>`:'').join('');
    return `<tr><td>${label}</td>${cells}</tr>`;
  }).join('');

  // ── 2. Growth chart data ────────────────────────────────────
  // Build aligned month labels from all results
  const allMonths = new Set();
  validResults.forEach(r=>r.monthlyValues.forEach(p=>allMonths.add(`${p.y}-${p.m}`)));
  const sortedMonths = [...allMonths].sort((a,b)=>{
    const [ay,am]=a.split('-').map(Number), [by,bm]=b.split('-').map(Number);
    return (ay*12+am)-(by*12+bm);
  });

  // ── 4. Risk/return detail ───────────────────────────────────
  const riskRows = [
    ['산술평균 수익률', i=>pct(results[i].arithMean)],
    ['기하평균(CAGR)',  i=>pct(results[i].cagr)],
    ['표준편차',        i=>results[i].annualVol.toFixed(2)+'%'],
    ['하방 편차',       i=>results[i].downDev.toFixed(2)+'%'],
    ['최대 낙폭',       i=>'-'+(results[i].mdd*100).toFixed(2)+'%'],
    ['샤프지수',        i=>results[i].sharpe.toFixed(2)],
    ['소르티노지수',    i=>results[i].sortino.toFixed(2)],
  ].map(([label,fn])=>`<tr><td>${label}</td>${results.map((r,i)=>r?`<td>${fn(i)}</td>`:'').join('')}</tr>`).join('');

  // ── 6. Crisis periods ──────────────────────────────────────
  const crisisRows = CRISES.map(c=>{
    const cells = results.map((r,i)=>{
      if(!r) return '';
      const ret = r.crisisReturns ? (r.crisisReturns[c.name] ?? null) : null;
      if(ret===null) return `<td style="color:var(--text3)">N/A</td>`;
      return `<td class="${ret>=0?'positive':'negative'}">${pct(ret)}</td>`;
    }).join('');
    return `<tr><td>${c.name}<br><small style="color:var(--text3)">${c.s.y}.${String(c.s.m).padStart(2,'0')} ~ ${c.e.y}.${String(c.e.m).padStart(2,'0')}</small></td>${cells}</tr>`;
  }).join('');

  // ── 7. Rolling returns ─────────────────────────────────────
  const rollingYears = [1,3,5,7,10];
  const rollingHTML = results.map((r,pi)=>{
    if(!r) return '';
    const tRows = rollingYears.map(yr=>{
      const ro = r.rollingReturns ? r.rollingReturns[yr] : null;
      if(!ro) return `<tr><td>${yr}년</td><td colspan="3" style="color:var(--text3)">데이터 부족</td></tr>`;
      return `<tr>
        <td>${yr}년</td>
        <td>${pct(ro.avg)}</td>
        <td class="positive">${pct(ro.max)}</td>
        <td class="negative">${pct(ro.min)}</td>
      </tr>`;
    }).join('');
    return `<div style="margin-bottom:1rem"><div style="font-size:.8rem;font-weight:500;color:${P_COLORS[pi]};margin-bottom:.5rem">${escHtml(ports[pi].name)}</div>
      <div style="overflow-x:auto"><table class="rolling-table">
        <thead><tr><th>구간</th><th>평균</th><th>최고</th><th>최저</th></tr></thead>
        <tbody>${tRows}</tbody>
      </table></div></div>`;
  }).join('');

  // ── 8. Asset performance ───────────────────────────────────
  const assetPerfHTML = results.map((r,pi)=>{
    if(!r) return '';
    const assetRows = r.assets.map((a,idx)=>{
      const sm = r.assetMetrics[idx];
      const cagr0 = sm.standaloneCagr;
      const vol0  = sm.standaloneVol;
      const best  = sm.standaloneBest;
      const worst = sm.standaloneWorst;
      return `<tr>
        <td>${ASSET_DEF[a.id]?.name||a.id}</td>
        <td class="${cagr0>=0?'positive':'negative'}">${pct(cagr0)}</td>
        <td>${vol0.toFixed(2)}%</td>
        <td>${best.y!=='—'?pct(best.ret)+' ('+best.y+'년)':'—'}</td>
        <td>${worst.y!=='—'?pct(worst.ret)+' ('+worst.y+'년)':'—'}</td>
      </tr>`;
    }).join('');
    return `<div style="margin-bottom:1.25rem"><div style="font-size:.8rem;font-weight:500;color:${P_COLORS[pi]};margin-bottom:.5rem">${escHtml(ports[pi].name)}</div>
      <div style="overflow-x:auto"><table class="asset-table">
        <thead><tr><th style="text-align:left">자산군</th><th>CAGR</th><th>표준편차</th><th>최고 연도</th><th>최저 연도</th></tr></thead>
        <tbody>${assetRows}</tbody>
      </table></div></div>`;
  }).join('');

  // ── 9. Correlation heatmap ─────────────────────────────────
  const heatmapHTML = results.map((r,pi)=>{
    if(!r || r.assets.length < 2) return '';
    const labels = r.assets.map(a=>ASSET_DEF[a.id]?.name?.slice(0,8)||a.id);
    const corrMatrix = r.correlationMatrix || [];
    let hRows = `<tr><th></th>${labels.map(l=>`<th><span class="hm-col-hdr">${escHtml(l)}</span></th>`).join('')}</tr>`;
    labels.forEach((l,i)=>{
      hRows += `<tr><th>${escHtml(l)}</th>`;
      labels.forEach((_,j)=>{
        if(i===j){ hRows+=`<td style="background:var(--surface2);color:var(--text2)">1.00</td>`; return; }
        const c = (corrMatrix[i] && corrMatrix[i][j] != null) ? corrMatrix[i][j] : 0;
        const bg = corrColor(c);
        hRows+=`<td style="background:${bg.bg};color:${bg.fg}">${c.toFixed(2)}</td>`;
      });
      hRows += `</tr>`;
    });
    return `<div style="margin-bottom:1.25rem"><div style="font-size:.8rem;font-weight:500;color:${P_COLORS[pi]};margin-bottom:.5rem">${escHtml(ports[pi].name)}</div>
      <div class="heatmap-scroll"><table class="heatmap-table">${hRows}</table></div></div>`;
  }).join('');

  // ── 10. Contribution breakdown ─────────────────────────────
  const contribHTML = results.map((r,pi)=>{
    if(!r) return '';
    const last = r.monthlyValues[r.monthlyValues.length-1];
    const contribRows = r.assets.map((a,ai)=>{
      const finalVal = last.assetVals[ai];
      const share = last.value>0 ? finalVal/last.value*100 : 0;
      return `<tr><td>${ASSET_DEF[a.id]?.name||a.id}</td>
        <td>${(a.w*100).toFixed(1)}%</td>
        <td>${manwon(finalVal)}</td>
        <td>${share.toFixed(1)}%</td></tr>`;
    }).join('');
    return `<div style="margin-bottom:1.25rem"><div style="font-size:.8rem;font-weight:500;color:${P_COLORS[pi]};margin-bottom:.5rem">${escHtml(ports[pi].name)}</div>
      <div style="overflow-x:auto"><table class="contrib-table">
        <thead><tr><th style="text-align:left">자산군</th><th>목표비중</th><th>최종가치</th><th>실제비중</th></tr></thead>
        <tbody>${contribRows}</tbody>
      </table></div></div>`;
  }).join('');

  // ── Assemble HTML ──────────────────────────────────────────
  document.getElementById('resultsArea').innerHTML = `
    <div class="results-header">
      <div class="results-title">백테스트 결과</div>
      <div class="results-period">${periodStr} · ${settings.startYear}–${settings.endYear} 시뮬레이션</div>
      ${warnHTML}
    </div>

    <div class="section-card">
      <div class="section-title">① 자산 구성 비중</div>
      <div class="donut-row" id="donutRow"></div>
    </div>

    <div class="section-card">
      <div class="section-title">② 성과 요약</div>
      <div style="overflow-x:auto"><table class="perf-table" style="min-width:${perfMinW}px">
        <thead><tr><th style="width:${labelPct}%">지표</th>${thCols}</tr></thead>
        <tbody>${perfRows}</tbody>
      </table></div>
    </div>

    <div class="section-card">
      <div class="section-title" style="display:flex;align-items:flex-start;gap:.4rem .6rem">
        <div style="flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:.35rem .45rem">
          <span style="white-space:nowrap">③ 포트폴리오 성장 추이</span>
          <button class="log-toggle" id="logToggle" onclick="toggleLog()" style="white-space:nowrap;flex-shrink:0">로그스케일</button>
        </div>
        <div class="legend-row" id="growthLegend" style="flex-shrink:0;justify-content:flex-end"></div>
      </div>
      <div class="chart-wrap" style="height:340px"><canvas id="growthChart"></canvas></div>
    </div>

    <div class="section-card">
      <div class="section-title">④ 연도별 수익률</div>
      <div class="chart-wrap" style="height:280px"><canvas id="annualChart"></canvas></div>
    </div>

    <div class="section-card">
      <div class="section-title">⑤ 리스크 / 수익률 상세 지표</div>
      <div style="overflow-x:auto"><table class="perf-table" style="min-width:${perfMinW}px">
        <thead><tr><th style="width:${labelPct}%">지표</th>${thCols}</tr></thead>
        <tbody>${riskRows}</tbody>
      </table></div>
    </div>

    <div class="section-card">
      <div class="section-title">⑥ 낙폭 차트</div>
      <div class="chart-wrap" style="height:220px"><canvas id="ddChart"></canvas></div>
    </div>

    <div class="section-card">
      <div class="section-title">⑦ 역사적 위기 구간 성과</div>
      <div style="overflow-x:auto"><table class="crisis-table" style="min-width:${crisisMinW}px">
        <thead><tr><th style="width:${crisisPct}%">위기 구간</th>${thCols}</tr></thead>
        <tbody>${crisisRows}</tbody>
      </table></div>
    </div>

    <div class="section-card">
      <div class="section-title">⑧ 롤링 수익률 테이블</div>
      ${rollingHTML}
    </div>

    <div class="section-card">
      <div class="section-title">⑨ 자산별 성과</div>
      ${assetPerfHTML}
    </div>

    <div class="section-card">
      <div class="section-title">⑩ 상관계수 히트맵</div>
      <div class="section-sub">포트폴리오 내 자산군 간 월별 수익률 기반 피어슨 상관계수</div>
      <div class="heatmap-row">${heatmapHTML||'<div style="color:var(--text3);font-size:.82rem">자산이 2개 이상인 포트폴리오에서 표시됩니다.</div>'}</div>
    </div>

    <div class="section-card">
      <div class="section-title">⑪ 수익 기여도 분해</div>
      ${contribHTML}
    </div>

    <div class="disclaimer">
      <b>데이터 출처 및 한계</b><br>
      Yahoo Finance 무료 API와 한국은행 ECOS 통계를 사용합니다.
      KOSPI(^KS11), 코스닥(^KQ11), 미국 대형주(S&P 500 지수 ^GSPC, 1928년~), 미국 소형주(Russell 2000 ^RUT, 1987년~)는 실제 지수 데이터를 사용합니다.
      그 외 자산(선진국·이머징·글로벌 리츠·원자재·금 등)은 상장 ETF(VEA, VWO, GLD, VNQ 등)의 수정주가를 사용하며,
      운용보수와 추적오차로 인해 실제 지수 대비 수익률에 차이가 있을 수 있습니다.
      ETF 상장 이전 구간(예: GLD 2004년 이전, VWO·VGK 2005년 이전, VNQI 2010년 이전)은 유사 ETF 데이터로 연장·대체합니다.
      국내 채권과 현금(콜금리)은 한국은행 ECOS 금리 통계를 기반으로 월간 수익률을 추산합니다.<br>
      거래비용·세금·슬리피지 미반영. 배당은 수정주가(Adj Close)에 근사 반영. 무위험수익률 기준: 연 3.0%. 본 도구는 투자 자문이 아닙니다.
    </div>`;

  document.getElementById('resultsArea').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('headerActions').style.display = 'none'; // 차트 렌더 완료 후 표시

  // Build charts after DOM is ready (80ms: 브라우저 레이아웃 완료 대기)
  setTimeout(()=>buildCharts(results, ports, sortedMonths, settings), 80);
}

// ── Charts ─────────────────────────────────────────────────────
let _logScale = false;
function toggleLog(){
  _logScale = !_logScale;
  document.getElementById('logToggle').classList.toggle('active', _logScale);
  const gc = _charts.find(c=>c.canvas?.id==='growthChart');
  if(gc){
    gc.options.scales.y.type = _logScale?'logarithmic':'linear';
    gc.update();
    if(window._btPrintImgs) window._btPrintImgs['growthChart'] = _capturePrint(gc.canvas);
  }
}

function buildCharts(results, ports, sortedMonths, settings){
  const isDark = matchMedia('(prefers-color-scheme:dark)').matches;
  const gc = isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
  const tc = isDark?'#5C5A54':'#A09E97';
  const chartDefaults = {
    responsive:true, maintainAspectRatio:false,
    animation:false,
    plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}},
  };

  // ── Donut charts (asset allocation) ───────────────────────
  const donutColors = ['#4E79A7','#F28E2B','#E15759','#76B7B2','#59A14F','#EDC948','#B07AA1','#FF9DA7','#9C755F','#BAB0AC'];
  const donutRow = document.getElementById('donutRow');
  if(donutRow){
    // 자산 수 최댓값 기준으로 높이 통일 → 도넛들 높낮이 균형
    const isMobile = window.innerWidth <= 700;
    const maxAssets = Math.max(...results.filter(r=>r).map(r=>r.assets.length));
    const donutH = isMobile ? 140 : Math.max(220, maxAssets * 18 + 20);
    results.forEach((r,pi)=>{
      if(!r) return;
      const wrap = document.createElement('div');
      wrap.className = 'donut-wrap';
      wrap.innerHTML = `<div style="font-size:.8rem;font-weight:500;color:${P_COLORS[pi]};text-align:center;margin-bottom:.5rem">${escHtml(ports[pi].name)}</div><div class="donut-chart-wrap" style="position:relative;height:${donutH}px"><canvas id="donut${pi}"></canvas></div>`;
      donutRow.appendChild(wrap);
    });
    results.forEach((r,pi)=>{
      if(!r) return;
      const ctx = document.getElementById(`donut${pi}`);
      if(!ctx) return;
      const labels = r.assets.map(a=>ASSET_DEF[a.id]?.name||a.id);
      const data = r.assets.map(a=>Math.round(a.w*1000)/10);
      const c = new Chart(ctx,{
        type:'doughnut',
        data:{labels, datasets:[{data, backgroundColor:donutColors.slice(0,labels.length), borderWidth:0}]},
        options:{
          responsive:true, maintainAspectRatio:false,
          animation:false,
          plugins:{
            legend:{display:true,position:'right',labels:{color:tc,font:{size:10},boxWidth:12,padding:6}},
            tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.parsed}%`}},
          },
          cutout:'65%',
        }
      });
      _charts.push(c);
    });
  }

  // ── Growth chart (万원 on Y axis) ─────────────────────────
  const growthDatasets = results.map((r,pi)=>{
    if(!r) return null;
    const valMap = {};
    r.monthlyValues.forEach(p=>{ valMap[`${p.y}-${p.m}`]=p.value/10000; });
    return {
      label: ports[pi].name,
      data: sortedMonths.map(k=>valMap[k]??null),
      borderColor: P_COLORS[pi], borderWidth:2, pointRadius:0, tension:.3, fill:false, spanGaps:false,
    };
  }).filter(Boolean);

  const growthCtx = document.getElementById('growthChart');
  if(growthCtx){
    const c = new Chart(growthCtx, {
      type:'line', data:{labels:sortedMonths, datasets:growthDatasets},
      options:{...chartDefaults,
        scales:{
          x:{ticks:{color:tc,font:{size:10,family:'IBM Plex Mono'},autoSkip:true,maxTicksLimit:8,maxRotation:0,callback:val=>{const k=sortedMonths[val];return k?k.split('-')[0]:null;}},grid:{color:gc}},
          y:{type:'linear',ticks:{color:tc,font:{size:10,family:'IBM Plex Mono'},callback:v=>v.toLocaleString('ko-KR')+'만'},grid:{color:gc}},
        },
        plugins:{...chartDefaults.plugins, tooltip:{...chartDefaults.plugins.tooltip, callbacks:{
          label: ctx=>`${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString('ko-KR')}만원`
        }}},
      }
    });
    _charts.push(c);

    // Legend
    const leg = document.getElementById('growthLegend');
    if(leg){
      if(growthDatasets.length > 1) leg.style.flexDirection = 'column';
      leg.innerHTML = growthDatasets.map(d=>`
        <span class="legend-item"><span class="legend-dot" style="background:${d.borderColor}"></span>${escHtml(d.label)}</span>`).join('');
    }
  }

  // ── Annual bar chart ──────────────────────────────────────
  const annualCtx = document.getElementById('annualChart');
  if(annualCtx){
    const allYears = new Set();
    results.forEach(r=>r&&r.annualRets.forEach(a=>allYears.add(a.year)));
    const years = [...allYears].sort();
    const annDatasets = results.map((r,pi)=>{
      if(!r) return null;
      const retMap = {};
      r.annualRets.forEach(a=>{ retMap[a.year]=a.ret; });
      return {
        label:ports[pi].name,
        data: years.map(y=>retMap[y]??null),
        backgroundColor: years.map(y=>{
          const v = retMap[y];
          if(v==null) return 'transparent';
          return v>=0 ? P_COLORS[pi] : P_COLORS[pi]+'88';
        }),
        borderColor: P_COLORS[pi], borderWidth:1,
      };
    }).filter(Boolean);

    const c = new Chart(annualCtx, {
      type:'bar', data:{labels:years, datasets:annDatasets},
      options:{...chartDefaults,
        scales:{
          x:{ticks:{color:tc,font:{size:10}},grid:{color:gc}},
          y:{ticks:{color:tc,font:{size:10,family:'IBM Plex Mono'},callback:v=>(v>=0?'+':'')+v+'%'},grid:{color:gc}},
        },
        plugins:{...chartDefaults.plugins, tooltip:{...chartDefaults.plugins.tooltip,callbacks:{
          label:ctx=>`${ctx.dataset.label}: ${pctFmt(ctx.parsed.y)}`
        }}},
      }
    });
    _charts.push(c);
  }

  // ── Drawdown chart ────────────────────────────────────────
  const ddCtx = document.getElementById('ddChart');
  if(ddCtx){
    const ddDatasets = results.map((r,pi)=>{
      if(!r) return null;
      let peak = r.monthlyValues[0].value;
      const ddVals = r.monthlyValues.map(p=>{
        if(p.value>peak) peak=p.value;
        return -((peak-p.value)/peak*100);
      });
      const valMap = {};
      r.monthlyValues.forEach((p,i)=>{ valMap[`${p.y}-${p.m}`]=ddVals[i]; });
      return {
        label:ports[pi].name,
        data:sortedMonths.map(k=>valMap[k]??null),
        borderColor:P_COLORS[pi], borderWidth:1.5, pointRadius:0, tension:.2, fill:true,
        backgroundColor:P_BG[pi], spanGaps:false,
      };
    }).filter(Boolean);

    const c = new Chart(ddCtx, {
      type:'line', data:{labels:sortedMonths, datasets:ddDatasets},
      options:{...chartDefaults,
        scales:{
          x:{ticks:{color:tc,font:{size:10,family:'IBM Plex Mono'},autoSkip:true,maxTicksLimit:8,maxRotation:0,callback:val=>{const k=sortedMonths[val];return k?k.split('-')[0]:null;}},grid:{color:gc}},
          y:{ticks:{color:tc,font:{size:10,family:'IBM Plex Mono'},callback:v=>v.toFixed(0)+'%'},grid:{color:gc}},
        },
      }
    });
    _charts.push(c);
  }

  // ResizeObserver+draw 완전 완료 후 전체 캡처 → 버튼 활성화 (목적자금 시뮬레이터 동일 패턴)
  setTimeout(function(){
    window._btPrintImgs = {};
    // 전체 차트 현재 상태 그대로 캡처 (도넛 레전드 오른쪽 유지)
    _charts.forEach(function(c){
      try{ if(c.canvas) window._btPrintImgs[c.canvas.id]=_capturePrint(c.canvas); }catch(e){}
    });
    document.getElementById('headerActions').style.display='flex';
  },500);
}

function pctFmt(v){ return (v>=0?'+':'')+v.toFixed(2)+'%'; }

function corrColor(v){
  if(v>=0.7)  return {bg:'#F5C4B3',fg:'#4A1B0C'};
  if(v>=0.3)  return {bg:'#FAC775',fg:'#412402'};
  if(v>=-0.3) return {bg:'#E1F5EE',fg:'#085041'};
  return {bg:'#B5D4F4',fg:'#042C53'};
}

// ── Loading helpers ────────────────────────────────────────────
function showLoading(){
  document.getElementById('emptyState').style.display='none';
  document.getElementById('resultsArea').style.display='none';
  document.getElementById('loadingState').style.display='flex';
}
function hideLoading(){
  document.getElementById('loadingState').style.display='none';
}
function renderLoadingSteps(steps){
  document.getElementById('loadingSteps').innerHTML = steps.map((s,i)=>
    `<div class="loading-step" id="lstep-${i}"><span class="step-dot"></span>${escHtml(s)}</div>`
  ).join('');
}
function updateStep(i,st){
  const el=document.getElementById(`lstep-${i}`); if(!el) return;
  el.className='loading-step '+st;
  if(st==='done') el.querySelector('.step-dot').style.background='var(--green)';
}

// ── Prompt Guide ───────────────────────────────────────────────
const AI_PROMPT = `[역할]
당신은 자산배분 포트폴리오 분석 전문가입니다.
첨부한 계좌 화면 이미지를 분석하여, 아래 지정된 자산군 분류 기준에 맞게
각 보유 종목을 매핑하고 비중을 계산해주세요.

[목적]
이 분석 결과는 자산배분 백테스트 도구에 직접 입력할 예정입니다.
따라서 반드시 아래 자산 목록 중 해당하는 항목으로만 분류해야 합니다.

[사용 가능한 자산 분류 목록]

■ 국내 주식
- KOSPI 전체
- KOSPI 대형주
- 코스닥
- 국내 배당주
- 국내 가치주

■ 해외 주식 - 미국
- 미국 전체 주식시장 (VTI)
- 미국 대형주 / S&P500 (SPY, ^GSPC)
- 미국 대형 성장주 (VUG)
- 미국 대형 가치주 (VTV)
- 미국 중형주 (VO)
- 미국 소형주 (IWM, ^RUT)
- 미국 소형 가치주 (VBR)

■ 해외 주식 - 글로벌
- 선진국 주식 미국 제외 (VEA, EFA)
- 선진국 주식 미국 포함 (VT)
- 유럽 주식 (VGK)
- 일본 주식 (EWJ)
- 이머징 마켓 (VWO, EEM)

■ 국내 채권
- 국내 단기채 1년
- 국내 중기채 3년
- 국내 장기채 10년
- 국내 회사채 AA-

■ 해외 채권
- 미국 단기국채 (SHY)
- 미국 중기국채 (IEF)
- 미국 장기국채 (TLT)
- 미국 전체 채권시장 (BND, AGG)
- TIPS 물가연동채 (TIP)
- 글로벌 채권 (BNDW)

■ 대안자산
- 금 (GLD, IAU)
- 원자재 (DJP, GSG)
- 미국 리츠 (VNQ)
- 국내 리츠
- 글로벌 리츠 미국 제외 (VNQI)
- 글로벌 리츠 전체 (RWO)
- 현금 (MMF, CMA, 예금 등)

[분석 지침]

1. 계좌 화면에서 각 보유 종목명, 티커(있다면), 평가금액 또는 보유수량을 읽어주세요.
2. 각 종목을 위 분류 목록 중 가장 적합한 항목 하나에 매핑해주세요.
3. 비중(%) 계산 시 통화가 혼재된 경우(원화/달러 등),
   각 통화 내에서 비중을 먼저 계산한 뒤
   전체 자산 중 해당 통화 계좌가 차지하는 금액 비율을 감안해
   통합 비중을 산출해주세요.
   환율 환산은 하지 않아도 됩니다 — 최종 출력은 비중(%)만 사용합니다.
4. 동일 자산군에 여러 종목이 있으면 합산해주세요.
5. 위 목록에 해당하지 않는 종목(개별주, 파생상품 등)은 별도로 표시하고 분석에서 제외해주세요.
6. 비중 합계가 100%가 되도록 미분류 제외 후 재계산해주세요.
7. 불확실한 매핑은 근거와 함께 설명해주세요.
8. 분류 불가 종목의 합산 금액이 전체 자산(분류 가능 + 불가 포함) 대비 몇 %인지 계산해주세요.
   이 비중이 클수록 백테스트 결과가 실제 포트폴리오와 달라집니다.

[출력 형식]

## 종목별 매핑 결과
| 계좌 종목명 | 평가금액 | 통화 | 매핑 자산군 | 비고 |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## 자산군별 비중 요약
| 자산군 | 비중(%) |
|---|---|
| ... | ... |
| **합계** | **100%** |

## 백테스트 도구 입력용 정리
(해당 항목만 기재, 비중 0%인 항목은 생략)
- KOSPI 전체: ___%
- 미국 대형주: ___%
- 금: ___%
...

## 분류 불가 종목 및 제외 비중
**제외 비중: 전체 자산의 ___%** (이만큼 백테스트 결과가 실제 포트폴리오와 달라질 수 있습니다)

| 종목명 | 평가금액 | 제외 사유 |
|---|---|---|
| ... | ... | ... |

## 참고사항
(불확실한 매핑 근거, 주의사항 등)`;

function _pgNoScroll(e){
  if(e.target.closest('.pg-body')) return;
  e.preventDefault();
}
function openPg(){
  document.getElementById('pgPromptText').textContent = AI_PROMPT;
  document.body.dataset.pgScrollY = window.scrollY;
  document.getElementById('pgOverlay').classList.add('open');
  if('ontouchstart' in window){
    document.addEventListener('touchmove', _pgNoScroll, {passive:false});
  } else {
    document.body.style.overflow = 'hidden';
  }
}
function closePg(){
  document.getElementById('pgOverlay').classList.remove('open');
  if('ontouchstart' in window){
    document.removeEventListener('touchmove', _pgNoScroll);
  } else {
    document.body.style.overflow = '';
  }
  window.scrollTo(0, parseInt(document.body.dataset.pgScrollY||'0'));
}
function handlePgOverlayClick(e){
  if(e.target === document.getElementById('pgOverlay')) closePg();
}
function copyPrompt(){
  navigator.clipboard.writeText(AI_PROMPT).then(()=>{
    const btn = document.getElementById('pgCopyBtn');
    btn.textContent = '✓ 복사 완료!';
    btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent = '📋 프롬프트 복사하기'; btn.classList.remove('copied'); }, 2000);
  });
}

// ── Save / Load / Print ────────────────────────────────────────
const _BT_KEY = 'bt-alloc-v1';

function saveData(){
  try{
    const d = {v:1, settings:{...state.settings}, portfolios:state.portfolios.map(p=>({...p})), rows:state.rows.map(r=>({...r, weights:[...r.weights]}))};
    localStorage.setItem(_BT_KEY, JSON.stringify(d));
    alert('저장됐습니다.');
  }catch(e){ alert('저장 실패: '+e.message); }
}

function loadData(){
  const raw = localStorage.getItem(_BT_KEY);
  if(!raw){ alert('저장된 데이터가 없습니다.'); return; }
  try{
    const d = JSON.parse(raw);
    if(d.settings) Object.assign(state.settings, d.settings);
    if(d.portfolios) state.portfolios = d.portfolios.map(p=>({...p}));
    if(d.rows) state.rows = d.rows.map(r=>({...r, weights:[...r.weights]}));
    alert('불러오기 완료. 포트폴리오 설정을 열어 확인 후 실행하세요.');
  }catch(e){ alert('불러오기 실패: '+e.message); }
}

// canvas → temp canvas 복사 후 PNG (배경 fill 없음 → 컨테이너 배경 투과)
function _capturePrint(cv){
  if(!cv||!cv.getContext)return'';
  var w=cv.width,h=cv.height;
  if(!w||!h)return'';
  var tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  tmp.getContext('2d').drawImage(cv,0,0,w,h);
  return tmp.toDataURL('image/png');
}

function doPrint(){
  if(document.getElementById('resultsArea').style.display==='none'){
    alert('백테스트 결과가 없습니다. 먼저 실행해 주세요.');
    return;
  }
  // 전체 pre-capture 이미지 사용 (buildCharts 시점에 모두 저장됨)
  var imgs=window._btPrintImgs||{};
  var swaps=[];
  document.querySelectorAll('#resultsArea canvas').forEach(function(cv){
    try{
      var isDonut=cv.id&&cv.id.startsWith('donut');
      var src=imgs[cv.id]||_capturePrint(cv);
      if(!src)return;
      var img=document.createElement('img');
      img.src=src;
      img.style.cssText='width:100%;height:100%;display:block'+(isDonut?';object-fit:contain':'');
      cv.parentNode.insertBefore(img,cv);
      cv.style.display='none';
      swaps.push({cv:cv,img:img});
    }catch(e){}
  });

  function _restore(){ swaps.forEach(function(s){s.cv.style.display='';s.img.remove();}); }
  function _execPrint(){
    var _t=document.title;document.title='IdentiFi_BacktestAssetAllocation';
    window.print();
    document.title=_t;
    _restore();
  }

  // base64 이미지 디코딩 완료 후 print — 디코딩 전 호출하면 첫 출력이 빈 화면
  var pending=swaps.length;
  if(!pending){ _execPrint(); return; }
  swaps.forEach(function(s){
    if(s.img.complete){ if(--pending===0) _execPrint(); }
    else{ s.img.onload=s.img.onerror=function(){ if(--pending===0) _execPrint(); }; }
  });
}

// ── Utilities ──────────────────────────────────────────────────
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
