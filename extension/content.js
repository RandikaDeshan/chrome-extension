function addDownloadButton() {
  const videoInfo = document.querySelector("#below");
  if (!videoInfo || document.querySelector("#download-btn")) return;

  const button = document.createElement("button");
  button.id = "download-btn";
  button.innerText = "Download";
  button.className = "download-btn";

  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openPopup" });
  });

  videoInfo.appendChild(button);
}

window.addEventListener("load", addDownloadButton);
new MutationObserver(addDownloadButton).observe(document.body, { childList: true, subtree: true });