function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

// Inject this function into the page and get the result
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

// document.getElementById('input').value = 'test123';

document.getElementById("chat").addEventListener("click", async () => {
  let prompt = document.getElementById("input").value;
  const responseField = document.getElementById("response");
  
  document.getElementById('spinnerOverlay').style.display = 'flex';

  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: prompt
    })
  });

  document.getElementById('spinnerOverlay').style.display = 'none';

  const data = await response.json();
  // responseField.textContent = data.choices?.[0]?.message?.content || "No response";
  responseField.textContent = data;
});
