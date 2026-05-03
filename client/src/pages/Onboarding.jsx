import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const DIETARY_OPTIONS = [
    "Omnivore (No restrictions)",
    "Vegetarian",
    "Vegan",
    "Halal",
    "Kosher",
    "Gluten-Free",
    "Lactose-Free",
    "Pescatarian"
];

const ALLERGY_OPTIONS = [
    "None",
    "Peanuts",
    "Tree Nuts",
    "Milk/Dairy",
    "Eggs",
    "Wheat/Gluten",
    "Soy",
    "Fish",
    "Shellfish",
    "Sesame"
];

export default function Onboarding() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        childName: '',
        age: '',
        gender: 'Male',
        height: '',
        weight: '',
        activityLevel: 'moderate',
        allergies: [],
        dietaryPreferences: [],
        vaccinations: '',
        medications: '',
        weighInConditions: '',
        bristolStoolScale: '4',
        medicalHistory: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleSelection = (field, value) => {
        setFormData(prev => {
            const current = prev[field];
            const isSelected = current.includes(value);

            if (value === "None" && field === "allergies") {
                // If "None" selected, clear others. If unselected, just clear.
                return { ...prev, [field]: isSelected ? [] : ["None"] };
            }

            let updated;
            if (isSelected) {
                updated = current.filter(item => item !== value);
            } else {
                // If selecting distinct value, remove "None" if present
                updated = [...current.filter(i => i !== "None"), value];
            }

            return { ...prev, [field]: updated };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Prepare dietary preferences as a comma-separated string
            const dietaryString = formData.dietaryPreferences.join(', ');

            await api.post('/profiles', {
                child_name: formData.childName,
                date_of_birth: new Date(new Date().setFullYear(new Date().getFullYear() - parseInt(formData.age || 0))).toISOString(),
                gender: formData.gender,
                height_cm: parseFloat(formData.height),
                weight_kg: parseFloat(formData.weight),
                activity_level: formData.activityLevel,
                allergies: formData.allergies, // Array
                dietary_preferences: dietaryString, // String
                vaccinations: formData.vaccinations,
                medications: formData.medications,
                weigh_in_conditions: formData.weighInConditions,
                bristol_stool_scale: parseInt(formData.bristolStoolScale || 4),
                medical_history: formData.medicalHistory
            });

            // Redirect to Dashboard
            navigate('/');
        } catch (err) {
            console.error(err);
            setError("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--color-bg-page)] p-4 transition-colors duration-300">
            <Card className="w-full max-w-2xl shadow-lg border-0 dark:border dark:border-[var(--color-divider)]">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-[var(--color-secondary)]">Let's setup your profile 📝</CardTitle>
                    <p className="text-[var(--color-text-muted)]">We need a few details to create the perfect nutrition plan for your child.</p>
                </CardHeader>
                <CardContent>
                    {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Child's Name</label>
                                <input
                                    type="text"
                                    name="childName"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="Alice"
                                    value={formData.childName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Gender</label>
                                <select
                                    name="gender"
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    value={formData.gender}
                                    onChange={handleChange}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Age (Years)</label>
                                <input
                                    type="number"
                                    name="age"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="8"
                                    value={formData.age}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Height (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="130"
                                    value={formData.height}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    required
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="30"
                                    value={formData.weight}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Activity Level</label>
                            <select
                                name="activityLevel"
                                className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                value={formData.activityLevel}
                                onChange={handleChange}
                            >
                                <option value="sedentary">Sedentary (Little exercise)</option>
                                <option value="light">Light (Play 1-3 days/week)</option>
                                <option value="moderate">Moderate (Sports 3-5 days/week)</option>
                                <option value="very_active">Very Active (Every day)</option>
                            </select>
                        </div>

                        {/* Dietary Preferences Chips */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--color-text-main)]">Dietary Preferences (Select all that apply)</label>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleSelection('dietaryPreferences', option)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${formData.dietaryPreferences.includes(option)
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Allergies Chips */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-[var(--color-text-main)]">Allergies (Select all that apply)</label>
                            <div className="flex flex-wrap gap-2">
                                {ALLERGY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleSelection('allergies', option)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${formData.allergies.includes(option)
                                            ? 'bg-red-500 text-white border-red-500' // Red for allergies
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)] hover:border-red-400'
                                            }`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Medical History Section */}
                        <div className="space-y-4 pt-4 border-t border-[var(--color-divider)]">
                            <h3 className="text-sm font-bold text-[var(--color-secondary)] uppercase tracking-wider">Medical & Care History</h3>
                            
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Medical History / Conditions</label>
                                <textarea
                                    name="medicalHistory"
                                    className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                    placeholder="e.g. History of asthma, frequent digestive issues..."
                                    rows="2"
                                    value={formData.medicalHistory}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Current Medications</label>
                                    <input
                                        type="text"
                                        name="medications"
                                        className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                        placeholder="e.g. Daily Vitamins, Inhaler"
                                        value={formData.medications}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-[var(--color-text-main)]">Vaccination Status</label>
                                    <input
                                        type="text"
                                        name="vaccinations"
                                        className="w-full p-3 rounded-xl border border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                                        placeholder="e.g. Up to date"
                                        value={formData.vaccinations}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full size-lg text-base mt-2" disabled={loading}>
                            {loading ? 'Saving Profile...' : 'Complete Setup'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
