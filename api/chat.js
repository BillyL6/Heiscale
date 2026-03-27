export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzkvyYaNQ51oYOwnlWNhKL7QXK2mGw6b8vFFakSdmFmznz4k11CrrvP77Js2j8RVM2q/exec';

    // 1. GENERATE TIMESTAMP (Australia/Sydney Time)
    const now = new Date();
    const timestamp = now.toLocaleString('en-AU', { 
        timeZone: 'Australia/Sydney',
        dateStyle: 'short', 
        timeStyle: 'medium' 
    });

    // 2. GET GEO DATA FROM VERCEL HEADERS
    const city = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Unknown');
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const lat = req.headers['x-vercel-ip-latitude'];
    const lon = req.headers['x-vercel-ip-longitude'];

    // 3. REVERSE GEOCODE (Suburb Level)
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

    // 4. SYSTEM PERSONA
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
        3. DO NOT use em-dash (—)
        4. Use plain English like a human expert texting.
        5. If you need to emphasize something, use CAPITAL LETTERS.
        6. Use simple line break to separate ideas.
        7. NO CHUNKY PARAGRAPHS. Max 2 sentences before a line break.
        8. DO NOT be overly formal. Be direct.
        9. Ask for name and email after the first question politely.
        10. Do not give drect solition.
        11. Playback and to adjust and validate understanding.
        12. After four questions, gentally closing with playback with a problem statement, and advise following up. 
        
        Context: User is in ${locationDisplay}, ${country}.
    `;

    try {
        const { messages, chatId } = req.body;
        const lastUserMessage = messages[messages.length - 1].content;

        // 5. CALL ANTHROPIC (Claude 3.5 Sonnet)
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
                messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
        });

        const data = await aiResponse.json();
        const aiReply = data.content?.[0]?.text || "NO RESPONSE FROM ARCHITECT.";

        // 6. LOG TO GOOGLE SHEETS (Background Await)
        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: chatId,
                    timestamp: timestamp,
                    location: `${locationDisplay} (${country})`,
                    message: lastUserMessage,
                    ai_response: aiReply
                })
            });
        } catch (err) {
            console.error("SHEET LOGGING FAILED:", err);
        }

        // 7. RESPOND TO FRONTEND
        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
