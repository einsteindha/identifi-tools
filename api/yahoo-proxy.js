let _crumb = null;
let _cookies = '';
let _crumbExpiry = 0;

async function getYahooCrumb() {
  if (_crumb && Date.now() < _crumbExpiry) return { crumb: _crumb, cookies: _cookies };

  // 1) 쿠키 획득
  const homeResp = await fetch('https://fc.yahoo.com', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });
  const rawCookies = homeResp.headers.getSetCookie?.() ?? [];
  _cookies = rawCookies.map(c => c.split(';')[0]).join('; ');

  // 2) Crumb 획득
  const crumbResp = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cookie': _cookies,
      'Accept': '*/*',
    },
    signal: AbortSignal.timeout(8000),
  });
  _crumb = await crumbResp.text();
  _crumbExpiry = Date.now() + 55 * 60 * 1000; // 55분 캐시
  return { crumb: _crumb, cookies: _cookies };
}

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  const target = decodeURIComponent(url);
  if (!target.includes('finance.yahoo.com')) {
    return res.status(403).json({ error: 'only yahoo finance allowed' });
  }

  try {
    const { crumb, cookies } = await getYahooCrumb();

    // crumb 파라미터 추가
    const separator = target.includes('?') ? '&' : '?';
    const targetWithCrumb = `${target}${separator}crumb=${encodeURIComponent(crumb)}`;

    const r = await fetch(targetWithCrumb, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': cookies,
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!r.ok) {
      // 429면 crumb 만료 처리 후 에러 반환
      if (r.status === 429) { _crumb = null; _crumbExpiry = 0; }
      return res.status(r.status).json({ error: `upstream ${r.status}` });
    }

    const text = await r.text();
    if (!text || text.trimStart().startsWith('<')) {
      return res.status(502).json({ error: 'upstream returned HTML' });
    }

    const data = JSON.parse(text);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch (e) {
    _crumb = null; _crumbExpiry = 0;
    return res.status(500).json({ error: e.message });
  }
}
