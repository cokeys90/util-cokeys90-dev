/* common.js — 앱 화면과 백그라운드가 같이 쓰는 도우미 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.floor(Math.random() * (b - a));

/* 탭이 다 열릴 때까지 기다림 */
function waitTabComplete(tabId, timeout = 20000) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpd);
      resolve(ok);
    };
    const onUpd = (id, info) => {
      if (id === tabId && info.status === 'complete') finish(true);
    };
    const timer = setTimeout(() => finish(false), timeout);
    chrome.tabs.onUpdated.addListener(onUpd);
    chrome.tabs.get(tabId).then((t) => {
      if (t && t.status === 'complete' && !t.pendingUrl) finish(true);
    }).catch(() => finish(false));
  });
}

/* 탭을 다른 주소로 이동하고 다 열릴 때까지 기다림 */
async function navigateTab(tabId, url, timeout = 20000) {
  const done = new Promise((resolve) => {
    let finished = false;
    let sawLoading = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpd);
      resolve(ok);
    };
    const onUpd = (id, info) => {
      if (id !== tabId) return;
      if (info.status === 'loading') sawLoading = true;
      if (info.status === 'complete' && sawLoading) finish(true);
    };
    const timer = setTimeout(() => finish(false), timeout);
    chrome.tabs.onUpdated.addListener(onUpd);
  });
  await chrome.tabs.update(tabId, { url });
  return done;
}

/* youtube.com 탭 안에서 inject.js 함수 실행 */
async function runInTab(tabId, func, args = []) {
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args });
  return r ? r.result : undefined;
}

/*
 * 데이터만 읽을 때 쓰는 임시 탭.
 * youtube.com 출처에서 요청해야 로그인 정보가 붙기 때문에 가장 가벼운 youtube.com 문서(robots.txt)를 잠깐 연다.
 */
async function withDataTab(fn) {
  const tab = await chrome.tabs.create({ url: 'https://www.youtube.com/robots.txt', active: false });
  try {
    await waitTabComplete(tab.id);
    return await fn(tab.id);
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

const acctKey = (a) => a.authuser + ':' + (a.pageId || '');

/* 확장 전용 격리 환경에서 실행 (chrome.runtime을 쓸 수 있음, 페이지 스크립트와 분리) */
async function runIsolated(tabId, func, args = []) {
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', func, args });
  return r ? r.result : undefined;
}
