import dotenv from 'dotenv';
dotenv.config();

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_SECONDARY,
    process.env.GEMINI_API_KEY_TERTIARY
].filter(Boolean);

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Core function to call Gemini with automatic failover
 */
export const callGemini = async (prompt, imageBase64 = null) => {
    if (API_KEYS.length === 0) {
        throw new Error("No Gemini API keys defined in .env");
    }

    let lastError = null;

    // Try each key in sequence until one works
    for (let i = 0; i < API_KEYS.length; i++) {
        const key = API_KEYS[i];
        
        try {
            const body = {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            };

            // Add image if provided
            if (imageBase64) {
                body.contents[0].parts.push({
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: imageBase64
                    }
                });
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${key}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );

            const data = await response.json();

            // If we hit a rate limit (429), high demand (503), or quota error, try the next key
            const isOverloaded = response.status === 429 || response.status === 503;
            const isQuotaExceeded = data.error && (data.error.message.includes('quota') || data.error.status === 'RESOURCE_EXHAUSTED');
            const isHighDemand = data.error && data.error.message.toLowerCase().includes('high demand');

            if (isOverloaded || isQuotaExceeded || isHighDemand) {
                console.warn(`Gemini Key ${i + 1} busy or exhausted, trying next key...`);
                continue;
            }

            if (!response.ok || data.error) {
                throw new Error(data.error?.message || `API Error: ${response.status}`);
            }

            const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!output) throw new Error("AI returned empty response");

            return output;

        } catch (err) {
            console.error(`Gemini Key ${i + 1} Failed:`, err.message);
            lastError = err;
            // Only continue to next key if it's a rate limit or network issue
            if (err.message.includes('429') || err.message.includes('quota')) continue;
            throw err; // For other errors, stop immediately
        }
    }

    throw new Error(`All Gemini API keys failed. Last error: ${lastError?.message}`);
};

/**
 * Standard text generation
 */
export const generateText = async (prompt) => {
    return await callGemini(prompt);
};

/**
 * Specialized meal analysis (centralized from routes)
 */
export const analyzeMealImage = async (imageBase64, prompt) => {
    const raw = await callGemini(prompt, imageBase64);
    // Extract JSON from markdown if present
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI output as JSON");
    return JSON.parse(jsonMatch[0]);
};

/**
 * Standard nutrient parser
 */
export const parseTextToNutrients = async (text) => {
    if (!text || text.trim() === '') return [];
    
    const prompt = `Convert the following list of food ingredients into a JSON array of objects. 
    Include estimated weight in grams and macros.
    Text: "${text}"
    Output Format: [{"name": "...", "weight_g": 15, "macros_per_serving": {"calories": 100, "protein_g": 0, "carbs_g": 0, "fat_g": 11, "sugar_g": 0, "sodium_mg": 0}}]
    Only output valid JSON.`;

    try {
        return await analyzeMealImage(null, prompt);
    } catch (err) {
        console.error("Failed to parse hidden ingredients via AI", err);
        return [];
    }
};
