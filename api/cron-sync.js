const DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/prj_NxHm5oqtBTjSFB8ZfBkqlVjsVisj/HxOURmz4qY';

/**
 * GET /api/cron-sync
 * Daily cron job (6am UTC) that triggers a redeploy to sync Notion data.
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 */
module.exports = async function handler(req, res) {
  // Verify cron secret (Vercel sends this header for cron invocations)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const hookRes = await fetch(DEPLOY_HOOK_URL, { method: 'POST' });
    if (!hookRes.ok) {
      const text = await hookRes.text();
      throw new Error(`Deploy hook failed: ${hookRes.status} ${text}`);
    }

    const data = await hookRes.json();
    res.status(200).json({ success: true, deployment: data });
  } catch (error) {
    console.error('Cron sync failed:', error.message);
    res.status(500).json({ error: error.message });
  }
};
