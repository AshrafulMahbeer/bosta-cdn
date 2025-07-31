// File: /api/save.js
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed. Use GET with ?text=...&userid=...' });
    }

    const { text, userid } = req.query;

    if (!text || !userid) {
      return res.status(400).json({ error: 'Missing required query params: text and userid' });
    }

    // Get token from environment
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.log('Token present?', !!token);
    if (!token) {
      return res.status(500).json({ error: 'Blob token not configured in environment' });
    }

    // Normalize inputs
    const safeUserId = String(userid).replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString();

    // Define blob paths
    const basePath = `users/${safeUserId}`;
    const textKey = `${basePath}/${timestamp}-content.txt`;
    const metaKey = `${basePath}/${timestamp}-meta.json`;

    // Upload the raw text as a blob with token
    const { url: textBlobUrl } = await put(textKey, text, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
      token,
    });

    // Construct metadata JSON
    const metadata = {
      userid: safeUserId,
      text,
      timestamp,
      blobLocation: textBlobUrl,
    };

    const metadataString = JSON.stringify(metadata, null, 2);

    // Upload metadata JSON with token
    const { url: metaBlobUrl } = await put(metaKey, metadataString, {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
      token,
    });

    // Return consolidated response
    return res.status(201).json({
      message: 'Saved successfully',
      metadata,
      metadataBlob: metaBlobUrl,
    });
  } catch (err) {
    console.error('Error in /api/save:', err);
    return res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
}
