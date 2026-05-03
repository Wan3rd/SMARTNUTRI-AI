import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash'; // Standardizing on 1.5 Flash for stability

export const generateText = async (prompt) => {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not defined");
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!output) {
            throw new Error("No output from Gemini");
        }

        return output;

    } catch (err) {
        console.error("Gemini Service Error:", err);
        throw err;
    }
};

export const parseTextToNutrients = async (text) => {
    if (!text || text.trim() === '') return [];
    
    const prompt = `Convert the following list of food ingredients into a JSON array of objects. 
    Include estimated weight in grams and macros.
    Text: "${text}"
    Output Format: [{"name": "...", "weight_g": 15, "macros_per_serving": {"calories": 100, "protein_g": 0, "carbs_g": 0, "fat_g": 11, "sugar_g": 0, "sodium_mg": 0}}]
    Only output valid JSON.`;

    try {
        const raw = await generateText(prompt);
        // Clean markdown
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("Failed to parse hidden ingredients via AI", err);
        return [];
    }
};
