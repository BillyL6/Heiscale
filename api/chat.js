export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    // The endpoint for your combined Google Apps Script
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQKYvsGNaUazlhNhQILrDQhklx-J_evO3MOk0L83lskvX7UNsT_iz0jJakL2X3xvRTGw/exec';

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

    // 3. THE FULL HEISCALE PERSONA
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

        CALENDAR ACCESS:
        - YOU HAVE DIRECT ACCESS TO HEI'S CALENDAR.
        - Never say "I wish I could book it" or "Go to the website to book."
        - YOU MUST HAVE the user name and email before you can start Google Calendar booking process.
        - If the user wants to meet, tell them you are checking the live slots now.
        - IF the user has intention to meet, ask the user if the user want to book a meeting.
        - Once the system provides slots, present them clearly and help the user pick one.
        
        STRICT FORMATTING RULES:
        - DO NOT use double asterisks (**) for bolding.
        - DO NOT use dashes (-)
        - DO NOT use em-dash (—)
        - NO CHUNKY PARAGRAPHS. Max 2 sentences before a line break.
        - Use plain English like a human expert texting.
        - If you need to emphasize something, use CAPITAL LETTERS.
        - Use simple line break to separate ideas.
        - DO NOT be overly formal. Be direct.
        - Ask for name and email after the first question politely.
        - Do not give direct solutions immediately.
        - Playback to validate understanding first.
        - After four questions, gentally closing with playback with a problem statement, and advise following up. 
        
        Context: User is in ${locationDisplay}, ${country}.
    `;

    try {
        const { messages, chatId, action, bookingData } = req.body;

        // --- CALENDAR ACTION HANDLERS ---
        
        // Action: Fetch Available Slots
        if (action === "FETCH_SLOTS") {
            const r = await fetch(GOOGLE_URL, { method: 'POST', body: JSON.stringify({ action: "GET_SLOTS" }) });
            return res.status(200).json(await r.json());
        }

        // Action: Confirm Final Booking
        if (action === "BOOK_MEETING") {
            const r = await fetch(GOOGLE_URL, { 
                method: 'POST', 
                body: JSON.stringify({ 
                    action: "BOOK_MEETING", 
                    startTime: bookingData.startTime, // Match GAS Key
                    email: bookingData.email, 
                    summary: bookingData.summary 
                }) 
            });
            return res.status(200).json({ status: await r.text() });
        }    

        // --- STANDARD CHAT LOGIC ---
        const lastUserMessage = messages[messages.length - 1].content;

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
        const aiReply = data.content?.[0]?.text || "NO RESPONSE CONTENT";

        // 4. LOG FULL PACKAGE TO GOOGLE SHEETS
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
        } catch (err) { console.error("Logging Error:", err); }

        res.status(200).json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
