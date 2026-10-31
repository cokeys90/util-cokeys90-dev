/* background.js — 아이콘 클릭 처리, 구독/구독 취소 실행 큐, 실행 로그 */
importScripts('common.js', 'inject.js');

const APP_URL = chrome.runtime.getURL('app.html');
const LOG_MAX = 4000;

/*
 * 정리함 탭이 이미 열려 있으면 그 탭으로 이동한다.
 * tabs 권한 없이 하기 위해, 정리함 화면이 열릴 때 자기 탭 번호를 storage.session에 남긴다 (app.js 참고).
 */
chrome.action.onClicked.addListener(() => focusApp());

async function focusApp() {
  const { appTabId } = await chrome.storage.session.get('appTabId');
  if (appTabId) {
    try {
      const t = await chrome.tabs.get(appTabId);
      await chrome.tabs.update(t.id, { active: true });
      await chrome.windows.update(t.windowId, { focused: true });
      return;
    } catch (e) {
      /* 이미 닫힌 탭 */
    }
  }
  await chrome.tabs.create({ url: APP_URL });
}
async function focusRunWindow() {
  const { runWindowId } = await chrome.storage.session.get('runWindowId');
  if (!runWindowId) return;
  try {
    await chrome.windows.update(runWindowId, { focused: true, state: 'normal' });
  } catch (e) {}
}

/* ---------- 실행 상태 저장 ----------
 * 실행 루프, 버튼 메시지, 로그가 동시에 상태를 고쳐 쓰면 서로 덮어쓸 수 있어서
 * 모든 변경을 한 줄로 세워(mutateRun) 순서대로 처리한다.
 */
async function getRun() {
  const { run } = await chrome.storage.local.get('run');
  return run || null;
}
let runLock = Promise.resolve();
function mutateRun(fn) {
  const p = runLock.then(async () => {
    const run = await getRun();
    if (!run) return null;
    await fn(run);
    if (run.log && run.log.length > LOG_MAX) run.log.splice(1, run.log.length - LOG_MAX);
    await chrome.storage.local.set({ run });
    return run;
  });
  runLock = p.catch(() => {});
  return p;
}
function log(lv, msg) {
  return mutateRun((run) => {
    (run.log = run.log || []).push([Date.now(), lv, msg]);
  });
}
const secs = (ms) => (ms / 1000).toFixed(1) + 's';
function duration(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (h ? h + '시간 ' : '') + (h || m ? m + '분 ' : '') + (s % 60) + '초';
}
const targetLabel = (t) => `${t.name}${t.email ? ' (' + t.email + ')' : ''}, ${t.authuser}번`;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg && msg.type) {
      case 'run:start': {
        const subN = msg.ops.filter((o) => o.op === 'sub').length;
        const run = {
          status: 'running',
          phase: 'ops',
          target: msg.target,
          desired: msg.desired,
          ops: msg.ops.map((o) => ({ ...o, st: 'pending', code: '' })),
          current: -1,
          startedAt: Date.now(),
          finishedAt: null,
          verify: null,
          log: [[Date.now(), 'RUN', `${msg.retry ? '남은 것 다시 시도' : '시작'} · 대상: ${targetLabel(msg.target)} · 구독 ${subN} · 구독 취소 ${msg.ops.length - subN} · 끝난 뒤 목표 ${msg.desired.length}개`]]
        };
        await runLock;
        await chrome.storage.local.set({ run });
        kick();
        return { ok: true };
      }
      case 'run:pause':
        await mutateRun((r) => {
          r.status = 'paused';
          r.pauseReason = 'user';
          r.log.push([Date.now(), 'PAUSE', msg.from === 'banner' ? '작업 창에서 일시정지' : '정리함에서 일시정지']);
        });
        refreshBanner();
        return { ok: true };
      case 'run:resume':
        await mutateRun((r) => {
          r.status = 'running';
          r.pauseReason = null;
          r.log.push([Date.now(), 'RUN', '이어서 진행']);
        });
        refreshBanner();
        kick();
        return { ok: true };
      case 'run:stop': {
        await mutateRun((r) => {
          r.status = 'stopped';
          r.finishedAt = Date.now();
          const left = r.ops.filter((o) => o.st === 'pending' || o.st === 'working').length;
          r.log.push([Date.now(), 'STOP', `사용자가 중지 · 남은 작업 ${left}개는 처리하지 않음`]);
        });
        const { runWindowId } = await chrome.storage.session.get('runWindowId');
        await chrome.storage.session.remove(['runWindowId', 'runTabId']);
        if (runWindowId) chrome.windows.remove(runWindowId).catch(() => {});
        return { ok: true };
      }
      case 'run:focusWindow':
        await focusRunWindow();
        return { ok: true };
      case 'app:focus':
        await focusApp();
        return { ok: true };
      case 'run:clear':
        await runLock;
        await chrome.storage.local.remove('run');
        return { ok: true };
      case 'run:kick':
        kick();
        return { ok: true };
      default:
        return { ok: false };
    }
  })().then(sendResponse);
  return true;
});

/* 작업 창을 사용자가 닫으면 자동으로 일시정지 (다음 채널에서 새 창이 갑자기 뜨지 않게) */
chrome.windows.onRemoved.addListener(async (winId) => {
  const { runWindowId } = await chrome.storage.session.get('runWindowId');
  if (winId !== runWindowId) return;
  await chrome.storage.session.remove(['runWindowId', 'runTabId']);
  await mutateRun((r) => {
    if (r.status === 'running' && r.phase !== 'verify') {
      r.status = 'paused';
      r.pauseReason = 'window_closed';
      r.log.push([Date.now(), 'PAUSE', '작업 창이 닫혀서 자동 일시정지 · 계속을 누르면 새 창을 열고 이어서 진행']);
    }
  });
});

/* 서비스 워커가 다시 깨어났을 때 진행 중이던 작업 이어가기 */
getRun().then((run) => {
  if (run && run.status === 'running') kick();
});

/* ---------- 작업 창 안내 띠 ---------- */
let iconDataCache = null;
async function iconData() {
  if (iconDataCache) return iconDataCache;
  try {
    const buf = new Uint8Array(await (await fetch(chrome.runtime.getURL('icons/icon32.png'))).arrayBuffer());
    let bin = '';
    buf.forEach((b) => (bin += String.fromCharCode(b)));
    iconDataCache = 'data:image/png;base64,' + btoa(bin);
  } catch (e) {
    iconDataCache = '';
  }
  return iconDataCache;
}
function bannerInfo(run, override) {
  const total = run.ops.length;
  const done = run.ops.filter((o) => o.st === 'ok' || o.st === 'fail').length;
  const cur = run.ops[run.current];
  const mode = override || (run.status === 'paused' ? 'paused' : run.phase === 'verify' ? 'verify' : run.status === 'done' ? 'done' : 'running');
  return {
    mode,
    done,
    total,
    verb: cur && cur.op === 'unsub' ? '구독 취소하는 중' : '구독하는 중',
    name: cur && cur.st === 'working' ? cur.name : '',
    closedHint: ''
  };
}
async function refreshBanner(override) {
  const { runTabId } = await chrome.storage.session.get('runTabId');
  if (!runTabId) return;
  const run = await getRun();
  if (!run) return;
  try {
    await runIsolated(runTabId, ytBanner, [bannerInfo(run, override), await iconData()]);
  } catch (e) {
    /* 페이지 이동 중이면 다음 기회에 */
  }
}

/* ---------- 작업용 창 ---------- */
async function ensureRunTab() {
  const { runTabId } = await chrome.storage.session.get('runTabId');
  if (runTabId) {
    try {
      const t = await chrome.tabs.get(runTabId);
      if (t) {
        const w = await chrome.windows.get(t.windowId);
        if (w.state === 'minimized') await chrome.windows.update(w.id, { state: 'normal' });
        return runTabId;
      }
    } catch (e) {}
  }
  // 화면에 보이는 작은 창에서 진행한다. 숨겨진 탭에서는 YouTube가 버튼을 그리지 않을 수 있다.
  // 지금 쓰는 브라우저 창의 오른쪽 위에 붙여서 연다.
  const pos = {};
  try {
    const w = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
    if (w && w.width) {
      pos.left = Math.max(0, w.left + w.width - 540);
      pos.top = Math.max(0, w.top + 80);
    }
  } catch (e) {}
  const win = await chrome.windows.create({
    url: 'https://www.youtube.com/',
    type: 'popup',
    width: 520,
    height: 780,
    focused: false,
    ...pos
  });
  const id = win.tabs[0].id;
  await chrome.storage.session.set({ runTabId: id, runWindowId: win.id });
  await log('INFO', '작업 창을 열었어요');
  await waitTabComplete(id);
  return id;
}

/* ---------- 페이지를 반복 확인하며 기다리기 (기다림은 확장 쪽에서) ---------- */
async function waitPage(tabId, action, mode, channelId, pred, timeout = 8000, interval = 350) {
  const end = Date.now() + timeout;
  let last = null;
  while (Date.now() < end) {
    try {
      last = await runInTab(tabId, ytPage, [action, mode, channelId]);
      if (pred(last)) return last;
    } catch (e) {
      /* 페이지 이동 중이면 잠시 후 다시 */
    }
    await sleep(interval);
  }
  return null;
}

const ok = (code, msg) => ({ ok: true, code, msg });
const fail = (code, msg) => ({ ok: false, code, msg });

async function toggle(tabId, mode, op, probe) {
  const want = op.op === 'sub';
  if (probe.subscribed === want) return ok('already', want ? '이미 구독되어 있어서 건너뜀' : '이미 구독 취소되어 있어서 건너뜀');
  await runInTab(tabId, ytPage, ['clickButton', mode, op.id]);
  if (want) {
    await log('', '구독 버튼 누름');
    const r = await waitPage(tabId, 'probe', mode, op.id, (p) => p && p.subscribed === true, 7000);
    return r ? ok('done', '구독됨') : fail('not_confirmed', '버튼을 눌렀지만 7초 안에 구독중으로 바뀌지 않음');
  }
  await log('', '구독중 버튼 누름 → 메뉴 여는 중');
  const m = await waitPage(tabId, 'clickMenuUnsub', mode, op.id, (r) => r && (r.clicked || r.dialog), 5000);
  if (!m) return fail('no_menu', '구독 취소 메뉴가 나타나지 않음');
  await log('', m.dialog ? '확인 창이 바로 열림' : '메뉴에서 구독 취소 선택');
  const d = await waitPage(tabId, 'clickDialogConfirm', mode, op.id, (r) => r && r.clicked, 5000);
  if (d) await log('', '확인 창에서 구독 취소 누름');
  const r = await waitPage(tabId, 'probe', mode, op.id, (p) => p && p.subscribed === false, 7000);
  return r ? ok('done', '구독 취소됨') : fail('not_confirmed', '구독 취소를 눌렀지만 7초 안에 반영이 확인되지 않음');
}

function targetQuery(target) {
  return 'authuser=' + target.authuser + (target.pageId ? '&pageId=' + target.pageId : '');
}

/* 채널 페이지에 구독 버튼이 없는 경우(지역 제한 등) 구독 채널 목록 화면에서 취소 */
async function unsubViaList(tabId, target, op) {
  await navigateTab(tabId, 'https://www.youtube.com/feed/channels?' + targetQuery(target));
  refreshBanner();
  let p = await waitPage(tabId, 'probe', 'list', op.id, (x) => x && x.ready && x.rowCount > 0, 12000);
  if (!p) return fail('page_timeout', '구독 채널 목록 화면이 12초 안에 열리지 않음');
  if (String(p.sess) !== String(target.authuser)) return fail('account_mismatch', `목록 화면이 ${p.sess}번 계정으로 열림 (기대: ${target.authuser}번)`);
  let lastCount = -1;
  for (let i = 0; i < 40 && !p.rowFound; i++) {
    if (p.rowCount === lastCount && i > 2) break;
    lastCount = p.rowCount;
    await runInTab(tabId, ytPage, ['scrollList', 'list', op.id]);
    await sleep(900);
    p = (await runInTab(tabId, ytPage, ['probe', 'list', op.id])) || p;
  }
  if (!p.rowFound) return ok('already', `구독 목록 ${p.rowCount}개 중에 없음 → 이미 구독 취소된 상태`);
  await log('', `구독 목록에서 채널 찾음 (${p.rowCount}개 중)`);
  if (!p.hasBtn) return fail('no_button', '목록에서도 구독 버튼을 찾지 못함');
  return toggle(tabId, 'list', op, p);
}

async function doOp(target, op) {
  const tabId = await ensureRunTab();
  const t0 = Date.now();
  await navigateTab(tabId, 'https://www.youtube.com/channel/' + op.id + '?' + targetQuery(target));
  refreshBanner();
  let p = await waitPage(tabId, 'probe', 'channel', op.id, (x) => x && x.ready && x.hasBtn, 10000);
  if (!p) p = await runInTab(tabId, ytPage, ['probe', 'channel', op.id]).catch(() => null);
  if (!p || !p.ready) return fail('page_timeout', '채널 페이지가 10초 안에 열리지 않음');
  if (p.logged === false) return fail('not_logged_in', 'YouTube 로그인이 풀려 있음');
  // 가장 중요한 안전장치: 이 페이지가 남길 계정으로 열렸는지 매번 확인
  if (String(p.sess) !== String(target.authuser)) return fail('account_mismatch', `페이지가 ${p.sess}번 계정으로 열림 (기대: ${target.authuser}번 ${target.name}) → 건너뜀`);
  if (p.ext && p.ext !== op.id) return fail('channel_mismatch', `다른 채널(${p.ext})로 열림 → 건너뜀`);
  const state = p.hasBtn ? (p.subscribed ? '현재 구독중' : '현재 미구독') : '구독 버튼 없음';
  await log('', `채널 페이지 열림 ${secs(Date.now() - t0)} · 계정 확인 ${target.authuser}번 ${target.name} OK · ${state}`);
  if (!p.hasBtn) {
    if (op.op !== 'unsub') return fail('no_button', '채널 페이지에 구독 버튼이 없음 (지역 제한이나 삭제된 채널일 수 있음)');
    await log('WARN', '채널 페이지에 구독 버튼 없음 → 구독 채널 목록 화면에서 취소 시도');
    return unsubViaList(tabId, target, op);
  }
  return toggle(tabId, 'channel', op, p);
}

/* ---------- 실행 루프 ---------- */
let looping = false;
function kick() {
  if (!looping) loop();
}

async function loop() {
  looping = true;
  try {
    let processed = 0;
    while (true) {
      const run = await getRun();
      if (!run || run.status !== 'running') break;
      if (run.phase === 'verify' || run.ops.every((o) => o.st !== 'pending' && o.st !== 'working')) {
        await verify();
        break;
      }
      const i = run.ops.findIndex((o) => o.st === 'working' || o.st === 'pending');
      const op = run.ops[i];
      const total = run.ops.length;
      await mutateRun((r) => {
        r.ops[i].st = 'working';
        r.ops[i].startedAt = Date.now();
        r.current = i;
        r.log.push([Date.now(), op.op === 'sub' ? 'SUB' : 'UNSUB', `(${i + 1}/${total}) ${op.name} · ${op.id}`]);
        if (op.note) r.log.push([Date.now(), '', op.note]);
      });

      const t0 = Date.now();
      let res;
      try {
        res = await doOp(run.target, op);
      } catch (e) {
        res = fail('error', '오류: ' + (e && e.message ? e.message : String(e)));
      }

      const after = await mutateRun((r) => {
        if (!res.ok && r.status === 'paused' && r.pauseReason === 'window_closed') {
          // 작업 창이 닫혀서 실패한 것이므로 다시 할 일로 돌려놓는다
          r.ops[i].st = 'pending';
          r.ops[i].code = '';
          r.log.push([Date.now(), 'WARN', '작업 창이 닫혀 중단됨 → 이어서 할 때 이 채널부터 다시 처리']);
          return;
        }
        r.ops[i].st = res.ok ? 'ok' : 'fail';
        r.ops[i].code = res.code;
        r.ops[i].endedAt = Date.now();
        r.log.push([Date.now(), res.ok ? (res.code === 'already' ? 'SKIP' : 'OK') : 'FAIL', `${res.msg || res.code} (${secs(Date.now() - t0)})`]);
      });
      processed++;
      if (!after || after.status !== 'running') break;

      // 너무 빠르게 누르면 YouTube가 막을 수 있어 간격을 둔다
      if (processed % 40 === 0) {
        await log('INFO', '40개 처리 · YouTube 제한을 피하려고 15초 쉬어요');
        await sleep(15000);
      } else {
        await sleep(rand(2500, 4500));
      }
    }
  } finally {
    looping = false;
  }
}

/* 끝나면 남길 계정의 구독 목록을 다시 받아 목표와 비교 */
async function verify() {
  const run = await mutateRun((r) => {
    r.phase = 'verify';
    r.log.push([Date.now(), 'VERIFY', `${r.target.name} 계정의 구독 목록을 다시 받아 목표와 비교하는 중`]);
  });
  if (!run) return;
  await refreshBanner('verify');
  let result;
  try {
    const r = await withDataTab((tabId) => runInTab(tabId, ytSubs, [run.target.authuser, run.target.pageId || null]));
    if (!r || r.error) {
      result = { error: (r && r.error) || 'unknown' };
    } else {
      const now = new Set(r.channels.map((c) => c.id));
      const want = new Set(run.desired);
      result = {
        total: now.size,
        missing: [...want].filter((id) => !now.has(id)),
        extra: [...now].filter((id) => !want.has(id)),
        partial: !!r.partial
      };
    }
  } catch (e) {
    result = { error: String(e) };
  }
  await mutateRun((r) => {
    r.verify = result;
    r.phase = 'done';
    r.status = 'done';
    r.finishedAt = Date.now();
    const okN = r.ops.filter((o) => o.st === 'ok').length;
    const failN = r.ops.filter((o) => o.st === 'fail').length;
    const took = duration(r.finishedAt - r.startedAt);
    if (result.error) {
      r.log.push([Date.now(), 'FAIL', `결과 확인 실패 (${result.error}) · 성공 ${okN} · 실패 ${failN} · 걸린 시간 ${took}`]);
    } else if (!result.missing.length && !result.extra.length) {
      r.log.push([Date.now(), 'DONE', `목표와 일치 · 지금 구독 ${result.total}개 · 성공 ${okN} · 실패 ${failN} · 걸린 시간 ${took}`]);
    } else {
      r.log.push([Date.now(), 'DONE', `목표와 다른 채널 ${result.missing.length + result.extra.length}개 남음 (구독 안 됨 ${result.missing.length}, 취소 안 됨 ${result.extra.length}) · 성공 ${okN} · 실패 ${failN} · 걸린 시간 ${took}`]);
    }
  });
  // 작업 창에 완료를 잠깐 보여준 뒤 닫는다. 닫힘 감지가 일시정지로 오해하지 않도록 먼저 기록을 지운다.
  await refreshBanner('done');
  const { runWindowId } = await chrome.storage.session.get('runWindowId');
  await chrome.storage.session.remove(['runWindowId', 'runTabId']);
  if (runWindowId) {
    await sleep(2000);
    chrome.windows.remove(runWindowId).catch(() => {});
  }
  focusApp();
}
