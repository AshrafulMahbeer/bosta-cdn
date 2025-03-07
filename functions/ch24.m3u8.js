const https = require('https');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://bostaflix.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        // Fetch the live video data from the API
        https.get('https://backoffice.channel24bd.tv/api/v1/webLiveVideo', (apiRes) => {
            let data = '';
            
            apiRes.on('data', chunk => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.video && jsonData.video.VideoLinkCode) {
                        const videoUrl = jsonData.video.VideoLinkCode;
                        res.writeHead(302, { Location: videoUrl });
                        res.end();
                    } else {
                        res.status(500).json({ error: 'Video link not found' });
                    }
                } catch (error) {
                    res.status(500).json({ error: 'Invalid JSON response' });
                }
            });
        }).on('error', (error) => {
            res.status(500).json({ error: 'API request failed' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Unexpected error occurred' });
    }
};
