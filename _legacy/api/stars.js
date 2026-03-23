const redis = require('./_redis');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ids = req.query.ids;
    if (!ids) return res.status(200).json({});

    const appIds = ids.split(',').slice(0, 100);
    const pipeline = redis.pipeline();
    for (const id of appIds) pipeline.get(`stars:${id}`);
    const results = await pipeline.exec();

    const counts = {};
    appIds.forEach((id, i) => { counts[id] = parseInt(results[i]) || 0; });

    res.status(200).json(counts);
  } catch (err) {
    console.error('Stars error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
