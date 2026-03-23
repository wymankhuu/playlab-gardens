const redis = require('./_redis');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { appId, action } = req.body || {};
    if (!appId || typeof appId !== 'string') {
      return res.status(400).json({ error: 'appId required' });
    }

    const key = `stars:${appId}`;
    let count;
    if (action === 'unstar') {
      count = await redis.decr(key);
      if (count < 0) { await redis.set(key, 0); count = 0; }
    } else {
      count = await redis.incr(key);
    }

    res.status(200).json({ appId, count });
  } catch (err) {
    console.error('Star error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
