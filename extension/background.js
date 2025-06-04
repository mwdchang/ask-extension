let lastSelectedText = "";

chrome.action.onClicked.addListener((tab) => {
  const currentUrl = tab.url
  chrome.tabs.create({
    url: chrome.runtime.getURL(`popup.html?fromTab=${tab.id}&fromUrl=${encodeURIComponent(currentUrl)}`)
  });
});


// Create a context menu (right-click)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "open-extension",
    title: "Open With Ask-Extension",
    contexts: ["selection"]
  });
});

function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

// When opening the extention through the context menu
// - capture the raw selected text, if any
// - this is stored in lastSelectedText
// - lastSelectedText is send via messaging to the poup.js context
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-extension" && info.selectionText) {
    const currentUrl = tab.url

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabURL = tabs[0].url;
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: getSelectedText
        },
        (results) => {
          const text = results[0]?.result || undefined;
          lastSelectedText = text;
          
          chrome.tabs.create({
            url: chrome.runtime.getURL(`popup.html?fromUrl=${encodeURIComponent(currentUrl)}`)
          });
        }
      );
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getSelectedText") {
    sendResponse({ text: lastSelectedText });
  }
});
