export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    try {
        const { system, messages } = req.body;
        
        // This log helps us debug the 'not_found' error
        console.log("Sending to Anthropic:", JSON.stringify({ model: "claude-3-haiku-20240307", messages }));

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
                system: system,
                messages: messages
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Anthropic Error Details:', JSON.stringify(data));
            return res.status(response.status).json(data);
        }
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
