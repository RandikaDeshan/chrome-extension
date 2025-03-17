document.getElementById("audioOnly").addEventListener("change", (e) => {
  document.getElementById("audioFormat").disabled = !e.target.checked;
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const options = {
    resolution: document.getElementById("resolution").value,
    format: document.getElementById("format").value,
    audioOnly: document.getElementById("audioOnly").checked,
    audioFormat: document.getElementById("audioFormat").value,
    subtitles: document.getElementById("subtitles").checked,
    subtitleLang: document.getElementById("subtitleLang").value,
    batch: document.getElementById("batch").checked
  };

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    chrome.runtime.sendMessage({ action: "startDownload", url, options });
  });
});

// Request preview URL on popup load
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.runtime.sendMessage({ action: "getPreview", url: tabs[0].url }, (response) => {
    if (response && response.previewUrl) {
      document.getElementById("preview").src = response.previewUrl;
    }
  });
});