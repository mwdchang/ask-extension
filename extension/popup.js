let tabURL = '';
function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

function spinnerOn() {
  document.getElementById('spinnerOverlay').style.display = 'flex';
}

function spinnerOff() {
  document.getElementById('spinnerOverlay').style.display = 'none';
}

async function sendRequest(type, text) {
  const response = await fetch(`http://localhost:3000/api/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      url: tabURL
    })
  });
  const data = await response.json();
  return data;
}

// Inject this function into the page and get the result
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  tabURL = tabs[0].url;
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: getSelectedText
    },
    (results) => {
      console.log(results);
      const text = results[0]?.result || 'No text selected.';
      // document.getElementById('selectedText').textContent = text;
      document.getElementById('input').value = text;
    }
  );
});

document.getElementById('chat').addEventListener('click', async () => {
  let prompt = document.getElementById('input').value;
  spinnerOn();
  const data = await sendRequest('chat', prompt);
  const responseField = document.getElementById('response');
  responseField.innerHTML = marked.parse(data);
  spinnerOff();
});

document.getElementById('explain').addEventListener('click', async () => {
  let prompt = document.getElementById('input').value;
  spinnerOn();
  const data = await sendRequest('explain', prompt);
  const responseField = document.getElementById('response');
  responseField.innerHTML = marked.parse(data);
  spinnerOff();
});
