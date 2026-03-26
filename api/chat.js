export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    const GOOGLE_SHEET_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';

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

    // 3. REVERSE GEOCODE TO GET SUBURB
    let suburb = "";
    if (lat && lon) {
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'HEIScale-System-Architect/1.0' }
            });
            const geoData = await geoRes.json();
            suburb = geoData.address?.suburb || geoData.address?.neighbourhood || geoData.address?.town || "";
        } catch (e) { console.error("Geo Error"); }
    }

    const locationDisplay = suburb && suburb.toLowerCase() !== city.toLowerCase() 
        ? `${city} - ${suburb}` 
        : city;

    // 4. THE HEISCALE PERSONA (Clean & Concise)
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
        3. BE CONCISE. Use "plain English" like a human expert texting.
        4. If you need to emphasize something, use CAPITAL LETTERS.
        5. Use simple line breaks to separate ideas.
        6. Keep responses concise and readable for a mobile chat window.
        7. NO CHUNKY PARAGRAPHS. Never write more than 2 sentences before a line break.
        8. If you have multiple points, use a new line for each instead of a list.
        9. DO NOT be overly formal. Be direct.

        EXAMPLE STYLE:
        Slow picking usually happens because of travel time.
        Pickers are likely zigzagging because the warehouse path isn't optimized.
        It could also be "bad slotting" where fast movers are buried in the back.
        What does it look like on your floor right now? Are they walking long distances?
        
        CONTEXT:
        The visitor is currently in ${locationDisplay}, ${country}. Use this naturally if they ask about local expertise.
    `;

    try {
        const { messages, name, email } = req.body;
        const lastUserMessage = messages[messages.length - 1].content;

        // 5. ASYNC LOG TO GOOGLE SHEETS
        // We don't 'await' this so the chat stays fast
        fetch(
            'https://script.google.com/macros/s/AKfycbzwMWiUawQjuPxUoUungazc-Xl90y7MPE4thpqw8WQkrbUjihpBdY6zoV09ybNWDNgjNw/exec'
            , {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                timestamp,
                location: `${locationDisplay} (${country})`,
                name: name || "Anonymous",
                email: email || "No Email Provided",
                message: lastUserMessage
            })
        }).catch(err => console.error("Sheet Sync Error:", err));

        // 6. TALK TO CLAUDE
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
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


