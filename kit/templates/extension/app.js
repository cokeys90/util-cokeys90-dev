/* MV3에서는 인라인 스크립트와 onclick 속성이 실행되지 않으므로 모든 코드는 이 파일에 둔다. */
chrome.tabs.getCurrent((t) => {
  if (t) chrome.storage.session.set({ appTabId: t.id });
});
document.getElementById('clearData').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  document.querySelector('.sub').textContent = '저장된 데이터를 지웠어요.';
});
