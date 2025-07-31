// Vercel API route - no dependencies
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const boundary = req.headers['content-type'].split('boundary=')[1];
  let rawBody = '';
  req.setEncoding('binary');

  req.on('data', chunk => rawBody += chunk);
  req.on('end', () => {
    const parts = rawBody.split(`--${boundary}`);
    const data = {};
    let imageSavedPath = '';

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : null;

        if (part.includes('filename=')) {
          // Handle file
          const fileNameMatch = part.match(/filename="([^"]+)"/);
          const fileName = fileNameMatch ? fileNameMatch[1] : 'upload.bin';
          const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';

          const fileStart = part.indexOf('\r\n\r\n') + 4;
          const fileContent = part.slice(fileStart, part.lastIndexOf('\r\n'));

          const uploadsDir = path.resolve(__dirname, '../tmp/uploads');
          if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

          const imgFilename = `img-${Date.now()}-${Math.floor(Math.random() * 10000)}${path.extname(fileName)}`;
          const imgPath = path.join(uploadsDir, imgFilename);
          fs.writeFileSync(imgPath, fileContent, 'binary');
          imageSavedPath = `/uploads/${imgFilename}`;
        } else {
          // Handle text field
          const start = part.indexOf('\r\n\r\n') + 4;
          const value = part.slice(start, part.lastIndexOf('\r\n')).trim();
          data[name] = value;
        }
      }
    }

    // Required fields: userId, text
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

    const postsDir = path.resolve(__dirname, '../tmp/posts');
    if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

    const postPath = path.join(postsDir, uniqueName);
    fs.writeFileSync(postPath, JSON.stringify(postObj, null, 2));

    // Update index
    const indexPath = path.join(postsDir, `${ddmmyy}.json`);
    let indexData = [];
    if (fs.existsSync(indexPath)) {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    }
    indexData.push({ file: uniqueName, timestamp });
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Post saved', file: uniqueName, image: imageSavedPath }));
  });
};
