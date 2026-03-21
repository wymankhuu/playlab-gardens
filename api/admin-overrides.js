/**
 * GET /api/admin-overrides
 * Legacy endpoint — returns empty overrides.
 * Admin edits now go directly to the Showcase Apps Master database.
 */
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ overrides: {} });
};
