import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { User, Save, LogOut, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

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

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isEditing, setIsEditing] = useState(false);

    // Using string 'null' or empty string for uninitialized prevents uncontrolled/controlled warnings
    const [profileData, setProfileData] = useState({
        id: '',
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

    useEffect(() => {
        // Only fetch child profiles if user is NOT a nutritionist
        if (user?.role !== 'nutritionist') {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profiles');
            if (res.data && res.data.length > 0) {
                const profile = res.data[0];

                // Calculate age from DOB
                let age = '';
                if (profile.date_of_birth) {
                    const dob = new Date(profile.date_of_birth);
                    const diff = Date.now() - dob.getTime();
                    age = Math.abs(new Date(diff).getUTCFullYear() - 1970).toString();
                }

                setProfileData({
                    id: profile.id,
                    childName: profile.child_name || '',
                    age: age,
                    gender: profile.gender || 'Male',
                    height: profile.height_cm || '',
                    weight: profile.weight_kg || '',
                    activityLevel: profile.activity_level || 'moderate',
                    allergies: profile.allergies || [],
                    // Handle if preferences comes as string or null
                    dietaryPreferences: profile.dietary_preferences ? profile.dietary_preferences.split(',').map(s => s.trim()) : [],
                    vaccinations: profile.vaccinations || '',
                    medications: profile.medications || '',
                    weighInConditions: profile.weigh_in_conditions || '',
                    bristolStoolScale: profile.bristol_stool_scale?.toString() || '4',
                    medicalHistory: profile.medical_history || ''
                });
            }
        } catch (err) {
            console.error("Error fetching profile", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const toggleSelection = (field, value) => {
        if (!isEditing) return;

        setProfileData(prev => {
            const current = prev[field];
            const isSelected = current.includes(value);

            if (value === "None" && field === "allergies") {
                return { ...prev, [field]: isSelected ? [] : ["None"] };
            }

            let updated;
            if (isSelected) {
                updated = current.filter(item => item !== value);
            } else {
                updated = [...current.filter(i => i !== "None"), value];
            }
            return { ...prev, [field]: updated };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Calculate rough DOB from age again
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - parseInt(profileData.age || 0));

            await api.put(`/profiles/${profileData.id}`, {
                child_name: profileData.childName,
                date_of_birth: dob.toISOString(),
                gender: profileData.gender,
                height_cm: parseFloat(profileData.height),
                weight_kg: parseFloat(profileData.weight),
                activity_level: profileData.activityLevel,
                allergies: profileData.allergies,
                dietary_preferences: profileData.dietaryPreferences.join(', '),
                vaccinations: profileData.vaccinations,
                medications: profileData.medications,
                weigh_in_conditions: profileData.weighInConditions,
                bristol_stool_scale: parseInt(profileData.bristolStoolScale || 4),
                medical_history: profileData.medicalHistory
            });

            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    // --- NUTRITIONIST VIEW ---
    if (user?.role === 'nutritionist') {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {user.full_name?.charAt(0).toUpperCase() || 'N'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">{user.full_name}</h1>
                        <p className="text-[var(--color-text-muted)]">Professional Nutritionist Account</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User size={20} /> Account Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Full Name</label>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--color-divider)] font-medium">
                                    {user.full_name}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Email Address</label>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-[var(--color-divider)] font-medium">
                                    {user.email}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Role</label>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-100 dark:border-blue-800 font-bold uppercase tracking-wider text-sm inline-block">
                                    {user.role}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">🔐 Security & Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-6">
                                Manage your password and account security settings.
                                (Password reset functionality coming soon).
                            </p>
                            <Button variant="outline" onClick={handleLogout} className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-2">
                                <LogOut size={18} /> Sign Out
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // --- PARENT / CHILD VIEW ---
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-20 w-20 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {profileData.childName.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-secondary)]">{profileData.childName || 'Child Profile'}</h1>
                        <p className="text-[var(--color-text-muted)]">Managed by {user?.full_name}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} className="gap-2 bg-[var(--color-secondary)] text-white hover:bg-gray-700">
                            <Edit2 size={18} /> Edit Profile
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => { setIsEditing(false); fetchProfile(); }}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]">
                                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {message.text}
                </div>
            )}

            {/* Profile Form */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User size={20} /> Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-muted)]">Child's Name</label>
                            <input
                                type="text"
                                name="childName"
                                value={profileData.childName}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Age (Years)</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={profileData.age}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Gender</label>
                                <select
                                    name="gender"
                                    value={profileData.gender}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Height (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={profileData.height}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[var(--color-text-muted)]">Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={profileData.weight}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[var(--color-text-muted)]">Activity Level</label>
                            <select
                                name="activityLevel"
                                value={profileData.activityLevel}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                            >
                                <option value="sedentary">Sedentary</option>
                                <option value="light">Light</option>
                                <option value="moderate">Moderate</option>
                                <option value="very_active">Very Active</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">🍽️ Dietary & Allergies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <label className="block mb-3 text-sm font-medium text-[var(--color-text-muted)]">Dietary Preferences</label>
                            <div className="flex flex-wrap gap-2">
                                {DIETARY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleSelection('dietaryPreferences', option)}
                                        disabled={!isEditing}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border cursor-pointer ${profileData.dietaryPreferences.includes(option)
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)]'
                                            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:border-[var(--color-primary)]'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block mb-3 text-sm font-medium text-[var(--color-text-muted)]">Allergies</label>
                            <div className="flex flex-wrap gap-2">
                                {ALLERGY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleSelection('allergies', option)}
                                        disabled={!isEditing}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border cursor-pointer ${profileData.allergies.includes(option)
                                            ? 'bg-red-500 text-white border-red-500'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)]'
                                            } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'hover:border-red-400'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* New Clinical Data section */}
                <Card className="h-full md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">🩺 Clinical Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Vaccinations History</label>
                                <textarea
                                    name="vaccinations"
                                    rows="2"
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                    placeholder="e.g. Fully vaccinated"
                                    value={profileData.vaccinations}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Current Medications</label>
                                <textarea
                                    name="medications"
                                    rows="2"
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                    placeholder="e.g. Multivitamins, Iron supplements"
                                    value={profileData.medications}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Medical History / Conditions</label>
                            <textarea
                                name="medicalHistory"
                                rows="2"
                                disabled={!isEditing}
                                className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                placeholder="e.g. History of asthma, digestive issues..."
                                value={profileData.medicalHistory}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Weigh-in Conditions</label>
                                <input
                                    type="text"
                                    name="weighInConditions"
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                    placeholder="e.g. Fasted, Morning"
                                    value={profileData.weighInConditions}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-[var(--color-text-muted)]">Bristol Stool Chart (1-7)</label>
                                <select
                                    name="bristolStoolScale"
                                    disabled={!isEditing}
                                    className="w-full mt-1 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-black/40 text-gray-900 dark:text-gray-100 disabled:opacity-60"
                                    value={profileData.bristolStoolScale}
                                    onChange={handleChange}
                                >
                                    <option value="1">Type 1 (Hard lumps)</option>
                                    <option value="2">Type 2 (Lumpy sausage)</option>
                                    <option value="3">Type 3 (Sausage with cracks)</option>
                                    <option value="4">Type 4 (Smooth, soft sausage - Ideal)</option>
                                    <option value="5">Type 5 (Soft blobs)</option>
                                    <option value="6">Type 6 (Mushy consistency)</option>
                                    <option value="7">Type 7 (Liquid, no solid pieces)</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center pt-8 border-t border-[var(--color-divider)]">
                <Button variant="outline" onClick={handleLogout} className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-2">
                    <LogOut size={18} /> Sign Out
                </Button>
            </div>
        </div>
    );
}
