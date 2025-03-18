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
    console.log("Starting download for URL:", url, "with options:", options);
    const response = await fetch("http://localhost:3000/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, options })
    });
    const data = await response.json();
    console.log("Server response:", data);

    if (data.error) {
      console.error("Server error:", data.error);
      return;
    }

    const ext = options.audioOnly ? options.audioFormat : options.format;
    const baseFilename = `youtube_${Date.now()}`;
    console.log("Downloading main file:", `${baseFilename}.${ext}`);
    chrome.downloads.download({
      url: data.downloadUrl,
      filename: `${baseFilename}.${ext}`,
      saveAs: true
    });

    if (options.subtitles && data.subtitleUrls) {
      console.log("Subtitle URLs received:", data.subtitleUrls);
      data.subtitleUrls.forEach((subtitle, index) => {
        const subtitleFilename = `${baseFilename}${data.subtitleUrls.length > 1 ? `.${index + 1}` : ""}.${subtitle.lang}.srt`;
        console.log("Downloading subtitle:", subtitleFilename, "from", subtitle.url);
        chrome.downloads.download({
          url: subtitle.url,
          filename: subtitleFilename,
          saveAs: false
        }, (downloadId) => {
          if (!downloadId) {
            console.error("Failed to start subtitle download for:", subtitle.url, chrome.runtime.lastError);
          } else {
            console.log("Subtitle download started, ID:", downloadId);
          }
        });
      });
    } else if (options.subtitles) {
      console.warn("Subtitles requested but no subtitleUrls in response.");
    }
  } catch (error) {
    console.error("Download failed:", error);
  }
}

async function getPreviewUrl(url, sendResponse) {
  try {
    console.log("Fetching preview for URL:", url);
    const response = await fetch("http://localhost:3000/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    console.log("Preview response:", data);
    sendResponse({ previewUrl: data.previewUrl });
  } catch (error) {
    console.error("Preview failed:", error);
    sendResponse({ error: "No preview available" });
  }
}