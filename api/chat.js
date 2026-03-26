export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    // 1. GENERATE TIMESTAMP (Australia/Sydney Time)
    const now = new Date();
    const timestamp = now.toLocaleString('en-AU', { 
        timeZone: 'Australia/Sydney',
        dateStyle: 'short', 
        timeStyle: 'medium' 
    });

    // 2. GET GEO DATA FROM VERCEL
    const lat = req.headers['x-vercel-ip-latitude'];
    const lon = req.headers['x-vercel-ip-longitude'];
    const city = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Unknown');
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';

    // 3. REVERSE GEOCODE TO GET SUBURB
    let suburb = "";
    if (lat && lon) {
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'HEIScale-System-Architect/1.0' }
            });
            const geoData = await geoRes.json();
            const address = geoData.address || {};
            suburb = address.suburb || address.neighbourhood || address.town || address.village || "";
        } catch (e) {
            console.error("Geocoding Error:", e.message);
        }
    }

    // 4. FORMAT THE LOCATION STRING
    const locationDisplay = suburb && suburb.toLowerCase() !== city.toLowerCase() 
        ? `${city} - ${suburb}` 
        : city;

    // 5. LOG THE FINAL DATA WITH TIMESTAMP
    console.log(`[${timestamp}] VISITOR: ${locationDisplay} | Country: ${country}`);

    try {
        const { system, messages } = req.body;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 1024,
                system: system,
                messages: messages
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
