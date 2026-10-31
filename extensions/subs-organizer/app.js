/* app.js — 정리함 화면 */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const S = {
  accounts: [],
  lists: {},
  picked: [],
  letters: {},
  ch: new Map(),
  keep: [],
  drop: [],
  target: null,
  act: {},
  srcF: 'all',
  actF: 'all',
  view: 'keep'
};
let lastAction = null;
const photo = (url, cls) => (url ? `<img class="${cls}" src="${esc(url)}" alt="">` : `<span class="${cls} noph"></span>`);
let toastTimer = null;

/* ============ 공통 ============ */
function showView(name) {
  $('#viewAccounts').hidden = name !== 'accounts';
  $('#viewBoard').hidden = name !== 'board';
  $('#viewRun').hidden = name !== 'run';
  document.querySelectorAll('#steps li').forEach((li) => li.classList.toggle('on', li.dataset.s === name));
  window.scrollTo(0, 0);
}
function showToast(msg, undo = true) {
  $('#toastMsg').textContent = msg;
  $('#undoBtn').hidden = !undo;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
}
function rel(ts) {
  const d = Math.floor((Date.now() - ts) / 864e5);
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return d + '일 전';
  if (d < 30) return Math.floor(d / 7) + '주 전';
  if (d < 365) return Math.floor(d / 30) + '개월 전';
  return Math.floor(d / 365) + '년 전';
}
function subsNum(s) {
  const m = String(s || '').replace(/,/g, '').match(/([\d.]+)\s*(천|만|억|K|M|B)?/i);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  const u = (m[2] || '').toUpperCase();
  if (u === '천' || u === 'K') n *= 1e3;
  if (u === '만') n *= 1e4;
  if (u === '억') n *= 1e8;
  if (u === 'M') n *= 1e6;
  if (u === 'B') n *= 1e9;
  return n;
}
const ERR_TEXT = {
  not_logged_in: '이 브라우저에서 YouTube에 로그인되어 있지 않아요. YouTube에 로그인한 뒤 다시 불러오기를 눌러 주세요.',
  account_mismatch: '계정 정보가 맞지 않아요. 잠시 후 다시 불러오기를 눌러 주세요.',
  no_data: 'YouTube 화면 데이터를 읽지 못했어요. YouTube 구조가 바뀌었을 수 있어요.',
  parse: 'YouTube 응답을 해석하지 못했어요. 잠시 후 다시 시도해 주세요.'
};

/* ============ 1. 계정 선택 ============ */
async function loadAccounts() {
  const st = $('#acctStatus');
  st.className = 'status';
  st.textContent = 'YouTube 계정과 구독 목록을 확인하는 중…';
  $('#acctGrid').replaceChildren();
  $('#loadBtn').disabled = true;
  $('#reloadAccounts').disabled = true;
  try {
    const res = await withDataTab(async (tabId) => {
      const a = await runInTab(tabId, ytAccounts);
      if (!a || a.error) return { error: (a && a.error) || 'unknown' };
      const accounts = a.accounts.filter((x) => !x.disabled);
      accounts.forEach((x, i) => {
        if (x.authuser == null) x.authuser = i;
      });
      const lists = {};
      await Promise.all(
        accounts.map(async (acc) => {
          if (acc.pageId) {
            acc.unsupported = true;
            return;
          }
          const r = await runInTab(tabId, ytSubs, [acc.authuser, null]);
          if (!r || r.error) {
            acc.err = (r && r.error) || 'unknown';
            return;
          }
          lists[acctKey(acc)] = r.channels;
          acc.count = r.channels.length;
          acc.partial = r.partial;
        })
      );
      return { accounts, lists };
    });
    if (res.error || !res.accounts.length) {
      st.className = 'status err';
      st.textContent = ERR_TEXT.not_logged_in;
      return;
    }
    S.accounts = res.accounts;
    S.lists = res.lists;
    const usable = new Set(S.accounts.filter((a) => !a.err && !a.unsupported).map(acctKey));
    S.picked = S.picked.filter((k) => usable.has(k));
    if (!S.picked.length) {
      try {
        const { lastPicked } = await chrome.storage.local.get('lastPicked');
        if (Array.isArray(lastPicked)) S.picked = lastPicked.filter((k) => usable.has(k));
      } catch (e) {}
    }
    st.textContent = '';
    renderAccounts();
  } catch (e) {
    st.className = 'status err';
    st.textContent = 'YouTube에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 불러오기를 눌러 주세요.';
  } finally {
    $('#reloadAccounts').disabled = false;
  }
}

function renderAccounts() {
  const grid = $('#acctGrid');
  grid.replaceChildren();
  S.accounts.forEach((a) => {
    const key = acctKey(a);
    const i = S.picked.indexOf(key);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'acct';
    b.setAttribute('aria-pressed', i >= 0);
    const bad = a.err || a.unsupported;
    b.disabled = !!bad;
    const sub = a.unsupported ? '브랜드 계정은 아직 지원하지 않아요' : a.err ? '구독 목록을 읽지 못했어요' : a.email || a.handle || a.byline;
    b.innerHTML = `
      ${i >= 0 ? `<span class="tag" style="background:var(--c${i % 6})">${String.fromCharCode(65 + i)}</span>` : ''}
      ${photo(a.photo, 'ph')}
      <span class="who"><b>${esc(a.name)}</b><span>${esc(sub)}</span>${a.selected ? '<span class="now">지금 YouTube에서 쓰는 계정</span>' : ''}</span>
      <span class="cnt">${bad ? '' : `<b class="num">${a.count}</b><span>구독${a.partial ? ' (일부)' : ''}</span>`}</span>
      <span class="check" aria-hidden="true">${i >= 0 ? '✓' : ''}</span>`;
    b.addEventListener('click', () => {
      const k = S.picked.indexOf(key);
      if (k >= 0) S.picked.splice(k, 1);
      else S.picked.push(key);
      renderAccounts();
    });
    grid.appendChild(b);
  });
  const n = S.picked.length;
  $('#loadBtn').disabled = n === 0;
  $('#loadBtn').textContent = n <= 1 ? '이 계정 정리하기' : `${n}개 계정 합치기`;
  $('#selInfo').textContent =
    n === 0 ? '계정을 1개 이상 골라 주세요.' : n === 1 ? '1개 계정: 구독을 정리합니다.' : `${n}개 계정: 구독 목록을 하나로 합칩니다. 고른 순서대로 A, B…로 표시돼요.`;
}

/* ============ 2. 정리 화면 ============ */
const isMerge = () => S.picked.length >= 2;
const acctOf = (key) => S.accounts.find((a) => acctKey(a) === key);
const letterOf = (key) => S.letters[key];
const inTarget = (id) => S.ch.get(id).src.has(S.target);
const srcGroup = (id) => {
  const s = S.ch.get(id).src;
  return s.size >= 2 ? 'multi' : [...s][0];
};

async function buildBoard() {
  try {
    await chrome.storage.local.set({ lastPicked: S.picked });
  } catch (e) {}
  S.letters = {};
  S.picked.forEach((k, i) => (S.letters[k] = { letter: String.fromCharCode(65 + i), color: `var(--c${i % 6})` }));
  S.ch = new Map();
  let o = 0;
  S.picked.forEach((key) => {
    (S.lists[key] || []).forEach((c) => {
      if (!S.ch.has(c.id)) S.ch.set(c.id, { ...c, src: new Set(), o: o++ });
      S.ch.get(c.id).src.add(key);
    });
  });
  const sig = S.picked.join('|');
  const defaultTarget = isMerge() ? S.picked.find((k) => acctOf(k).selected) || S.picked[0] : S.picked[0];
  let drop = [];
  let target = defaultTarget;
  try {
    const { board } = await chrome.storage.local.get('board');
    if (board && board.sig === sig) {
      drop = (board.drop || []).filter((id) => S.ch.has(id));
      if (board.target && S.picked.includes(board.target)) target = board.target;
    }
  } catch (e) {}
  const dropSet = new Set(drop);
  S.drop = drop;
  S.keep = [...S.ch.keys()].filter((id) => !dropSet.has(id));
  S.target = target;
  S.srcF = 'all';
  S.actF = 'all';
  $('#q').value = '';
  const sort = $('#sort');
  sort.innerHTML =
    (isMerge() ? '<option value="group">출처별로 묶기</option>' : '<option value="orig">원래 순서</option>') +
    '<option value="stale">오래 쉰 채널 먼저</option><option value="fresh">최근 업로드 순</option>' +
    '<option value="name">이름순</option><option value="subs">구독자 많은 순</option>';
  renderHead();
  render();
  showView('board');
  loadActivity();
}

function saveBoard() {
  try {
    chrome.storage.local.set({ board: { sig: S.picked.join('|'), drop: S.drop, target: S.target } });
  } catch (e) {}
}

function renderHead() {
  const chosen = $('#chosen');
  chosen.innerHTML =
    S.picked
      .map((k) => {
        const a = acctOf(k);
        const L = letterOf(k);
        return `<span class="chip-acct">${isMerge() ? `<span class="letter" style="background:${L.color}">${L.letter}</span>` : ''}${photo(a.photo, 'mini')}${esc(a.name)} <span class="num" style="color:var(--muted)">${a.count}</span></span>`;
      })
      .join('') + '<button class="btn small ghost" id="repick" type="button">계정 다시 고르기</button>';
  $('#repick').addEventListener('click', () => showView('accounts'));

  const tr = $('#targetRow');
  if (isMerge()) {
    $('#targetTitle').textContent = '남길 계정';
    $('#targetHint').textContent = '합친 구독 목록이 들어갈 계정을 고르세요. 다른 계정은 바뀌지 않습니다.';
    tr.hidden = false;
    tr.innerHTML = S.picked
      .map((k) => {
        const a = acctOf(k);
        const L = letterOf(k);
        return `<button class="acct" role="radio" type="button" data-k="${esc(k)}" aria-checked="${k === S.target}">
          <span class="letter" style="background:${L.color}">${L.letter}</span>
          ${photo(a.photo, 'ph')}
          <span class="who"><b>${esc(a.name)}</b><span>${esc(a.email || a.handle)}</span><span class="pick">남길 계정</span></span></button>`;
      })
      .join('');
    tr.querySelectorAll('[data-k]').forEach((b) =>
      b.addEventListener('click', () => {
        S.target = b.dataset.k;
        saveBoard();
        renderHead();
        render();
        showToast(`남길 계정: ${acctOf(S.target).name}`, false);
      })
    );
    $('#compare').hidden = false;
  } else {
    const a = acctOf(S.target);
    $('#targetTitle').textContent = `${a.name} 계정 정리`;
    $('#targetHint').textContent = '빼둔 채널은 실행할 때 구독 취소됩니다. 실행 전까지는 언제든 다시 넣을 수 있어요.';
    tr.hidden = true;
    $('#compare').hidden = true;
  }
}

/* --- 활동(최근 업로드) --- */
const ACT_TTL = 12 * 3600e3;
function actState(id) {
  const a = S.act[id];
  if (!a) return 'loading';
  if (a.err) return 'unknown';
  const last = Math.max(a.v ? a.v.t : 0, a.s ? a.s.t : 0);
  if (!last) return 'none';
  const d = (Date.now() - last) / 864e5;
  return d <= 30 ? 'active' : d <= 365 ? 'slow' : 'dormant';
}
const ACT_LABEL = { active: '활발', slow: '뜸함', dormant: '휴면', none: '영상 없음', unknown: '확인 불가', loading: '확인 중' };
const ACT_DESC = { active: '30일 안에 업로드', slow: '1년 안에 업로드', dormant: '1년 넘게 업로드 없음', none: '공개 영상 없음', unknown: '최근 업로드를 확인하지 못함', loading: '' };
function lastUpload(id) {
  const a = S.act[id];
  if (!a || a.err) return null;
  return Math.max(a.v ? a.v.t : 0, a.s ? a.s.t : 0);
}

function decodeXml(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
async function feed(q) {
  const r = await fetch('https://www.youtube.com/feeds/videos.xml?' + q, { credentials: 'omit', cache: 'no-store' });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error('http ' + r.status);
  const x = await r.text();
  return [...x.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => {
      const e = m[1];
      const url = (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1] || '';
      return {
        t: Date.parse((e.match(/<published>([^<]+)/) || [])[1] || ''),
        title: decodeXml((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ''),
        url,
        short: url.includes('/shorts/')
      };
    })
    .filter((x) => !isNaN(x.t));
}
const newest = (arr) => arr.reduce((a, b) => (!a || b.t > a.t ? b : a), null);
async function fetchActivity(id) {
  try {
    const tail = id.slice(2);
    const e = await feed('channel_id=' + id);
    let v = newest(e.filter((x) => !x.short));
    let s = newest(e.filter((x) => x.short));
    // 최근 15개가 한 종류로만 채워져 있으면 영상 전용 / 쇼츠 전용 피드를 한 번 더 본다
    if (e.length >= 15 && !v) v = newest(await feed('playlist_id=UULF' + tail).catch(() => []));
    if (e.length >= 15 && !s) s = newest(await feed('playlist_id=UUSH' + tail).catch(() => []));
    const pack = (x) => (x ? { t: x.t, title: x.title, url: x.url } : null);
    return { at: Date.now(), v: pack(v), s: pack(s) };
  } catch (err) {
    return { at: Date.now() - ACT_TTL + 10 * 60e3, err: true };
  }
}

let actTimer = null;
function scheduleActRefresh() {
  if (actTimer) return;
  actTimer = setTimeout(() => {
    actTimer = null;
    renderChips();
    if (['stale', 'fresh'].includes($('#sort').value) || S.actF !== 'all') render();
  }, 600);
}
async function loadActivity() {
  let cache = {};
  try {
    cache = (await chrome.storage.local.get('actCache')).actCache || {};
  } catch (e) {}
  const ids = [...S.ch.keys()];
  const todo = [];
  ids.forEach((id) => {
    const c = cache[id];
    if (c && Date.now() - c.at < ACT_TTL) S.act[id] = c;
    else todo.push(id);
  });
  render();
  const prog = $('#actProgress');
  if (!todo.length) {
    prog.textContent = '';
    return;
  }
  let i = 0;
  let done = 0;
  const show = () => (prog.textContent = `최근 업로드 확인 중… ${done} / ${todo.length}`);
  show();
  const worker = async () => {
    while (i < todo.length) {
      const id = todo[i++];
      const a = await fetchActivity(id);
      S.act[id] = a;
      cache[id] = a;
      done++;
      patchActivity(id);
      show();
      scheduleActRefresh();
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const fails = todo.filter((id) => S.act[id] && S.act[id].err).length;
  prog.textContent = fails ? `${fails}개 채널은 최근 업로드를 확인하지 못했어요. 나중에 다시 열면 다시 확인합니다.` : '';
  const keepIds = new Set(Object.keys(cache).sort((a, b) => cache[b].at - cache[a].at).slice(0, 3000));
  Object.keys(cache).forEach((k) => {
    if (!keepIds.has(k)) delete cache[k];
  });
  try {
    await chrome.storage.local.set({ actCache: cache });
  } catch (e) {}
  render();
}

/* --- 행 --- */
const ICON_OUT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
const ICON_IN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>';

function rowAction(id, lane) {
  if (lane === 'keep') return inTarget(id) ? ['have', isMerge() ? '이미 구독 중' : '유지'] : ['new', '새로 구독'];
  return inTarget(id) ? ['unsub', '구독 취소'] : ['skip', '안 옮김'];
}
function srcBadge(c) {
  if (!isMerge()) return '';
  return (
    '<span class="src">' +
    S.picked.map((k) => `<i class="${c.src.has(k) ? '' : 'off'}" style="background:${letterOf(k).color}">${letterOf(k).letter}</i>`).join('') +
    '</span>'
  );
}
function recentHTML(id) {
  const a = S.act[id];
  if (!a) return '<span class="k">최근 업로드 확인 중…</span>';
  if (a.err) return '<span class="k">최근 업로드 확인 불가</span>';
  const part = (lbl, x) =>
    x ? `<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.title)}">${lbl} ${rel(x.t)}</a>` : `<span class="k">${lbl} 없음</span>`;
  return part('영상', a.v) + '<span class="dot">·</span>' + part('쇼츠', a.s);
}
function pillHTML(id) {
  const st = actState(id);
  return `<span class="pill ${st}" title="${esc(ACT_DESC[st])}">${ACT_LABEL[st]}</span>`;
}
function makeRow(id, lane) {
  const c = S.ch.get(id);
  const [cls, txt] = rowAction(id, lane);
  const el = document.createElement('div');
  el.className = 'row';
  el.dataset.id = id;
  el.draggable = true;
  const btn =
    lane === 'keep'
      ? `<button class="icon out" data-act="drop" title="빼기" aria-label="${esc(c.name)} 빼기" type="button">${ICON_OUT}</button>`
      : `<button class="icon in" data-act="keep" title="다시 넣기" aria-label="${esc(c.name)} 다시 넣기" type="button">${ICON_IN}</button>`;
  el.innerHTML = `<div class="avw"><img class="av" src="${esc(c.thumb)}" alt="" loading="lazy">${srcBadge(c)}</div>
    <div class="meta">
      <div class="name-line"><a class="name" href="https://www.youtube.com/channel/${esc(id)}" target="_blank" rel="noopener">${esc(c.name)}</a><span class="pillw">${pillHTML(id)}</span></div>
      <div class="info">${esc(c.handle)}${c.handle && c.subs ? '<span class="dot">·</span>' : ''}${esc(c.subs)}</div>
      <div class="recent">${recentHTML(id)}</div>
    </div>
    <span class="act ${cls}">${txt}</span>${btn}`;
  return el;
}
function patchActivity(id) {
  document.querySelectorAll(`.row[data-id="${CSS.escape(id)}"]`).forEach((el) => {
    el.querySelector('.recent').innerHTML = recentHTML(id);
    el.querySelector('.pillw').innerHTML = pillHTML(id);
  });
}

/* --- 필터·정렬 --- */
function visible(id) {
  const c = S.ch.get(id);
  if (S.srcF !== 'all' && srcGroup(id) !== S.srcF) return false;
  if (S.actF !== 'all') {
    const st = actState(id);
    if (S.actF === 'other' ? !['unknown', 'loading'].includes(st) : st !== S.actF) return false;
  }
  const q = $('#q').value.trim().toLowerCase();
  if (!q) return true;
  return c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q);
}
function sorted(ids) {
  const s = $('#sort').value;
  const a = [...ids];
  const ch = S.ch;
  if (s === 'name') a.sort((x, y) => ch.get(x).name.localeCompare(ch.get(y).name, 'ko'));
  else if (s === 'subs') a.sort((x, y) => subsNum(ch.get(y).subs) - subsNum(ch.get(x).subs));
  else if (s === 'stale' || s === 'fresh') {
    const val = (id) => {
      const t = lastUpload(id);
      return t === null ? null : t;
    };
    a.sort((x, y) => {
      const vx = val(x), vy = val(y);
      if (vx === null && vy === null) return ch.get(x).o - ch.get(y).o;
      if (vx === null) return 1;
      if (vy === null) return -1;
      return s === 'stale' ? vx - vy : vy - vx;
    });
  } else a.sort((x, y) => ch.get(x).o - ch.get(y).o);
  return a;
}
function groupsDef() {
  const g = [['multi', S.picked.length === 2 ? '두 계정 모두' : '여러 계정에 있음']];
  S.picked.forEach((k) => g.push([k, `${letterOf(k).letter} · ${acctOf(k).name}에만`]));
  return g;
}

function emptyMsg(el, t) {
  const e = document.createElement('div');
  e.className = 'empty';
  e.textContent = t;
  el.appendChild(e);
}
function render() {
  const keepEl = $('#keepList');
  const dropEl = $('#dropList');
  keepEl.replaceChildren();
  const k = sorted(S.keep.filter(visible));
  if ($('#sort').value === 'group') {
    groupsDef().forEach(([g, label]) => {
      const ids = k.filter((i) => srcGroup(i) === g);
      if (!ids.length) return;
      const h = document.createElement('div');
      h.className = 'group-h';
      h.textContent = `${label} · ${ids.length}`;
      keepEl.appendChild(h);
      ids.forEach((i) => keepEl.appendChild(makeRow(i, 'keep')));
    });
  } else k.forEach((i) => keepEl.appendChild(makeRow(i, 'keep')));
  if (!k.length) emptyMsg(keepEl, S.keep.length ? '조건에 맞는 채널이 없습니다' : '모든 채널을 빼두었습니다');

  dropEl.replaceChildren();
  const d = S.drop.filter(visible);
  d.forEach((i) => dropEl.appendChild(makeRow(i, 'drop')));
  if (!d.length) emptyMsg(dropEl, S.drop.length ? '조건에 맞는 채널이 없습니다' : '여기로 빼둔 채널이 쌓입니다');

  const filtering = S.srcF !== 'all' || S.actF !== 'all' || $('#q').value.trim();
  const bulk = $('#bulkDrop');
  bulk.hidden = !(filtering && k.length);
  bulk.textContent = `보이는 ${k.length}개 모두 빼기`;
  renderPlan();
  renderChips();
}

function renderPlan() {
  const tset = new Set((S.lists[S.target] || []).map((c) => c.id));
  const keep = S.keep;
  const newN = keep.filter((id) => !tset.has(id)).length;
  const have = keep.filter((id) => tset.has(id)).length;
  const unsub = S.drop.filter((id) => tset.has(id)).length;
  const dormant = [...S.ch.keys()].filter((id) => actState(id) === 'dormant').length;
  const name = acctOf(S.target).name;
  const stat = (cls, n, label) => `<div class="stat ${cls}"><b class="num">${n}</b><span>${label}</span></div>`;
  $('#plan').innerHTML = isMerge()
    ? stat('total', keep.length, '합친 뒤 구독 수') + stat('new', newN, `${esc(name)}에 새로 구독`) + stat('', have, '이미 구독 중') + stat('unsub', unsub, '구독 취소할 채널')
    : stat('total', keep.length, '정리 후 구독 수') + stat('', tset.size, '지금 구독 수') + stat('unsub', unsub, '구독 취소할 채널') + stat('', dormant, '1년 넘게 쉰 채널');
  $('#tKeep').textContent = S.keep.length;
  $('#tDrop').textContent = S.drop.length;
  $('#toRunBtn').disabled = newN + unsub === 0;
}

function renderChips() {
  const all = [...S.ch.keys()];
  // 출처 칩과 비교 띠 (합치기 모드)
  const sc = $('#srcChips');
  if (isMerge()) {
    const defs = [['all', '전체', all.length], ...groupsDef().map(([g, label]) => [g, g === 'multi' ? label : letterOf(g).letter + '에만', all.filter((i) => srcGroup(i) === g).length])];
    sc.innerHTML = defs
      .map(([g, label, n]) => `<button class="chip" type="button" data-src="${esc(g)}" aria-pressed="${S.srcF === g}">${esc(label)} <span class="num">${n}</span></button>`)
      .join('');
    sc.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', () => setSrc(b.dataset.src)));
    const singles = S.picked.map((k) => [k, all.filter((i) => srcGroup(i) === k).length]);
    const multiN = all.filter((i) => srcGroup(i) === 'multi').length;
    const segs = S.picked.length === 2 ? [singles[0], ['multi', multiN], singles[1]] : [...singles, ['multi', multiN]];
    const strip = $('#strip');
    strip.classList.toggle('filtered', S.srcF !== 'all');
    strip.innerHTML = segs
      .filter(([, n]) => n > 0)
      .map(([g, n]) => {
        const color = g === 'multi' ? 'var(--multi)' : letterOf(g).color;
        const label = g === 'multi' ? (S.picked.length === 2 ? '둘 다' : '여러 계정') : letterOf(g).letter + '에만';
        return `<button class="seg ${S.srcF === g ? 'on' : ''}" type="button" data-src="${esc(g)}" style="flex:${n};background:${color}"><span class="num">${n}</span><span>${label}</span></button>`;
      })
      .join('');
    strip.querySelectorAll('[data-src]').forEach((b) => b.addEventListener('click', () => setSrc(b.dataset.src)));
    $('#legend').innerHTML =
      S.picked.map((k) => `<span><i style="background:${letterOf(k).color}"></i>${letterOf(k).letter} · ${esc(acctOf(k).name)}에만 있는 채널</span>`).join('') +
      `<span><i style="background:var(--multi)"></i>${S.picked.length === 2 ? '두 계정 모두' : '2개 이상 계정에'} 구독</span>`;
  } else sc.innerHTML = '';

  // 활동 칩
  const count = (st) => all.filter((i) => actState(i) === st).length;
  const other = count('unknown') + count('loading');
  const defs = [
    ['all', '전체 활동', all.length],
    ['active', '활발', count('active')],
    ['slow', '뜸함', count('slow')],
    ['dormant', '휴면', count('dormant')],
    ['none', '영상 없음', count('none')]
  ];
  if (other) defs.push(['other', count('loading') ? '확인 중' : '확인 불가', other]);
  $('#actChips').innerHTML = defs
    .filter(([k, , n]) => k === 'all' || n > 0)
    .map(([k, label, n]) => `<button class="chip" type="button" data-actf="${k}" aria-pressed="${S.actF === k}" title="${esc(ACT_DESC[k] || '')}">${label} <span class="num">${n}</span></button>`)
    .join('');
  $('#actChips').querySelectorAll('[data-actf]').forEach((b) =>
    b.addEventListener('click', () => {
      S.actF = S.actF === b.dataset.actf && b.dataset.actf !== 'all' ? 'all' : b.dataset.actf;
      render();
    })
  );
}
function setSrc(g) {
  S.srcF = S.srcF === g && g !== 'all' ? 'all' : g;
  render();
}

/* --- 이동 --- */
function animateOut(el, dir, done) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done();
    return;
  }
  el.classList.add(dir === 'right' ? 'leaving-right' : 'leaving-left');
  setTimeout(() => {
    el.style.height = el.offsetHeight + 'px';
    el.classList.add('collapse');
    requestAnimationFrame(() => {
      el.style.height = '0px';
      el.style.paddingTop = '0';
      el.style.paddingBottom = '0';
      el.style.borderWidth = '0';
      el.style.marginTop = '-6px';
    });
    setTimeout(done, 220);
  }, 260);
}
function move(id, to, { index = null, animate = true, toast = true } = {}) {
  const from = S.keep.includes(id) ? 'keep' : 'drop';
  if (from === to) return;
  const prevIndex = S[from].indexOf(id);
  const el = document.querySelector(`#${from}List .row[data-id="${CSS.escape(id)}"]`);
  const apply = () => {
    S[from].splice(S[from].indexOf(id), 1);
    if (index !== null) S[to].splice(index, 0, id);
    else if (to === 'drop') S.drop.unshift(id);
    else S.keep.push(id);
    saveBoard();
    render();
    const n = document.querySelector(`#${to}List .row[data-id="${CSS.escape(id)}"]`);
    if (n) n.classList.add('arrive');
  };
  lastAction = { id, from, prevIndex };
  if (animate) animateOut(el, to === 'drop' ? 'right' : 'left', apply);
  else apply();
  if (toast) showToast(to === 'drop' ? `‘${S.ch.get(id).name}’ 빼둠` : `‘${S.ch.get(id).name}’ 다시 넣음`);
}
function snapshot() {
  return { keep: [...S.keep], drop: [...S.drop] };
}
function restore(snap) {
  S.keep = snap.keep;
  S.drop = snap.drop;
  saveBoard();
  render();
}

/* ============ 3. 실행 ============ */
function computeOps() {
  const tset = new Set((S.lists[S.target] || []).map((c) => c.id));
  const keepSet = new Set(S.keep);
  const subs = S.keep.filter((id) => !tset.has(id));
  const unsubs = [...tset].filter((id) => !keepSet.has(id));
  return { subs, unsubs, desired: [...keepSet] };
}
function openConfirm() {
  const { subs, unsubs } = computeOps();
  const a = acctOf(S.target);
  $('#runTarget').innerHTML = `${photo(a.photo, 'ph')}<div><b>${esc(a.name)}</b><span>${esc(a.email || a.handle)} · 이 계정의 구독만 바뀝니다</span></div>`;
  const stat = (cls, n, label) => `<div class="stat ${cls}"><b class="num">${n}</b><span>${label}</span></div>`;
  $('#runPlan').innerHTML = stat('new', subs.length, '새로 구독') + stat('unsub', unsubs.length, '구독 취소') + stat('total', S.keep.length, '끝난 뒤 구독 수') + stat('', Math.max(1, Math.ceil(((subs.length + unsubs.length) * 7) / 60)), '예상 시간(분)');
  $('#runNotes').innerHTML = [
    '작업용 YouTube 창이 지금 브라우저 오른쪽 위에 하나 열려요. 창 아래쪽에 "구독 채널 정리함이 작업 중" 안내가 보이고, 작업 표시줄에도 진행 상황이 제목으로 나와요.',
    '끝나면 작업 창은 자동으로 닫혀요. 그전에는 닫거나 최소화하지 말아 주세요. 다른 창 뒤에 가려져 있는 건 괜찮아요. 실수로 닫으면 자동으로 일시정지돼요.',
    '채널마다 몇 초씩 간격을 두고 처리합니다. 너무 빠르게 누르면 YouTube가 일시적으로 막을 수 있어서예요.',
    '채널을 열 때마다 남길 계정으로 열렸는지 확인하고, 다른 계정이면 건너뜁니다.',
    '이 탭은 닫아도 작업은 계속됩니다. 확장 아이콘을 다시 누르면 진행 상황을 볼 수 있어요.'
  ]
    .map((t) => `<li>${t}</li>`)
    .join('');
  const li = (ids) => ids.map((id) => `<li>${esc(S.ch.get(id).name)}</li>`).join('');
  $('#runPreview').innerHTML =
    (subs.length ? `<h4>새로 구독 ${subs.length}개</h4><ul>${li(subs)}</ul>` : '') +
    (unsubs.length ? `<h4>구독 취소 ${unsubs.length}개</h4><ul>${li(unsubs)}</ul>` : '');
  $('#runStart').disabled = subs.length + unsubs.length === 0;
  $('#runConfirm').hidden = false;
  $('#runPanel').hidden = true;
  showView('run');
}
/* 로그에 남길 작업 설명: 어느 계정에서 왔는지, 왜 바뀌는지, 채널 활동 상태 */
function acctTag(k) {
  const a = acctOf(k);
  return isMerge() ? `${letterOf(k).letter} · ${a.name}` : a.name;
}
function activityText(id) {
  const st = actState(id);
  const t = lastUpload(id);
  if (st === 'none') return '공개 영상 없음';
  if (st === 'unknown' || st === 'loading' || !t) return '';
  return `${ACT_LABEL[st]}(마지막 업로드 ${rel(t)})`;
}
function opNote(id, op) {
  const c = S.ch.get(id);
  const target = acctOf(S.target).name;
  const others = [...c.src].filter((k) => k !== S.target);
  let base;
  if (op === 'sub') {
    base = `출처: ${others.map(acctTag).join(', ')}에 구독됨 → ${target}에는 없어서 새로 구독`;
  } else {
    base = `${target}에서 구독 취소 · 사용자가 뺀 채널`;
    if (others.length) base += ` · ${others.map(acctTag).join(', ')}의 구독은 그대로 둠`;
  }
  const act = activityText(id);
  return act ? `${base} · ${act}` : base;
}

async function startRun() {
  const { subs, unsubs, desired } = computeOps();
  const a = acctOf(S.target);
  const names = {};
  S.ch.forEach((c, id) => (names[id] = c.name));
  const ops = [
    ...subs.map((id) => ({ op: 'sub', id, name: names[id], note: opNote(id, 'sub') })),
    ...unsubs.map((id) => ({ op: 'unsub', id, name: names[id], note: opNote(id, 'unsub') }))
  ];
  await chrome.storage.local.set({ runNames: names });
  await chrome.runtime.sendMessage({
    type: 'run:start',
    target: { authuser: a.authuser, pageId: a.pageId || null, name: a.name, email: a.email || a.handle, photo: a.photo },
    ops,
    desired
  });
  $('#runConfirm').hidden = true;
  $('#runPanel').hidden = false;
}

let runNames = {};

/* ---------- 실행 로그 (터미널) ---------- */
const pad2 = (n) => String(n).padStart(2, '0');
const hms = (t) => {
  const d = new Date(t);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const ymd = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const LV_W = 6;
let logState = { runId: null, count: 0, last: null };
let lastRunForLog = null;
function logLineText([t, lv, m]) {
  return `[${hms(t)}] ${(lv || '').padEnd(LV_W)} ${m}`;
}
function logLineEl([t, lv, m]) {
  const ln = document.createElement('div');
  ln.className = 'ln';
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = `[${hms(t)}]`;
  ts.title = `${ymd(t)} ${hms(t)}`;
  const tag = document.createElement('span');
  tag.className = 'lv lv-' + (lv || 'none').toLowerCase();
  tag.textContent = (lv || '').padEnd(LV_W);
  const msg = document.createElement('span');
  msg.className = 'm';
  msg.textContent = m;
  ln.append(ts, tag, msg);
  return ln;
}
function renderLog(run) {
  lastRunForLog = run;
  const el = $('#runLog');
  const lines = run.log || [];
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  const first = logState.runId !== run.startedAt;
  // 새 실행이거나, 오래된 줄이 잘려서 앞부분이 바뀐 경우에는 전부 다시 그린다
  const stale = first || lines.length < logState.count || (lines.length && logState.last && lines[Math.min(logState.count, lines.length) - 1] && lines[Math.min(logState.count, lines.length) - 1][0] !== logState.last);
  if (stale) {
    el.replaceChildren();
    logState = { runId: run.startedAt, count: 0, last: null };
  }
  const cur = el.querySelector('.cursor');
  if (cur) cur.remove();
  const frag = document.createDocumentFragment();
  for (let i = logState.count; i < lines.length; i++) frag.appendChild(logLineEl(lines[i]));
  el.appendChild(frag);
  logState.count = lines.length;
  logState.last = lines.length ? lines[lines.length - 1][0] : null;
  if (run.status === 'running') {
    const c = document.createElement('div');
    c.className = 'ln cursor';
    c.innerHTML = '<span class="ts"></span><span class="blink">▍</span>';
    el.appendChild(c);
  }
  if (first || stale || atBottom) {
    el.scrollTop = el.scrollHeight;
    $('#logJump').hidden = true;
  } else {
    $('#logJump').hidden = false;
  }
}
function logText() {
  const run = lastRunForLog;
  if (!run || !run.log) return '';
  const head = `# 구독 채널 정리함 실행 로그 · ${ymd(run.startedAt)} · 대상 ${run.target.name}`;
  return [head, ...run.log.map(logLineText)].join('\n');
}
$('#runLog').addEventListener('scroll', () => {
  const el = $('#runLog');
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) $('#logJump').hidden = true;
});
$('#logJump').addEventListener('click', () => {
  const el = $('#runLog');
  el.scrollTop = el.scrollHeight;
  $('#logJump').hidden = true;
});
$('#logCopy').addEventListener('click', () => {
  navigator.clipboard.writeText(logText()).then(
    () => showToast('로그를 복사했어요', false),
    () => showToast('복사하지 못했어요. 저장을 이용해 주세요.', false)
  );
});
$('#logSave').addEventListener('click', () => {
  const run = lastRunForLog;
  if (!run) return;
  const d = new Date(run.startedAt);
  const name = `subs-organizer-log-${ymd(run.startedAt).replace(/-/g, '')}-${pad2(d.getHours())}${pad2(d.getMinutes())}.txt`;
  const url = URL.createObjectURL(new Blob([logText() + '\n'], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});
function renderRun(run) {
  if (!run) return;
  const ops = run.ops;
  const total = ops.length;
  const okN = ops.filter((o) => o.st === 'ok').length;
  const failN = ops.filter((o) => o.st === 'fail').length;
  const doneN = okN + failN;
  const left = total - doneN;
  $('#runFill').style.width = (total ? (doneN / total) * 100 : 100) + '%';
  const titles = { running: run.phase === 'verify' ? '결과 확인 중' : '진행 중', paused: '일시정지됨', stopped: '중지됨', done: '완료' };
  $('#runTitle').textContent = `${titles[run.status] || ''} · ${run.target.name}`;
  $('#runStats').innerHTML = `<span><b class="num">${doneN}</b> / ${total} 처리</span><span>성공 <b class="num">${okN}</b></span><span>실패 <b class="num">${failN}</b></span>${
    run.status === 'running' && left ? `<span>남은 시간 약 <b class="num">${Math.max(1, Math.ceil((left * 7) / 60))}</b>분</span>` : ''
  }`;
  const cur = ops[run.current];
  $('#runCurrent').textContent =
    run.status === 'running' && run.phase !== 'verify' && cur && cur.st === 'working' ? `${cur.op === 'sub' ? '구독하는 중' : '구독 취소하는 중'}: ${cur.name}` : run.phase === 'verify' && run.status === 'running' ? '남길 계정의 구독 목록을 다시 받아 목표와 비교하는 중…' : '';
  if (run.status === 'paused' && run.pauseReason === 'window_closed') {
    $('#runCurrent').textContent = '작업 창이 닫혀서 일시정지했어요. 계속을 누르면 새 작업 창을 열고 이어서 진행해요.';
  }
  $('#runShowWin').hidden = !(run.status === 'running' && run.phase !== 'verify');
  $('#runPause').hidden = run.status !== 'running';
  $('#runResume').hidden = !['paused', 'stopped'].includes(run.status) || left === 0;
  $('#runStop').hidden = !['running', 'paused'].includes(run.status);

  renderLog(run);

  const res = $('#runResult');
  if (run.status === 'done' && run.verify) {
    res.hidden = false;
    const v = run.verify;
    const nm = (id) => esc(runNames[id] || id);
    if (v.error) {
      res.className = 'run-result bad';
      res.innerHTML = `<h3>작업은 끝났지만 결과를 확인하지 못했어요</h3><p class="hint">YouTube 구독 목록을 다시 읽지 못했습니다. 잠시 후 계정 선택 화면에서 다시 불러와 확인해 주세요.</p><div class="actions"><button class="btn primary" data-do="restart" type="button">처음으로</button></div>`;
    } else if (!v.missing.length && !v.extra.length) {
      res.className = 'run-result good';
      res.innerHTML = `<h3>${esc(run.target.name)} 계정의 구독이 목표와 정확히 일치합니다</h3><p class="hint">지금 구독 수 ${v.total}개. 실패로 표시된 항목이 있어도 최종 목록 기준으로는 모두 반영된 상태예요.</p><div class="actions"><button class="btn primary" data-do="restart" type="button">처음으로</button></div>`;
    } else {
      res.className = 'run-result bad';
      res.innerHTML = `<h3>목표와 다른 채널이 ${v.missing.length + v.extra.length}개 남았어요</h3>
        ${v.missing.length ? `<p class="hint">구독되어야 하는데 안 된 채널 ${v.missing.length}개</p><ul>${v.missing.map((id) => `<li>${nm(id)}</li>`).join('')}</ul>` : ''}
        ${v.extra.length ? `<p class="hint">구독 취소되어야 하는데 남은 채널 ${v.extra.length}개</p><ul>${v.extra.map((id) => `<li>${nm(id)}</li>`).join('')}</ul>` : ''}
        <div class="actions"><button class="btn" data-do="restart" type="button">처음으로</button><button class="btn primary" data-do="retry" type="button">남은 것 다시 시도</button></div>`;
    }
  } else if (run.status === 'stopped') {
    res.hidden = false;
    res.className = 'run-result bad';
    res.innerHTML = `<h3>중지했어요</h3><p class="hint">남은 ${left}개는 처리하지 않았습니다. 계속을 누르면 이어서 진행해요.</p><div class="actions"><button class="btn" data-do="restart" type="button">처음으로</button></div>`;
  } else res.hidden = true;
  res.querySelectorAll('[data-do]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (b.dataset.do === 'restart') {
        await chrome.runtime.sendMessage({ type: 'run:clear' });
        showView('accounts');
        loadAccounts();
      } else if (b.dataset.do === 'retry') {
        const ops = [
          ...run.verify.missing.map((id) => ({ op: 'sub', id, name: runNames[id] || id, note: '결과 확인에서 아직 구독되지 않은 채널 → 다시 구독' })),
          ...run.verify.extra.map((id) => ({ op: 'unsub', id, name: runNames[id] || id, note: '결과 확인에서 아직 남아 있는 채널 → 다시 구독 취소' }))
        ];
        await chrome.runtime.sendMessage({ type: 'run:start', target: run.target, ops, desired: run.desired, retry: true });
      }
    })
  );
}

/* ============ 이벤트 ============ */
$('#reloadAccounts').addEventListener('click', loadAccounts);
$('#clearData').addEventListener('click', async () => {
  const { run } = await chrome.storage.local.get('run');
  if (run && ['running', 'paused'].includes(run.status)) {
    showToast('실행 중인 작업이 있어서 지울 수 없어요. 작업을 중지한 뒤 다시 시도해 주세요.', false);
    return;
  }
  await chrome.storage.local.clear();
  S.act = {};
  S.picked = [];
  renderAccounts();
  showToast('이 브라우저에 저장된 데이터를 모두 지웠어요', false);
});
$('#loadBtn').addEventListener('click', buildBoard);
$('#q').addEventListener('input', render);
$('#sort').addEventListener('change', render);
$('#toRunBtn').addEventListener('click', openConfirm);
$('#runBack').addEventListener('click', () => showView('board'));
$('#runStart').addEventListener('click', startRun);
$('#runPause').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'run:pause' }));
$('#runShowWin').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'run:focusWindow' }));
$('#runResume').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'run:resume' }));
$('#runStop').addEventListener('click', () => chrome.runtime.sendMessage({ type: 'run:stop' }));
$('#resetBtn').addEventListener('click', () => {
  lastAction = { bulk: true, prev: snapshot() };
  restore({ keep: [...S.ch.keys()], drop: [] });
  S.srcF = 'all';
  S.actF = 'all';
  $('#q').value = '';
  render();
  showToast('처음 상태로 돌림');
});
$('#bulkDrop').addEventListener('click', () => {
  const ids = S.keep.filter(visible);
  if (!ids.length) return;
  lastAction = { bulk: true, prev: snapshot() };
  const set = new Set(ids);
  restore({ keep: S.keep.filter((id) => !set.has(id)), drop: [...ids, ...S.drop] });
  showToast(`${ids.length}개 채널 빼둠`);
});
$('#restoreAll').addEventListener('click', () => {
  if (!S.drop.length) return;
  lastAction = { bulk: true, prev: snapshot() };
  const keep = [...S.keep, ...S.drop].sort((x, y) => S.ch.get(x).o - S.ch.get(y).o);
  restore({ keep, drop: [] });
  showToast('빼둔 채널을 모두 다시 넣음');
});
$('#undoBtn').addEventListener('click', () => {
  if (!lastAction) return;
  const a = lastAction;
  lastAction = null;
  $('#toast').classList.remove('show');
  if (a.bulk) {
    restore(a.prev);
    return;
  }
  move(a.id, a.from, { index: a.prevIndex, toast: false });
  lastAction = null;
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  move(b.closest('.row').dataset.id, b.dataset.act);
});

let dragId = null;
document.addEventListener('dragstart', (e) => {
  const r = e.target.closest && e.target.closest('.row');
  if (!r) return;
  dragId = r.dataset.id;
  r.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  try {
    e.dataTransfer.setData('text/plain', dragId);
  } catch (_) {}
});
document.addEventListener('dragend', () => {
  document.querySelectorAll('.dragging,.over').forEach((x) => x.classList.remove('dragging', 'over'));
  dragId = null;
});
['#keepList', '#dropList'].forEach((sel) => {
  const list = $(sel);
  list.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    list.classList.add('over');
  });
  list.addEventListener('dragleave', (e) => {
    if (!list.contains(e.relatedTarget)) list.classList.remove('over');
  });
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragId) return;
    list.classList.remove('over');
    move(dragId, list.dataset.lane, { animate: false });
  });
});
function setTab(v) {
  $('#lanes').dataset.view = v;
  $('#tabKeep').setAttribute('aria-selected', v === 'keep');
  $('#tabDrop').setAttribute('aria-selected', v === 'drop');
}
$('#tabKeep').addEventListener('click', () => setTab('keep'));
$('#tabDrop').addEventListener('click', () => setTab('drop'));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.runNames) runNames = changes.runNames.newValue || {};
  if (changes.run && changes.run.newValue && !$('#viewRun').hidden) {
    $('#runConfirm').hidden = true;
    $('#runPanel').hidden = false;
    renderRun(changes.run.newValue);
  }
});

/* ============ 시작 ============ */
(async function init() {
  // 아이콘을 다시 눌렀을 때 이 탭으로 돌아오도록 탭 번호를 남긴다
  chrome.tabs.getCurrent((t) => {
    if (t) chrome.storage.session.set({ appTabId: t.id });
  });
  const { run, runNames: names } = await chrome.storage.local.get(['run', 'runNames']);
  runNames = names || {};
  if (run && ['running', 'paused', 'stopped'].includes(run.status)) {
    showView('run');
    $('#runConfirm').hidden = true;
    $('#runPanel').hidden = false;
    renderRun(run);
    if (run.status === 'running') chrome.runtime.sendMessage({ type: 'run:kick' });
    return;
  }
  if (run && run.status === 'done') {
    showView('run');
    $('#runConfirm').hidden = true;
    $('#runPanel').hidden = false;
    renderRun(run);
    return;
  }
  showView('accounts');
  loadAccounts();
})();
