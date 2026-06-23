const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } });

// Data persistence
const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.error('Load data error:', e); }
  return { conversations: [], settings: {} };
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ============ Settings API ============
app.get('/api/settings', (req, res) => {
  const data = loadData();
  res.json(data.settings || {});
});

app.post('/api/settings', (req, res) => {
  const data = loadData();
  data.settings = { ...data.settings, ...req.body };
  saveData(data);
  res.json({ success: true });
});

// ============ Conversations API ============
app.get('/api/conversations', (req, res) => {
  const data = loadData();
  const list = (data.conversations || []).map(c => ({
    id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt, messageCount: (c.messages || []).length
  }));
  res.json(list);
});

app.get('/api/conversations/:id', (req, res) => {
  const data = loadData();
  const conv = (data.conversations || []).find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

app.post('/api/conversations', (req, res) => {
  const data = loadData();
  const conv = {
    id: 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: req.body.title || '新对话',
    messages: req.body.messages || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.conversations.unshift(conv);
  saveData(data);
  res.json(conv);
});

app.put('/api/conversations/:id', (req, res) => {
  const data = loadData();
  const idx = (data.conversations || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const existing = data.conversations[idx];
  data.conversations[idx] = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString()
  };
  saveData(data);
  res.json(data.conversations[idx]);
});

app.delete('/api/conversations/:id', (req, res) => {
  const data = loadData();
  data.conversations = (data.conversations || []).filter(c => c.id !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// ============ File Upload ============
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: fileUrl,
    path: req.file.path
  });
});

app.use('/uploads', express.static(uploadDir));

// ============ Chat Stream API (SSE) ============
app.post('/api/chat/stream', async (req, res) => {
  const { messages, apiKey, apiUrl, model, temperature, maxTokens } = req.body;

  if (!apiKey) return res.status(400).json({ error: '请先配置 API Key' });
  if (!apiUrl) return res.status(400).json({ error: '请先配置 API 地址' });

  const base = apiUrl.replace(/\/+$/, '');
  const url = base.endsWith('/v1') ? base + '/chat/completions' : base + '/v1/chat/completions';

  const body = JSON.stringify({
    model: model || 'gpt-3.5-turbo',
    messages: messages || [],
    stream: true,
    temperature: temperature !== undefined ? temperature : 0.7,
    max_tokens: maxTokens || 2048
  });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const https = url.startsWith('https') ? require('https') : require('http');
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        let errorBody = '';
        apiRes.on('data', chunk => { errorBody += chunk; });
        apiRes.on('end', () => {
          let errMsg = `API Error (${apiRes.statusCode})`;
          try { errMsg = JSON.parse(errorBody).error?.message || errMsg; } catch(e) {}
          res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        });
        return;
      }

      apiRes.on('data', (chunk) => {
        if (aborted) return;
        res.write(chunk);
      });

      apiRes.on('end', () => {
        if (!aborted) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });

      apiRes.on('error', (err) => {
        console.error('API stream error:', err.message);
        if (!aborted) {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      });
    });

    apiReq.on('error', (err) => {
      console.error('API request error:', err.message);
      if (!aborted) {
        res.write(`data: ${JSON.stringify({ error: '连接失败: ' + err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    });

    apiReq.write(body);
    apiReq.end();

  } catch (err) {
    console.error('Chat stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ============ Models List API ============
app.get('/api/models', async (req, res) => {
  const { apiUrl, apiKey } = req.query;
  if (!apiUrl || !apiKey) return res.json([]);
  try {
    const https = apiUrl.startsWith('https') ? require('https') : require('http');
    const base = apiUrl.replace(/\/+$/, '');
    const url = base.endsWith('/v1') ? base + '/models' : base + '/v1/models';
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (apiUrl.startsWith('https') ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    };
    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => { data += chunk; });
      apiRes.on('end', () => {
        try { res.json(JSON.parse(data).data || []); }
        catch (e) { res.json([]); }
      });
    });
    apiReq.on('error', () => res.json([]));
    apiReq.end();
  } catch (e) { res.json([]); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Chat Server running at http://localhost:${PORT}`);
});
