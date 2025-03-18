const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.json());
app.use("/downloads", express.static(__dirname + "/downloads"));
const downloadDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

app.post("/download", (req, res) => {
  const { url, options } = req.body;
  const baseOutput = path.join(downloadDir, `video_${Date.now()}`);
  const outputFile = `${baseOutput}.%(ext)s`;
  let command = `yt-dlp`;

  // Resolution and Format
  if (!options.audioOnly) {
    command += ` -f "bestvideo[height<=${options.resolution}]+bestaudio/best[height<=${options.resolution}]" --merge-output-format ${options.format}`;
  } else {
    command += ` -x --audio-format ${options.audioFormat}`;
  }

  // Subtitles
  if (options.subtitles) {
    if (options.subtitleLang === "all") {
      command += ` --all-subs --write-subs --convert-subs srt`;
    } else {
      command += ` --write-subs --sub-lang ${options.subtitleLang} --convert-subs srt`;
    }
  }

  // Output
  command += ` -o "${outputFile}" "${url}"`;

  console.log("Executing command:", command); // Debug log
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", stderr);
      return res.json({ error: "Failed to process video: " + stderr });
    }

    const ext = options.audioOnly ? options.audioFormat : options.format;
    const downloadUrl = `http://localhost:${port}/downloads/${path.basename(baseOutput)}.${ext}`;
    const response = { downloadUrl };

    // Handle subtitles
    if (options.subtitles) {
      const subtitleFiles = fs.readdirSync(downloadDir)
        .filter(file => file.startsWith(path.basename(baseOutput)) && file.endsWith(".srt"))
        .map(file => ({
          url: `http://localhost:${port}/downloads/${file}`,
          lang: file.match(/\.([^.]+)\.srt$/)?.[1] || "unknown",
          path: path.join(downloadDir, file)
        }));
      console.log("Subtitle files found:", subtitleFiles); // Debug log
      if (subtitleFiles.length > 0) {
        response.subtitleUrls = subtitleFiles.map(f => ({ url: f.url, lang: f.lang }));
      } else {
        console.warn("No subtitles found for this video.");
      }
    }

    console.log("Sending response:", response); // Debug log
    res.json(response);

    // Cleanup after 5 minutes
    setTimeout(() => {
      const mainFile = `${baseOutput}.${ext}`;
      if (fs.existsSync(mainFile)) {
        fs.unlink(mainFile, (err) => {
          if (err) console.error(`Failed to delete ${mainFile}:`, err);
        });
      }

      if (options.subtitles && response.subtitleUrls) {
        response.subtitleUrls.forEach(sub => {
          const subPath = `${baseOutput}.${sub.lang}.srt`;
          if (fs.existsSync(subPath)) {
            fs.unlink(subPath, (err) => {
              if (err) console.error(`Failed to delete ${subPath}:`, err);
            });
          }
        });
      }
    }, 300000);
  });
});

app.post("/preview", (req, res) => {
  const { url } = req.body;
  const command = `yt-dlp -f "best[height<=360]" -g "${url}"`;

  console.log("Executing preview command:", command); // Debug log
  exec(command, (error, stdout) => {
    if (error) {
      console.error("Preview error:", stderr);
      return res.json({ error: "Preview unavailable" });
    }
    const previewUrl = stdout.trim().split("\n")[0];
    res.json({ previewUrl });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});