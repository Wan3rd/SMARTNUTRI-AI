/**
 * Production Switch Configuration
 * Toggle IS_PRODUCTION to true before pushing to GitHub/Production.
 */
export const IS_PRODUCTION = true;

export const config = {
    isProduction: IS_PRODUCTION,
    client: {
        // Your production frontend URL 
        url: IS_PRODUCTION
            ? "https://smartnutri-ai.vercel.app"
            : "http://localhost:5173",
    },
    server: {
        // Your production backend URL (e.g., Heroku, Railway, Render)
        url: IS_PRODUCTION
            ? "https://smartnutri-api.herokuapp.com"
            : "http://localhost:5000",
        apiUrl: IS_PRODUCTION
            ? "https://smartnutri-api.herokuapp.com/api"
            : "http://localhost:5000/api",
    },
    db: {
        // DO NOT put hardcoded passwords here. 
        // This file is tracked by Git. 
        // Database URLs should be managed via .env on the server.
    }
};

export default config;
