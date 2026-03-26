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

    const locationDisplay = suburb && suburb.toLowerCase() !== city.toLowerCase() 
        ? `${city} - ${suburb}` 
        : city;

    // 4. LOG THE VISITOR
    console.log(`[${timestamp}] VISITOR: ${locationDisplay} | Country: ${country}`);


    // 5. THE HEISCALE PERSONA (Updated to stop Markdown symbols)
    const HEISCALE_PERSONA = `
        You are Hei's Assistant, the AI representative for HEIScale.
        
        ABOUT HEISCALE:
        - We are System Architects for the supply chain and industrial sectors.
        - We bridge the gap between "The Trench" (operations) and "The Tech" (innovation).
        - 20 years of experience in high-velocity logistics.
        
        YOUR CORE MISSION:
        - Explain how we fix messy supply chains.
        - Tone: Professional, authoritative, yet uses "Plain English." No corporate fluff.     
        - Follow up with deep dive questions to understand the problems, then playback the understanding during the conversation.
        
        STRICT FORMATTING RULES:
        1. DO NOT use double asterisks (**) for bolding.
        2. DO NOT use dashes (-) for bullet points.
        3. Use plain text only. 
        4. If you need to emphasize something, use CAPITAL LETTERS.
        5. Use simple line breaks to separate ideas.
        6. Keep responses concise and readable for a mobile chat window.
        
        CONTEXT:
        The visitor is currently in ${locationDisplay}, ${country}. Use this naturally if they ask about local expertise.
    `;


    
    try {
        const { messages } = req.body; // No longer taking 'system' from frontend to prevent prompt injection

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
                system: HEISCALE_PERSONA,
                messages: messages
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Anthropic Error:', JSON.stringify(data));
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
