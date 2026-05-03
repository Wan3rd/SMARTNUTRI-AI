-- Migration V2: Nutritionist Governance & Image Tracking

-- 1. Update Users with Roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'parent';
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_id VARCHAR(50);

-- 2. Nutritionist-Client mapping
CREATE TABLE IF NOT EXISTS nutritionist_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nutritionist_id, parent_id)
);

-- 3. Nutrition Rules
CREATE TABLE IF NOT EXISTS nutrition_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    rule_definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Image-Based Meal Logs
CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    ai_analysis JSONB,
    nutritionist_review JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_meal_logs_profile ON meal_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_rules_profile ON nutrition_rules(profile_id);
CREATE INDEX IF NOT EXISTS idx_nutritionist_clients_nutri ON nutritionist_clients(nutritionist_id);
