export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
                model: "claude-3-haiku-20240307",
                max_tokens: 1024,
                system: system || "You are a helpful assistant.",
                // Safety filter: removes anything that isn't a valid object with content
                messages: messages.filter(m => m.role && m.content && m.content.trim() !== "")
            })

            
        });

        const data = await response.json();

        if (!response.ok) {
            // This will help us see the SPECIFIC error in Vercel logs
            console.error('Anthropic Error Details:', JSON.stringify(data));
            return res.status(response.status).json(data);
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Server Crash:', error);
        res.status(500).json({ error: 'API request failed' });
    }
}
