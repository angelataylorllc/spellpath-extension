/* global chrome */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('popup.html'),
    active: true,
  });
});
