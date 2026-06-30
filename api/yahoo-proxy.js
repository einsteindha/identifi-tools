export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const target = decodeURIComponent(url);
  if (!target.includes('finance.yahoo.com')) {
    return res.status(403).json({ error: 'only yahoo finance allowed' });
  }

  // query2가 query1보다 덜 제한적
  const adjusted = target.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com');

  try {
    const r = await fetch(adjusted, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!r.ok) return res.status(r.status).json({ error: `upstream ${r.status}` });

    const text = await r.text();
    if (!text || text.trimStart().startsWith('<')) {
      return res.status(502).json({ error: 'upstream returned HTML' });
    }

    const data = JSON.parse(text);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
