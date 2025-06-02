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
function makeTable(data) {
  let table = `
    <table border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>URL</th>
          <th>Text</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const item of data) {
    table += `
      <tr>
        <td>${formatDateTime(new Date(item.ts))}</td>
        <td>${item.url}</td>
        <td>${item.text}</td>
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

async function getHistory() {
  const response = await fetch(`http://localhost:3000/api/history`);
  const data = await response.json();

  document.getElementById('history-container').innerHTML = makeTable(data);
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

document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    button.classList.add('active');
    const tabId = button.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'tab2') {
      getHistory();
    }
  });
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


