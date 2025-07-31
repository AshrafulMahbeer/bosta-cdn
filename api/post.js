const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('multipart/form-data')) {
    res.statusCode = 400;
    res.end('Invalid Content-Type');
    return;
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) {
    res.statusCode = 400;
    res.end('No boundary found');
    return;
  }

  // Buffer entire body (Vercel-compatible)
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  const parts = rawBody.toString('binary').split(`--${boundary}`);
  const data = {};
  let imageSavedPath = '';

  for (const part of parts) {
    if (part.includes('Content-Disposition')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : null;

      if (part.includes('filename=')) {
        const fileNameMatch = part.match(/filename="([^"]+)"/);
        const fileName = fileNameMatch ? fileNameMatch[1] : 'upload.bin';
        const ext = path.extname(fileName);
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const fileContent = part.slice(contentStart, part.lastIndexOf('\r\n'));

        const uploadsDir = '/tmp/uploads';
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        const imgFilename = `img-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
        const imgPath = path.join(uploadsDir, imgFilename);
        fs.writeFileSync(imgPath, Buffer.from(fileContent, 'binary'));
        imageSavedPath = `/uploads/${imgFilename}`;
      } else {
        const contentStart = part.indexOf('\r\n\r\n') + 4;
        const value = part.slice(contentStart, part.lastIndexOf('\r\n')).trim();
        if (name) data[name] = value;
      }
    }
  }

  const userId = data.userId || '000';
  const text = data.text || '';
  const timestamp = Date.now();
  const dateObj = new Date(timestamp);
  const ddmmyyyy = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${dateObj.getFullYear()}`;
  const ddmmyy = `${String(dateObj.getDate()).padStart(2, '0')}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getFullYear()).slice(2)}`;
  const uniqueName = `${ddmmyyyy}-${userId}-${timestamp}`.slice(0, -4) + timestamp.toString().slice(-4) + '.json';

  const postObj = {
    userId,
    text,
    image: imageSavedPath,
    timestamp
  };

  const postsDir = '/tmp/posts';
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  const postPath = path.join(postsDir, uniqueName);
  fs.writeFileSync(postPath, JSON.stringify(postObj, null, 2));

  const indexPath = path.join(postsDir, `${ddmmyy}.json`);
  let indexData = [];
  if (fs.existsSync(indexPath)) {
    try {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {}
  }
  indexData.push({ file: uniqueName, timestamp });
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'Post saved', file: uniqueName, image: imageSavedPath }));
};
