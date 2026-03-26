export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzwMWiUawQjuPxUoUungazc-Xl90y7MPE4thpqw8WQkrbUjihpBdY6zoV09ybNWDNgjNw/exec';

    // 1. GENERATE TIMESTAMP (Australia/Sydney Time)
    const now = new Date();
    const timestamp = now.toLocaleString('en-AU', { 
        timeZone: 'Australia/Sydney',
        dateStyle: 'short', 
        timeStyle: 'medium' 
    });

    // 2. GET GEO DATA FROM VERCEL
    const city = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Unknown');
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const lat = req.headers['x-vercel-ip-latitude'];
    const lon = req.headers['x-vercel-ip-longitude'];

    // 3. REVERSE GEOCODE TO GET SUBURB (Enhanced Fallback)
    let locationDisplay = city;
    if (lat && lon) {
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'HEIScale-System-Architect/1.0' }
            });
            const geoData = await geoRes.json();
            const addr = geoData.address || {};
            const suburb = addr.suburb || addr.neighbourhood || addr.city_district || addr.town || "";
            if (suburb) locationDisplay = `${city} - ${suburb}`;
        } catch (e) { console.error("Geo Error"); }
    }

    // 4. THE FULL HEISCALE PERSONA
    const HEISCALE_PERSONA = `
        You are Hei's Assistant, the AI representative for HEIScale.
        
        ABOUT HEISCALE:
        - We are System Architects for the supply chain and industrial sectors.
        - We bridge the gap between "The Trench" (operations) and "The Tech" (innovation).
        - 20 years of experience in high-velocity logistics.
        
        YOUR CORE MISSION:
        - Explain how we fix messy supply chains using the H-E-I Framework (Harmonize, Emerging, Innovation).
        - Tone: Professional, authoritative, yet uses "Plain English." No corporate fluff.     
        - Follow up with deep dive questions to understand the specific business challenges.
        
        STRICT FORMATTING RULES:
        1. DO NOT use double asterisks (**) for bolding.
        2. DO NOT use dashes (-)
        3. Use plain English like a human expert texting.
        4. If you need to emphasize something, use CAPITAL LETTERS.
        5. Use simple line breaks to separate ideas.
        6. NO CHUNKY PARAGRAPHS. Max 2 sentences before a line break.
        7. DO NOT be overly formal. Be direct.

        CONTEXT:
        The visitor is in ${locationDisplay}, ${country}. Use this naturally if relevant.
    `;

    try {
        const { messages, name, email } = req.body;
        const lastUserMessage = messages[messages.length - 1].content;

        // 5. TALK TO CLAUDE FIRST
        const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
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

        const data = await aiResponse.json();
        const aiReply = data.content?.[0]?.text || "No response content";

        // 6. LOG FULL PACKAGE TO GOOGLE SHEETS
        fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp: timestamp,
                location: `${locationDisplay} (${country})`,
                name: name || "Anonymous",
                email: email || "No Email",
                message: lastUserMessage,
                ai_response: aiReply
            })
        }).catch(err => console.error("Logging Error:", err));

        // 7. RESPOND TO WEBSITE
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
