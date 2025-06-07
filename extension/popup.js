// TODO
// - clear history
// - selective history
//

function shorten(text, len) {
  if (!len) len = 150
  if (text.length > len) {
    return text.slice(0, len-3) + '...';
  }
  return text;
}

const params = new URLSearchParams(window.location.search);
const fromUrl = params.get("fromUrl");
document.getElementById("url-info").innerHTML = shorten(fromUrl, 120);

let searchStr = '';
let historyData = [];

// Get selected text, if any
chrome.runtime.sendMessage({ type: "getSelectedText" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("Error:", chrome.runtime.lastError.message);
    return;
  }
  document.getElementById("input").value = response.text;
});


function elementId(id) {
  return document.getElementById(id);
}

function spinnerOn() {
  elementId('spinnerOverlay').style.display = 'flex';
}

function spinnerOff() {
  elementId('spinnerOverlay').style.display = 'none';
}

function formatDateTime(date) {
  const pad = (n) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1); // Months are zero-based
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


function makeTable(historyData) {
  let table = `
    <table border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>&nbsp;</th>
          <th>Timestamp</th>
          <th>URL</th>
          <th>Text</th>
          <th>&nbsp;</th>
        </tr>
      </thead>
      <tbody>
  `;

  const filteredHistoryData = historyData.filter(item => {
    if (!searchStr || searchStr === '') {
      return true;
    }
    if (item.text.toLowerCase().includes(searchStr.toLowerCase())) {
      return true;
    }
    if (item.url.toLowerCase().includes(searchStr.toLowerCase())) {
      return true;
    }
    return false;
  });

  for (const item of filteredHistoryData) {
    let text = shorten(item.text);

    table += `
      <tr>
        <td>
          <a class="view-history" data-entry-id="${item.id}">
            view
          </a>
        </td>
        <td>${formatDateTime(new Date(item.ts))}</td>
        <td>${item.url}</td>
        <td>${text}</td>
        <td>
          <a class="remove-history" data-entry-id="${item.id}" style="color: red">
           remove 
          </a>
        </td>
      </tr>
    `;
  }

  table += `
      </tbody>
    </table>
  `;
  return table;
}


async function sendRequest(type, text) {
  const response = await fetch(`http://localhost:30303/api/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      url: fromUrl 
    })
  });
  const data = await response.json();
  return data;
}


async function getHistory() {
  const response = await fetch(`http://localhost:30303/api/history`);
  historyData = await response.json();
  elementId('history-container').innerHTML = makeTable(historyData);

  // Inject listeners
  document.querySelectorAll('.view-history').forEach(button => {
    button.addEventListener('click', () => {
      elementId('tab-button-1').classList.add('active');
      elementId('tab1').classList.add('active');

      elementId('tab-button-2').classList.remove('active');
      elementId('tab2').classList.remove('active');

      const entryId = button.getAttribute('data-entry-id');
        
      const entry = historyData.find(d => d.id === entryId);
      if (entry) {
        elementId("input").value = entry.text;
        elementId('response').innerHTML = marked.parse(entry.result);
      }
    });
  });
  document.querySelectorAll('.remove-history').forEach(button => {
    button.addEventListener('click', async () => {
      const entryId = button.getAttribute('data-entry-id');
      await fetch(`http://localhost:30303/api/history/${entryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      getHistory();
    });
  });
}


async function generatePlan() {
  elementId('history-direction').innerHTML = 'generating directions';
  const response2 = await fetch(`http://localhost:30303/api/history-direction`);
  const data2 = await response2.json();
  elementId('history-direction').innerHTML = marked.parse(data2.historyDirection);

}

// Inject this function into the page and get the result
/*
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  tabURL = tabs[0].url;
  chrome.scripting.executeScript(
    {
      target: { tabId: tabs[0].id },
      func: getSelectedText
    },
    (results) => {
      const text = results[0]?.result || undefined;
      // document.getElementById('selectedText').textContent = text;
      document.getElementById('input').value = text;
    }
  );
});
*/

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    elementId(tabId).classList.add('active');

    if (tabId === 'tab2') {
      getHistory();
    }
  });
});


elementId('chat').addEventListener('click', async () => {
  let prompt = elementId('input').value;
  spinnerOn();
  const data = await sendRequest('chat', prompt);
  const responseField = elementId('response');
  responseField.innerHTML = marked.parse(data);
  spinnerOff();
});


elementId('explain').addEventListener('click', async () => {
  let prompt = elementId('input').value;
  spinnerOn();
  const data = await sendRequest('explain', prompt);
  const responseField = elementId('response');
  responseField.innerHTML = marked.parse(data);
  spinnerOff();
});


elementId('generatePlan').addEventListener('click', async () => {
  generatePlan();
});

elementId('search-history').addEventListener('input', () => {
  searchStr = elementId('search-history').value;
  elementId('history-container').innerHTML = makeTable(historyData);
});
