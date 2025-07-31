// File: /api/save.js
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    // Only allow GET (since query params) or you can adapt to POST if preferred.
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed. Use GET with ?text=...&userid=...' });
    }

    const { text, userid } = req.query;

    if (!text || !userid) {
      return res.status(400).json({ error: 'Missing required query params: text and userid' });
    }

    // Normalize inputs
    const safeUserId = String(userid).replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = new Date().toISOString(); // ISO timestamp

    // Define blob paths
    const basePath = `users/${safeUserId}`;
    const textKey = `${basePath}/${timestamp}-content.txt`;
    const metaKey = `${basePath}/${timestamp}-meta.json`;

    // Upload the raw text as a blob
    const { url: textBlobUrl } = await put(textKey, text, {
      access: 'public',
      contentType: 'text/plain; charset=utf-8',
    });

    // Construct metadata JSON
    const metadata = {
      userid: safeUserId,
      text, // optionally you could omit raw text here if you want only in the text blob
      timestamp,
      blobLocation: textBlobUrl,
    };

    const metadataString = JSON.stringify(metadata, null, 2);

    // Upload metadata JSON
    const { url: metaBlobUrl } = await put(metaKey, metadataString, {
      access: 'public',
      contentType: 'application/json; charset=utf-8',
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
