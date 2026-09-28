export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract client IP & Geo from Vercel headers
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
  
  const country = req.headers['x-vercel-ip-country'] || 'Desconocido';
  const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : 'Desconocido';
  const region = req.headers['x-vercel-ip-country-region'] || '';
  const latitude = req.headers['x-vercel-ip-latitude'] || null;
  const longitude = req.headers['x-vercel-ip-longitude'] || null;
  const userAgent = req.headers['user-agent'] || '';

  const clientInfo = {
    ip,
    country,
    city,
    region,
    latitude,
    longitude,
    userAgent
  };

  // If POST, receive event and broadcast to ntfy.sh event bus
  if (req.method === 'POST') {
    let payload = {};
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      payload = req.body || {};
    }

    const eventRecord = {
      ...payload,
      ip: (payload.ip && payload.ip !== 'Detectando...' && payload.ip !== '127.0.0.1') ? payload.ip : ip,
      country: (payload.country && payload.country !== 'Detectando...') ? payload.country : country,
      city: (payload.city && payload.city !== 'Detectando...') ? payload.city : city,
      region: payload.region || region,
      serverTimestamp: Date.now()
    };

    // Forward to secure event topic
    try {
      await fetch('https://ntfy.sh/myoozlabs_live_telemetry_v2_e829fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventRecord)
      });
    } catch (err) {
      console.warn('Event relay error:', err);
    }

    return res.status(200).json({ success: true, record: eventRecord });
  }

  // GET returns client geo info
  return res.status(200).json(clientInfo);
}
