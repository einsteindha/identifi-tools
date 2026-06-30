export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const target = decodeURIComponent(url);
    if (!target.includes('finance.yahoo.com')) {
      return res.status(403).json({ error: 'only yahoo finance allowed' });
    }

    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!r.ok) return res.status(r.status).json({ error: `upstream ${r.status}` });

    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
