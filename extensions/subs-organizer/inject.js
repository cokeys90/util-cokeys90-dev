/*
 * inject.js
 * youtube.com 페이지 안에서 chrome.scripting.executeScript(world: 'MAIN')로 실행되는 함수들.
 * executeScript는 함수 본문만 넘기므로 각 함수는 바깥 변수에 의존하지 않고 혼자 완결되어야 한다.
 * AI나 외부 서버 없이, YouTube 웹이 자체적으로 쓰는 데이터만 읽는다.
 */

/* 이 브라우저에 로그인된 계정 목록 (계정 전환 메뉴 데이터) */
async function ytAccounts() {
  const res = await fetch('/getAccountSwitcherEndpoint', { credentials: 'include' });
  if (!res.ok) return { error: 'http_' + res.status };
  let json;
  try {
    json = JSON.parse((await res.text()).replace(/^\)\]\}'\s*/, ''));
  } catch (e) {
    return { error: 'parse' };
  }
  const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
  const txt = (v) => (v ? (v.simpleText != null ? v.simpleText : (v.runs || []).map((r) => r.text).join('')) : '');
  const out = [];
  const seen = new Set();
  const walk = (o, email) => {
    if (!o || typeof o !== 'object') return;
    if (o.header && typeof o.header === 'object') {
      const m = JSON.stringify(o.header).match(EMAIL);
      if (m) email = m[0];
    }
    if (o.accountItem) {
      const a = o.accountItem;
      const ep = JSON.stringify(a.serviceEndpoint || {});
      const au = ep.match(/authuser[=":]+(\d+)/i);
      const pg = ep.match(/pageId[=":]+(\d+)/i);
      const photos = (a.accountPhoto && a.accountPhoto.thumbnails) || [];
      const item = {
        name: txt(a.accountName),
        byline: txt(a.accountByline),
        handle: txt(a.channelHandle),
        photo: photos.length ? photos[photos.length - 1].url : '',
        selected: !!a.isSelected,
        disabled: !!a.isDisabled,
        hasChannel: !!a.hasChannel,
        authuser: au ? Number(au[1]) : null,
        pageId: pg ? pg[1] : null,
        email: email || ''
      };
      const key = item.authuser + ':' + item.pageId + ':' + item.name;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
    for (const k in o) if (k !== 'header') walk(o[k], email);
  };
  walk(json, '');
  return { accounts: out };
}

/* 계정 번호(authuser) 하나의 구독 채널 전체 목록 */
async function ytSubs(authuser, pageId) {
  const q = 'authuser=' + encodeURIComponent(authuser) + (pageId ? '&pageId=' + encodeURIComponent(pageId) : '');
  const res = await fetch('/feed/channels?' + q, { credentials: 'include' });
  if (!res.ok) return { error: 'http_' + res.status };
  const html = await res.text();
  const pick = (re) => (html.match(re) || [])[1];
  if (pick(/"LOGGED_IN":(true|false)/) !== 'true') return { error: 'not_logged_in' };
  const sess = pick(/"SESSION_INDEX":"?(\d+)"?/);
  if (sess != null && String(sess) !== String(authuser)) return { error: 'account_mismatch', got: sess };
  const m = html.match(/var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return { error: 'no_data' };
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch (e) {
    return { error: 'parse' };
  }

  const txt = (v) => (v ? (v.simpleText != null ? v.simpleText : (v.runs || []).map((r) => r.text).join('')) : '');
  const list = [];
  const ids = new Set();
  let token = null;
  const collect = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.channelRenderer) {
      const c = o.channelRenderer;
      if (c.channelId && !ids.has(c.channelId)) {
        ids.add(c.channelId);
        const a = txt(c.subscriberCountText);
        const b = txt(c.videoCountText);
        const th = (c.thumbnail && c.thumbnail.thumbnails) || [];
        let thumb = th.length ? th[th.length - 1].url : '';
        if (thumb.startsWith('//')) thumb = 'https:' + thumb;
        list.push({
          id: c.channelId,
          name: txt(c.title),
          handle: [a, b].find((s) => s && s.startsWith('@')) || '',
          subs: [a, b].find((s) => s && !s.startsWith('@')) || '',
          thumb
        });
      }
      return;
    }
    if (o.continuationItemRenderer) {
      const ce = o.continuationItemRenderer.continuationEndpoint;
      const t = ce && ce.continuationCommand && ce.continuationCommand.token;
      if (t) token = t;
      return;
    }
    for (const k in o) collect(o[k]);
  };
  collect(data);

  // 구독이 아주 많은 계정은 다음 묶음으로 나뉘어 올 수 있다. YouTube 웹이 스크롤할 때 쓰는 요청을 그대로 이어서 호출.
  // 로그인 쿠키는 같은 출처 요청이라 브라우저가 알아서 붙인다. 확장은 쿠키나 인증 값을 직접 읽지 않는다.
  // 이어받기에 실패하면 partial로 표시해 화면에서 '일부'라고 알린다.
  let partial = false;
  let pages = 0;
  if (token) {
    const key = pick(/"INNERTUBE_API_KEY":"([^"]+)"/);
    const ver = pick(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || '2.20260101.00.00';
    const hl = pick(/"HL":"([^"]+)"/) || 'ko';
    const gl = pick(/"GL":"([^"]+)"/) || 'KR';
    while (token && pages < 200) {
      const cur = token;
      token = null;
      pages++;
      try {
        const headers = {
          'Content-Type': 'application/json',
          'X-Goog-AuthUser': String(authuser),
          'X-Origin': location.origin,
          'X-Youtube-Client-Name': '1',
          'X-Youtube-Client-Version': ver
        };
        if (pageId) headers['X-Goog-PageId'] = String(pageId);
        const r = await fetch('/youtubei/v1/browse?prettyPrint=false' + (key ? '&key=' + key : ''), {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: ver, hl, gl } }, continuation: cur })
        });
        if (!r.ok) {
          partial = true;
          break;
        }
        const before = list.length;
        collect(await r.json());
        if (list.length === before && !token) break;
      } catch (e) {
        partial = true;
        break;
      }
    }
  }
  return { channels: list, partial, pages };
}

/*
 * 실행 단계에서 채널 페이지(또는 구독 채널 목록 페이지)를 한 번씩 확인하거나 누르는 함수.
 * 기다리는 동작은 넣지 않는다. 백그라운드 탭에서는 페이지 타이머가 느려지므로 기다림은 확장 쪽에서 한다.
 *   action: 'probe' | 'clickButton' | 'clickMenuUnsub' | 'clickDialogConfirm' | 'scrollList'
 *   mode:   'channel' (채널 페이지) | 'list' (구독 채널 목록 페이지)
 */
function ytPage(action, mode, channelId) {
  const SUB = /구독중|Subscribed|登録済み|Abonniert|Abonné|Suscrito|Inscrito|Iscritto/i;
  const SUB_PLAIN = /^(구독|Subscribe|チャンネル登録|Abonnieren|S'abonner|Suscribirse|Inscrever-se|Iscriviti)$/i;
  const UNSUB = /구독\s*취소|Unsubscribe|登録解除|Abo beenden|Se désabonner|Anular suscripción|Cancelar inscrição|Annulla iscrizione/i;
  const visible = (el) => !!el && !!(el.offsetParent || el.getClientRects().length);
  const label = (b) => ((b && (b.innerText || b.textContent)) || '').trim();
  const isSub = (b) => {
    const t = label(b);
    if (SUB.test(t)) return true;
    if (SUB_PLAIN.test(t)) return false;
    return /Tonal/.test(String(b.className || ''));
  };
  const rows = () => Array.from(document.querySelectorAll('ytd-channel-renderer'));
  const rowOf = () =>
    rows().find((e) => {
      const d = e.data || (e.__data && e.__data.data);
      return d && d.channelId === channelId;
    });
  const findBtn = () => {
    if (mode === 'list') {
      const row = rowOf();
      if (!row) return null;
      const bs = Array.from(row.querySelectorAll('button'));
      return bs.find((b) => SUB.test(label(b)) || SUB_PLAIN.test(label(b))) || null;
    }
    return document.querySelector(
      'yt-page-header-renderer yt-subscribe-button-view-model button,' +
        '#page-header yt-subscribe-button-view-model button,' +
        '#channel-header ytd-subscribe-button-renderer button,' +
        'ytd-c4-tabbed-header-renderer ytd-subscribe-button-renderer button'
    );
  };
  const menuItem = () =>
    Array.from(
      document.querySelectorAll(
        'tp-yt-iron-dropdown yt-list-item-view-model, yt-sheet-view-model yt-list-item-view-model,' +
          'ytd-menu-popup-renderer tp-yt-paper-item, ytd-menu-service-item-renderer, yt-list-item-view-model'
      )
    ).find((e) => visible(e) && UNSUB.test(label(e)));
  const dialog = () =>
    Array.from(document.querySelectorAll('yt-confirm-dialog-renderer, tp-yt-paper-dialog, yt-dialog-view-model')).find(visible);

  if (action === 'probe') {
    const cfg = window.ytcfg && window.ytcfg.get ? window.ytcfg : null;
    let ext = null;
    try {
      ext = (window.ytInitialData && window.ytInitialData.metadata && window.ytInitialData.metadata.channelMetadataRenderer &&
        window.ytInitialData.metadata.channelMetadataRenderer.externalId) || null;
    } catch (e) {}
    // 버튼이 막 그려진 순간에는 글자가 비어 있어서 상태를 잘못 읽을 수 있다. 글자가 채워진 뒤에만 버튼으로 본다.
    const raw = findBtn();
    const btn = raw && label(raw) ? raw : null;
    return {
      ready: document.readyState === 'complete' && !!cfg,
      sess: cfg ? String(cfg.get('SESSION_INDEX') == null ? '' : cfg.get('SESSION_INDEX')) : '',
      logged: cfg ? cfg.get('LOGGED_IN') : null,
      ext,
      hasBtn: !!btn,
      subscribed: btn ? isSub(btn) : null,
      rowCount: mode === 'list' ? rows().length : 0,
      rowFound: mode === 'list' ? !!rowOf() : null
    };
  }
  if (action === 'clickButton') {
    const b = findBtn();
    if (!b) return { clicked: false };
    b.click();
    return { clicked: true };
  }
  if (action === 'clickMenuUnsub') {
    if (dialog()) return { dialog: true };
    const it = menuItem();
    if (!it) return { clicked: false };
    it.click();
    return { clicked: true };
  }
  if (action === 'clickDialogConfirm') {
    const d = dialog();
    if (!d) return { clicked: false };
    const btn = Array.from(d.querySelectorAll('button')).find((b) => UNSUB.test(label(b)));
    if (!btn) return { clicked: false };
    btn.click();
    return { clicked: true };
  }
  if (action === 'scrollList') {
    window.scrollTo(0, document.documentElement.scrollHeight);
    return { rowCount: rows().length };
  }
  return { error: 'unknown_action' };
}

/*
 * 작업 창 안내 띠 (격리된 실행 환경 ISOLATED에서 실행)
 * - 창 아래쪽에 "구독 채널 정리함이 작업 중" 안내와 진행 상황, 일시정지 / 정리함 보기 버튼
 * - 창 제목과 아이콘을 바꿔서 작업 표시줄에서도 무슨 창인지 알 수 있게
 * YouTube 화면 스타일과 섞이지 않도록 Shadow DOM 안에 만들고, innerHTML은 쓰지 않는다.
 *   info: { mode: 'running'|'paused'|'verify'|'done', done, total, verb, name, closedHint }
 */
function ytBanner(info, iconData) {
  const ID = '__subs_organizer_banner';
  const send = (type) => {
    try {
      chrome.runtime.sendMessage({ type, from: 'banner' });
    } catch (e) {}
  };
  let host = document.getElementById(ID);
  if (!host) {
    host = document.createElement('div');
    host.id = ID;
    host.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      .bar{font:13px/1.45 "Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;
        background:#2a1f52;color:#fff;box-shadow:0 -4px 18px rgba(0,0,0,.25);padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px}
      .row{display:flex;align-items:center;gap:10px}
      .icon{width:28px;height:28px;border-radius:7px;flex:none}
      .txt{min-width:0;flex:1;display:flex;flex-direction:column}
      .t{font-weight:700;font-size:14px}
      .s{opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .h{opacity:.7;font-size:12px}
      .btns{display:flex;gap:6px;flex:none}
      button{font:inherit;font-weight:600;border-radius:8px;padding:6px 10px;cursor:pointer;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff}
      button.main{background:#fff;color:#2a1f52;border-color:#fff}
      button[hidden]{display:none}
      .prog{height:4px;border-radius:4px;background:rgba(255,255,255,.2);overflow:hidden}
      .fill{height:100%;background:#a98ef0;width:0;transition:width .4s}
    `);
    root.adoptedStyleSheets = [sheet];
    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    const bar = el('div', 'bar');
    const row = el('div', 'row');
    const icon = el('img', 'icon');
    icon.alt = '';
    const txt = el('div', 'txt');
    txt.append(el('span', 't'), el('span', 's'), el('span', 'h'));
    const btns = el('div', 'btns');
    const b1 = el('button', 'main');
    const b2 = el('button', '', '정리함 보기');
    b1.type = b2.type = 'button';
    b1.addEventListener('click', () => send(b1.dataset.msg));
    b2.addEventListener('click', () => send('app:focus'));
    btns.append(b1, b2);
    row.append(icon, txt, btns);
    const prog = el('div', 'prog');
    prog.append(el('div', 'fill'));
    bar.append(row, prog);
    root.append(bar);
    (document.body || document.documentElement).appendChild(host);
  }
  const root = host.shadowRoot;
  const $ = (s) => root.querySelector(s);
  if (iconData) $('.icon').src = iconData;
  const pct = info.total ? Math.round((info.done / info.total) * 100) : 0;
  $('.fill').style.width = (info.mode === 'done' || info.mode === 'verify' ? 100 : pct) + '%';
  const b1 = $('button.main');
  let title;
  if (info.mode === 'paused') {
    $('.t').textContent = '일시정지했어요';
    $('.s').textContent = `${info.done} / ${info.total} 처리됨`;
    $('.h').textContent = info.closedHint || '계속을 누르면 이어서 진행해요. 이 창은 그대로 두세요.';
    b1.textContent = '계속';
    b1.dataset.msg = 'run:resume';
    b1.hidden = false;
    title = `[일시정지 ${info.done}/${info.total}] 구독 채널 정리함`;
  } else if (info.mode === 'verify') {
    $('.t').textContent = '다 처리했어요. 결과를 확인하는 중이에요';
    $('.s').textContent = `${info.total}개 처리 완료`;
    $('.h').textContent = '확인이 끝나면 이 창은 자동으로 닫혀요.';
    b1.hidden = true;
    title = '[결과 확인 중] 구독 채널 정리함';
  } else if (info.mode === 'done') {
    $('.t').textContent = '완료했어요';
    $('.s').textContent = '결과는 정리함에서 볼 수 있어요.';
    $('.h').textContent = '이 창은 곧 자동으로 닫혀요.';
    b1.hidden = true;
    title = '[완료] 구독 채널 정리함';
  } else {
    $('.t').textContent = '구독 채널 정리함이 이 창에서 작업 중이에요';
    $('.s').textContent = `${info.done} / ${info.total}${info.name ? ' · ' + info.verb + ': ' + info.name : ''}`;
    $('.h').textContent = '끝나면 이 창은 자동으로 닫혀요. 그전에는 닫거나 최소화하지 마세요.';
    b1.textContent = '일시정지';
    b1.dataset.msg = 'run:pause';
    b1.hidden = false;
    title = `[${info.done}/${info.total}] 구독 정리 중 · 이 창을 닫지 마세요`;
  }

  // 창 제목과 아이콘: YouTube가 다시 바꿔도 유지되도록 감시
  window.__subsOrgTitle = title;
  window.__subsOrgIcon = iconData || window.__subsOrgIcon;
  const apply = () => {
    if (document.title !== window.__subsOrgTitle) document.title = window.__subsOrgTitle;
    const icon = window.__subsOrgIcon;
    if (icon && document.head) {
      const links = document.head.querySelectorAll('link[rel~="icon"]');
      const last = links[links.length - 1];
      if (!last || last.dataset.subsOrg !== '1') {
        let mine = document.head.querySelector('link[data-subs-org="1"]');
        if (!mine) {
          mine = document.createElement('link');
          mine.rel = 'icon';
          mine.dataset.subsOrg = '1';
          mine.href = icon;
        }
        document.head.appendChild(mine);
      }
    }
  };
  apply();
  if (!window.__subsOrgObs) {
    window.__subsOrgObs = new MutationObserver(apply);
    window.__subsOrgObs.observe(document.head || document.documentElement, { subtree: true, childList: true, characterData: true });
  }
  return true;
}
