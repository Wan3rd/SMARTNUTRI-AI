import dotenv from 'dotenv';
dotenv.config();

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_SECONDARY,
    process.env.GEMINI_API_KEY_TERTIARY
].filter(Boolean);

const MODEL_NAME = 'gemini-2.5-flash';

export const aiStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastUsedKeyIndex: 0,
    failuresByKey: [0, 0, 0]
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Core function to call Gemini with automatic failover, exponential backoff retries, and model fallback.
 */
export const callGemini = async (prompt, imageBase64 = null) => {
    if (API_KEYS.length === 0) {
        throw new Error("No Gemini API keys defined in .env");
    }

    aiStats.totalRequests++;
    let lastError = null;

    // Define the candidate models in priority order
    const modelsToTry = [
        MODEL_NAME, // 'gemini-2.5-flash'
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite'
    ];

    for (const model of modelsToTry) {
        // Try each key in sequence
        for (let i = 0; i < API_KEYS.length; i++) {
            const key = API_KEYS[i];
            aiStats.lastUsedKeyIndex = i;

            // Retry up to 3 times per key with exponential backoff for transient issues
            const maxRetries = 2; // total 3 attempts (initial + 2 retries)
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    if (attempt > 0) {
                        const delay = Math.pow(2, attempt - 1) * 500; // 500ms, then 1000ms
                        console.warn(`Retrying Gemini Key ${i + 1} with model ${model} (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
                        await sleep(delay);
                    }

                    const body = {
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: 0,        // 0 = fully deterministic, same input → same output every time
                            topP: 1,
                            topK: 1
                        }
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
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body),
                        }
                    );

                    const data = await response.json();

                    const isRateLimited = response.status === 429;
                    const isOverloaded = response.status === 503 || (data.error && data.error.message?.toLowerCase().includes('high demand'));
                    const isQuotaExceeded = data.error && (data.error.message?.toLowerCase().includes('quota') || data.error.status === 'RESOURCE_EXHAUSTED');

                    if (isRateLimited || isOverloaded || isQuotaExceeded) {
                        aiStats.failuresByKey[i]++;
                        const reason = isRateLimited ? 'Rate Limited' : isQuotaExceeded ? 'Quota Exceeded' : 'High Demand/Overloaded';
                        console.warn(`Gemini Key ${i + 1} (${model}) ${reason}. Status: ${response.status}`);
                        lastError = new Error(`${reason} (${model}): ${data.error?.message || 'Details unavailable'}`);
                        // Retry this key
                        continue;
                    }

                    if (!response.ok || data.error) {
                        aiStats.failuresByKey[i]++;
                        const errMsg = data.error?.message || `API Error: ${response.status}`;
                        console.error(`Gemini Key ${i + 1} (${model}) API error: ${errMsg}`);
                        lastError = new Error(errMsg);
                        // For 4xx errors other than rate limits, don't retry this key, proceed to next key
                        break;
                    }

                    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (!output) {
                        aiStats.failuresByKey[i]++;
                        lastError = new Error("AI returned empty response");
                        break;
                    }

                    aiStats.successfulRequests++;
                    if (model !== modelsToTry[0]) {
                        console.log(`Successfully recovered using fallback model: ${model} on Key ${i + 1}`);
                    }
                    return output;

                } catch (err) {
                    aiStats.failuresByKey[i]++;
                    console.error(`Gemini Key ${i + 1} (${model}) Network or unexpected error:`, err.message);
                    lastError = err;
                    // Retry this key for network-level exceptions
                    continue;
                }
            }
        }
    }

    aiStats.failedRequests++;
    throw new Error(`All Gemini API keys and fallback models failed. Last error: ${lastError?.message || 'unknown error'}`);
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
    // Extract JSON array or object from markdown if present
    const jsonMatch = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
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
