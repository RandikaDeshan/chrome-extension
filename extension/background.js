chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startDownload") {
    const { url, options } = message;
    initiateDownload(url, options);
  } else if (message.action === "getPreview") {
    getPreviewUrl(message.url, sendResponse);
    return true; // Async response
  }
});

async function initiateDownload(url, options) {
  try {
    const response = await fetch("http://localhost:3000/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, options })
    });
    const data = await response.json();

    if (data.error) {
      console.error("Server error:", data.error);
      return;
    }

    const ext = options.audioOnly ? options.audioFormat : options.format;
    const baseFilename = `youtube_${options.batch ? "batch_" : ""}${Date.now()}`;
    chrome.downloads.download({
      url: data.downloadUrl,
      filename: `${baseFilename}.${ext}`,
      saveAs: true
    });

    // Download subtitles if available
    if (options.subtitles && data.subtitleUrl) {
      chrome.downloads.download({
        url: data.subtitleUrl,
        filename: `${baseFilename}.srt`,
        saveAs: false // Download silently alongside video
      });
    }
  } catch (error) {
    console.error("Download failed:", error);
  }
}

async function getPreviewUrl(url, sendResponse) {
  try {
    const response = await fetch("http://localhost:3000/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    sendResponse({ previewUrl: data.previewUrl });
  } catch (error) {
    console.error("Preview failed:", error);
    sendResponse({ error: "No preview available" });
  }
}