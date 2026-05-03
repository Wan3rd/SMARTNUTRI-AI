-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Child Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    child_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    height_cm FLOAT,
    weight_kg FLOAT,
    activity_level VARCHAR(50), -- 'sedentary', 'light', 'moderate', 'very_active'
    allergies TEXT[], -- Array of strings e.g., ['peanuts', 'dairy']
    dietary_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Meal Plans Table
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    recipe_name VARCHAR(255) NOT NULL,
    calories INT,
    protein_g INT,
    carbs_g INT,
    fats_g INT,
    image_url TEXT,
    is_consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Daily Progress Logs (Water & Stats)
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    water_intake_glasses INT DEFAULT 0,
    steps_count INT DEFAULT 0, -- From Google Fit
    mood VARCHAR(50),
    notes TEXT,
    UNIQUE(profile_id, date)
);

-- Create simple index for faster queries
CREATE INDEX idx_meal_plans_date ON meal_plans(profile_id, date);
CREATE INDEX idx_daily_logs_date ON daily_logs(profile_id, date);
