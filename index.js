// server/index.js
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/search', (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const command = `yt-dlp -j --flat-playlist "ytsearch9:${query}"`;
  exec(command, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });

    const entries = stdout.trim().split('\n').map(line => JSON.parse(line));
    const results = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      thumbnail: `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${entry.id}`
    }));

    res.json({ results });
  });
});

app.get('/api/download', (req, res) => {
  const videoId = req.query.id;
  if (!videoId) return res.status(400).json({ error: 'Missing video id' });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const command = `yt-dlp -j ${url}`;

  exec(command, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr });

    const info = JSON.parse(stdout);
    const formats = info.formats || [];

    const mp4 = formats.filter(f => f.ext === 'mp4' && f.vcodec !== 'none')
      .map(f => ({ quality: f.format_note || 'unknown', url: f.url }));

    const mp3 = formats.filter(f => f.ext === 'm4a' || (f.acodec && f.acodec !== 'none'))
      .map(f => ({ quality: f.abr ? `${f.abr}kbps` : 'unknown', url: f.url }));

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      mp4,
      mp3
    });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
