exports.handler = async function (event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { difficulty, region, seenQuestions } = JSON.parse(event.body);
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("Missing OPENAI_API_KEY environment variable");
            return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
        }

        // Backend Prompt Logic
        const recentHistory = (seenQuestions || []).slice(-20).map(q => `"${q}"`).join(', ');

        const prompt = `
        Generate a multiple-choice geography trivia question.
        Difficulty: ${difficulty}
        Region: ${region}

        TOPIC GUIDELINES:
        - Ensure HIGH VARIETY. Do NOT just ask about rivers or capitals.
        - Include: Physical geography (mountains, deserts), Cultural geography (languages, demographics), Landmarks, Cities, Borders, Currencies, Flags (described).
        - Do NOT ask any of these recently asked questions: [${recentHistory}]

        Return ONLY raw JSON with this structure:
        {
            "question": "Question text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0
        }
        Make the options challenging but plausible.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a geography trivia generator. You ensure variety and never repeat questions."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.9
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("OpenAI API Error:", err);
            return { statusCode: response.status, body: `OpenAI Error: ${err}` };
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        // Clean up markdown
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(parsedData)
        };

    } catch (error) {
        console.error("Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate question" })
        };
    }
};
