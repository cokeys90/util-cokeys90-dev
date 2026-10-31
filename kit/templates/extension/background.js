/* 아이콘을 누르면 앱 화면을 연다. 이미 열려 있으면 그 탭으로 이동 (tabs 권한 없이). */
const APP_URL = chrome.runtime.getURL('app.html');
chrome.action.onClicked.addListener(async () => {
  const { appTabId } = await chrome.storage.session.get('appTabId');
  if (appTabId) {
    try {
      const t = await chrome.tabs.get(appTabId);
      await chrome.tabs.update(t.id, { active: true });
      await chrome.windows.update(t.windowId, { focused: true });
      return;
    } catch (e) {}
  }
  await chrome.tabs.create({ url: APP_URL });
});
