const $ = (id) => document.getElementById(id);
const state = { items: [], selected: null, detector: null, stream: null, scanTimer: null, baseUrl: '', authenticated: false };

function fmt(n){
  const num = Number(n || 0);
  return Number.isInteger(num) ? String(num) : num.toLocaleString(undefined,{maximumFractionDigits:2});
}
function toast(msg){
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2300);
}
async function api(url, options={}){
  const res = await fetch(url, {headers:{'Content-Type':'application/json'}, credentials:'same-origin', ...options});
  const data = await res.json().catch(()=>({ok:false,error:'응답을 읽지 못했습니다.'}));
  if(res.status === 401 || data.auth_required){ showLogin(); throw new Error(data.error || '관리자 로그인이 필요합니다.'); }
  if(!data.ok) throw new Error(data.error || '요청 실패');
  return data.data;
}
async function checkLogin(){
  try{
    const me = await api('/api/me');
    state.authenticated = !!me.authenticated;
    if(state.authenticated){ hideLogin(); await loadAll(); }
    else showLogin();
    if(me.default_pin_warning) toast('기본 PIN 1204 사용중입니다. Railway에서는 ADMIN_PIN을 바꾸세요.');
  }catch(e){ showLogin(); }
}
function showLogin(){ $('loginOverlay').classList.remove('hidden'); }
function hideLogin(){ $('loginOverlay').classList.add('hidden'); }
async function login(ev){
  ev.preventDefault();
  try{
    await api('/api/login', {method:'POST', body:JSON.stringify({pin:$('adminPin').value})});
    $('adminPin').value=''; hideLogin(); await loadAll(); toast('로그인되었습니다.');
  }catch(e){ toast(e.message); }
}
async function logout(){
  try{ await api('/api/logout', {method:'POST', body:'{}'}); }catch(e){}
  state.authenticated = false; showLogin(); toast('로그아웃되었습니다.');
}
function statusBadge(item){
  const stock = Number(item.stock_qty || 0);
  if(stock <= 0) return '<span class="status zero">재고0</span>';
  if(item.status === '보류') return '<span class="status hold">보류</span>';
  if(item.status === '단종') return '<span class="status hold">단종</span>';
  return '<span class="status">보관중</span>';
}
function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function makeQrCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'FSW-';
  for(let i=0;i<8;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
async function loadAll(){
  await Promise.all([loadDashboard(), loadMeta(), loadItems(), loadMovements(), loadConfig()]);
  if(window.INITIAL_QR){ $('qrInput').value = window.INITIAL_QR; lookupQR(window.INITIAL_QR); }
}
async function loadConfig(){
  const cfg = await api('/api/config');
  const phoneUrls = cfg.urls.filter(u => !u.includes('127.0.0.1') && !u.includes('localhost'));
  state.baseUrl = phoneUrls[0] || cfg.urls[0] || location.origin;
  $('serverUrls').innerHTML = cfg.urls.map(u=>`<a href="${escapeHtml(u)}" target="_blank"><code>${escapeHtml(u)}</code></a>`).join(' ') +
    `<p class="hint">QR 라벨은 위 주소 기준으로 발급됩니다. Railway 공개 주소를 쓰면 LTE/5G에서도 조회됩니다.</p>`;
}
async function loadDashboard(){
  const d = await api('/api/dashboard');
  $('statTotal').textContent = d.total;
  $('statLocation').textContent = d.location_count;
  $('statZero').textContent = d.zero;
  const board = $('locationBoard');
  if(!d.locations.length){ board.innerHTML = '<p class="hint">등록된 위치가 없습니다.</p>'; }
  else {
    board.innerHTML = d.locations.map(loc => `
      <div class="low-item">
        <div><b>${escapeHtml(loc.name)}</b><span>자재 ${fmt(loc.item_count)}종</span></div>
        <strong>${fmt(loc.qty_sum)}개</strong>
      </div>`).join('');
  }
}
async function loadMeta(){
  const meta = await api('/api/meta');
  const catSel = $('categoryFilter');
  const current = catSel.value;
  catSel.innerHTML = '<option value="">전체 분류</option>' + meta.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  catSel.value = current;
  $('categoryList').innerHTML = meta.categories.map(c=>`<option value="${escapeHtml(c)}"></option>`).join('');
  $('locationList').innerHTML = meta.locations.map(c=>`<option value="${escapeHtml(c)}"></option>`).join('');
  $('supplierList').innerHTML = meta.suppliers.map(c=>`<option value="${escapeHtml(c)}"></option>`).join('');
}
async function loadItems(){
  const params = new URLSearchParams();
  if($('keyword').value.trim()) params.set('keyword', $('keyword').value.trim());
  if($('categoryFilter').value) params.set('category', $('categoryFilter').value);
  if($('locationFilter').value.trim()) params.set('location', $('locationFilter').value.trim());
  if($('zeroOnly').checked) params.set('zero','1');
  state.items = await api('/api/items?' + params.toString());
  renderItems(); renderMoveSelect();
}
function renderItems(){
  const tbody = $('itemsTable').querySelector('tbody');
  if(!state.items.length){ tbody.innerHTML = '<tr><td colspan="8">등록된 자재가 없습니다.</td></tr>'; return; }
  tbody.innerHTML = state.items.map(item=>{
    return `<tr>
      <td>${statusBadge(item)}</td>
      <td><div class="item-name">${escapeHtml(item.name)}</div><div class="sub">${escapeHtml(item.supplier || '')}</div></td>
      <td class="qty"><strong>${fmt(item.stock_qty)}</strong> ${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.location || '미정')}</td>
      <td>${escapeHtml(item.category || '미분류')}</td>
      <td>${escapeHtml(item.spec || '-')}</td>
      <td><code>${escapeHtml(item.qr_code)}</code></td>
      <td><div class="row-actions"><button class="btn ghost mini" onclick="selectItem(${item.id})">선택</button><a class="btn ghost mini" target="_blank" href="/labels?ids=${item.id}">QR 출력</a></div></td>
    </tr>`;
  }).join('');
}
function renderMoveSelect(){
  const sel = $('moveItem');
  const selectedId = state.selected?.id || sel.value;
  sel.innerHTML = state.items.map(i=>`<option value="${i.id}">${escapeHtml(i.name)} · ${escapeHtml(i.location||'위치미정')} · ${fmt(i.stock_qty)}${escapeHtml(i.unit)}</option>`).join('');
  if(selectedId) sel.value = selectedId;
}
async function loadMovements(){
  const rows = await api('/api/movements?limit=80');
  const tbody = $('movementTable').querySelector('tbody');
  tbody.innerHTML = rows.map(r=>`<tr>
    <td>${escapeHtml(r.created_at)}</td><td>${escapeHtml(r.item_name)}</td><td>${escapeHtml(r.action)}</td>
    <td>${fmt(r.qty)}</td><td>${fmt(r.before_qty)} → ${fmt(r.after_qty)}</td><td>${escapeHtml(r.reason || '')}</td>
  </tr>`).join('') || '<tr><td colspan="6">기록이 없습니다.</td></tr>';
}
async function lookupQR(raw){
  const qr = cleanQR(raw || $('qrInput').value);
  if(!qr){ toast('QR 코드를 입력하세요.'); return; }
  try{
    const item = await api('/api/lookup?qr=' + encodeURIComponent(qr));
    setSelected(item);
    toast('QR 자재를 찾았습니다.');
  }catch(e){
    $('scannedItem').className='selected-box empty';
    $('scannedItem').textContent = e.message;
    toast(e.message);
  }
}
function cleanQR(raw){
  raw = String(raw || '').trim();
  const m = raw.match(/FSW-[A-Z0-9]{6,16}/i);
  if(m) return m[0].toUpperCase();
  if(raw.includes('/scan/')) return raw.split('/scan/').pop().split(/[?#]/)[0].toUpperCase();
  return raw.toUpperCase();
}
function setSelected(item){
  state.selected = item;
  $('moveItem').value = item.id;
  const scanUrl = `${location.origin}/scan/${encodeURIComponent(item.qr_code)}`;
  $('scannedItem').className='selected-box';
  $('scannedItem').innerHTML = `<b>${escapeHtml(item.name)}</b><br>
    <span>${escapeHtml(item.category || '미분류')} · 위치 ${escapeHtml(item.location || '미정')}</span><br>
    <span class="qty">현재 ${fmt(item.stock_qty)}${escapeHtml(item.unit)}</span><br>
    <span class="sub">규격 ${escapeHtml(item.spec || '-')} · QR ${escapeHtml(item.qr_code)}</span><br>
    <div class="row-actions scan-actions"><a class="btn ghost mini" target="_blank" href="/labels?ids=${item.id}">QR 라벨 출력</a><a class="btn ghost mini" target="_blank" href="${escapeHtml(scanUrl)}">조회화면 열기</a></div>`;
  fillItemForm(item);
}
function selectItem(id){
  const item = state.items.find(x => Number(x.id) === Number(id));
  if(item) setSelected(item);
  window.scrollTo({top:0, behavior:'smooth'});
}
function clearItemForm(){
  $('formTitle').textContent = '자재 등록';
  ['itemId','itemName','itemCategory','itemLocation','itemSpec','itemSupplier','itemQr','itemMemo'].forEach(id=>$(id).value='');
  $('itemStock').value = 0; $('itemUnit').value='개'; $('itemPack').value=1; $('itemStatus').value='사용중';
  state.selected = null;
}
function fillItemForm(item){
  $('formTitle').textContent = '자재 수정';
  $('itemId').value = item.id; $('itemName').value = item.name || ''; $('itemCategory').value = item.category || '';
  $('itemLocation').value = item.location || ''; $('itemSpec').value = item.spec || ''; $('itemStock').value = item.stock_qty || 0;
  $('itemUnit').value = item.unit || '개'; $('itemPack').value = item.pack_qty || 1;
  $('itemSupplier').value = item.supplier || ''; $('itemQr').value = item.qr_code || ''; $('itemStatus').value = item.status || '사용중'; $('itemMemo').value = item.memo || '';
}
async function saveItem(ev){
  ev.preventDefault();
  const payload = {
    id:$('itemId').value, name:$('itemName').value, category:$('itemCategory').value, location:$('itemLocation').value,
    spec:$('itemSpec').value, stock_qty:$('itemStock').value, unit:$('itemUnit').value,
    pack_qty:$('itemPack').value, supplier:$('itemSupplier').value, qr_code:$('itemQr').value, status:$('itemStatus').value, memo:$('itemMemo').value
  };
  try{
    const item = await api('/api/items', {method:'POST', body:JSON.stringify(payload)});
    await refresh(); setSelected(item); toast('저장했습니다. QR이 발급되었습니다.');
  }catch(e){ toast(e.message); }
}
async function applyMove(ev){
  ev.preventDefault();
  const payload = { item_id:$('moveItem').value, action:$('moveAction').value, qty:$('moveQty').value, worker:$('moveWorker').value, reason:$('moveReason').value, ref_no:$('moveRef').value, memo:$('moveMemo').value };
  try{
    const res = await api('/api/movement', {method:'POST', body:JSON.stringify(payload)});
    $('moveQty').value=''; $('moveReason').value=''; $('moveRef').value=''; $('moveMemo').value='';
    await refresh(); setSelected(res.item); toast(`반영 완료: ${res.movement.before_qty} → ${res.movement.after_qty}`);
  }catch(e){ toast(e.message); }
}
async function hideItem(){
  const id = $('itemId').value;
  if(!id){ toast('숨김 처리할 자재를 선택하세요.'); return; }
  if(!confirm('이 자재를 재고판에서 숨김 처리할까요? 기록은 남아있습니다.')) return;
  try{ await api(`/api/items/${id}/hide`, {method:'POST', body:'{}'}); clearItemForm(); await refresh(); toast('숨김 처리했습니다.'); }catch(e){ toast(e.message); }
}
async function manualBackup(){
  try{ await api('/api/backup'); toast('DB 백업을 만들었습니다.'); }catch(e){ toast(e.message); }
}
async function refresh(){ await Promise.all([loadDashboard(), loadMeta(), loadItems(), loadMovements()]); }
async function startCamera(){
  try{
    if(!('BarcodeDetector' in window)) throw new Error('이 브라우저는 카메라 QR 인식을 지원하지 않습니다. USB QR 스캐너나 QR 직접입력을 사용하세요.');
    state.detector = new BarcodeDetector({formats:['qr_code']});
    state.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video = $('scanVideo'); video.srcObject = state.stream; video.style.display='block'; await video.play();
    $('scanStatus').textContent = '스캔중';
    state.scanTimer = setInterval(async()=>{
      try{
        const codes = await state.detector.detect(video);
        if(codes.length){
          const val = codes[0].rawValue; $('qrInput').value = cleanQR(val); stopCamera(); lookupQR(val);
        }
      }catch(err){}
    }, 500);
  }catch(e){ toast(e.message); $('scanStatus').textContent='카메라 불가'; }
}
function stopCamera(){
  if(state.scanTimer) clearInterval(state.scanTimer);
  state.scanTimer = null;
  if(state.stream){ state.stream.getTracks().forEach(t=>t.stop()); state.stream=null; }
  $('scanVideo').style.display='none'; $('scanStatus').textContent='대기중';
}
function bind(){
  $('lookupBtn').addEventListener('click', ()=>lookupQR());
  $('qrInput').addEventListener('keydown', e=>{ if(e.key==='Enter') lookupQR(); });
  $('cameraBtn').addEventListener('click', startCamera); $('stopCameraBtn').addEventListener('click', stopCamera);
  $('loginForm').addEventListener('submit', login); $('logoutBtn').addEventListener('click', logout);
  $('itemForm').addEventListener('submit', saveItem); $('movementForm').addEventListener('submit', applyMove);
  $('newItemBtn').addEventListener('click', clearItemForm); $('hideItemBtn').addEventListener('click', hideItem); $('backupBtn').addEventListener('click', manualBackup);
  $('generateQrBtn').addEventListener('click', ()=>{ $('itemQr').value = makeQrCode(); toast('새 QR 코드를 발급했습니다. 저장을 누르면 적용됩니다.'); });
  ['keyword','categoryFilter','locationFilter','zeroOnly'].forEach(id=>$(id).addEventListener('input', ()=>loadItems()));
  $('moveItem').addEventListener('change', ()=>{ const item = state.items.find(i=>String(i.id)===$('moveItem').value); if(item) setSelected(item); });
}
window.selectItem = selectItem;
bind(); checkLogin();
