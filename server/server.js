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
  let subtitleFile = `${baseOutput}.${options.subtitleLang}.srt`;
  if (options.subtitles) {
    command += ` --write-subs --sub-lang ${options.subtitleLang} --convert-subs srt`;
  }

  // Batch Download
  if (options.batch) {
    command += ` --yes-playlist`;
  }

  // Output
  command += ` -o "${outputFile}" "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", stderr);
      return res.json({ error: "Failed to process video: " + stderr });
    }

    const ext = options.audioOnly ? options.audioFormat : options.format;
    const downloadUrl = `http://localhost:${port}/downloads/${path.basename(baseOutput)}.${ext}`;
    const response = { downloadUrl };

    // Check if subtitle file exists and add its URL
    if (options.subtitles) {
      const subtitlePath = `${baseOutput}.${options.subtitleLang}.srt`;
      if (fs.existsSync(subtitlePath)) {
        response.subtitleUrl = `http://localhost:${port}/downloads/${path.basename(subtitlePath)}`;
      } else {
        console.warn(`Subtitle file not found for ${options.subtitleLang}`);
      }
    }

    res.json(response);

    // Clean up after 5 minutes
    setTimeout(() => {
      fs.unlink(`${baseOutput}.${ext}`, () => {});
      if (fs.existsSync(subtitlePath)) fs.unlink(subtitlePath, () => {});
    }, 300000);
  });
});

app.post("/preview", (req, res) => {
  const { url } = req.body;
  const command = `yt-dlp -f "best[height<=360]" -g "${url}"`;

  exec(command, (error, stdout) => {
    if (error) {
      return res.json({ error: "Preview unavailable" });
    }
    const previewUrl = stdout.trim().split("\n")[0];
    res.json({ previewUrl });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});