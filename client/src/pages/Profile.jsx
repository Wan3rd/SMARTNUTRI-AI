import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { User, Save, LogOut, Edit2, Plus, Trash2, Calendar, ChevronDown, Check } from 'lucide-react';
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

const BRISTOL_TYPES = [
    { type: '1', label: 'Type 1', desc: 'Hard lumps', detail: 'Separate hard lumps, like nuts (hard to pass)' },
    { type: '2', label: 'Type 2', desc: 'Lumpy', detail: 'Sausage-shaped but lumpy' },
    { type: '3', label: 'Type 3', desc: 'Cracked', detail: 'Like a sausage but with cracks on surface' },
    { type: '4', label: 'Type 4', desc: 'Ideal', detail: 'Like a sausage or snake, smooth and soft' },
    { type: '5', label: 'Type 5', desc: 'Soft Blobs', detail: 'Soft blobs with clear-cut edges' },
    { type: '6', label: 'Type 6', desc: 'Mushy', detail: 'Fluffy pieces with ragged edges, a mushy stool' },
    { type: '7', label: 'Type 7', desc: 'Liquid', detail: 'Watery, no solid pieces. Entirely liquid' },
];

const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
};

const getBMIStatus = (bmi) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (bmi < 25) return { label: 'Normal Weight', color: 'text-green-600 bg-green-50 border-green-200' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { label: 'Obese', color: 'text-red-600 bg-red-50 border-red-200' };
};

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

    const [vaccinationTypes, setVaccinationTypes] = useState([]);
    const [childVaccinations, setChildVaccinations] = useState([]);
    const [isAddingVaccine, setIsAddingVaccine] = useState(false);
    const [newVaccine, setNewVaccine] = useState({ typeId: '', date: new Date().toISOString().split('T')[0], notes: '' });

    useEffect(() => {
        // Only fetch child profiles if user is NOT a nutritionist
        if (user?.role !== 'nutritionist') {
            fetchProfile();
            fetchVaccinationData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchVaccinationData = async () => {
        try {
            const [typesRes, listRes] = await Promise.all([
                api.get('/profiles/vaccination-types'),
                profileData.id ? api.get(`/profiles/${profileData.id}/vaccinations`) : Promise.resolve({ data: [] })
            ]);
            setVaccinationTypes(typesRes.data);
            if (listRes.data) setChildVaccinations(listRes.data);
        } catch (err) {
            console.error("Error fetching vaccination data", err);
        }
    };

    // Re-fetch vaccinations if profile ID changes (e.g. after first load)
    useEffect(() => {
        if (profileData.id) {
            api.get(`/profiles/${profileData.id}/vaccinations`)
                .then(res => setChildVaccinations(res.data))
                .catch(err => console.error(err));
        }
    }, [profileData.id]);

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

    const handleAddVaccine = async () => {
        if (!newVaccine.typeId) return;
        try {
            const res = await api.post(`/profiles/${profileData.id}/vaccinations`, {
                vaccination_type_id: newVaccine.typeId,
                date_administered: newVaccine.date,
                notes: newVaccine.notes
            });
            setChildVaccinations([res.data, ...childVaccinations]);
            setIsAddingVaccine(false);
            setNewVaccine({ typeId: '', date: new Date().toISOString().split('T')[0], notes: '' });
        } catch (err) {
            console.error("Error adding vaccine", err);
        }
    };

    const handleDeleteVaccine = async (id) => {
        try {
            await api.delete(`/profiles/vaccinations/${id}`);
            setChildVaccinations(childVaccinations.filter(v => v.id !== id));
        } catch (err) {
            console.error("Error deleting vaccine", err);
        }
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
            <div className="flex items-center gap-6 mb-10 p-6 bg-white dark:bg-white/5 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="h-24 w-24 bg-gradient-to-br from-[var(--color-info)] to-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-blue-500/20">
                    {user.full_name?.charAt(0).toUpperCase() || 'N'}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-3xl font-black text-[var(--color-text-main)] uppercase tracking-tight">{user.full_name}</h1>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-200 dark:border-blue-800">Nutritionist</span>
                    </div>
                    <p className="text-[var(--color-text-muted)] font-medium">Expert Clinical Reviewer Account</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><User size={18} className="text-blue-500" /> Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Full Name</label>
                            <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)]">
                                {user.full_name}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Email Address</label>
                            <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)]">
                                {user.email}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">🔐 Security & System</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex flex-col justify-between h-full min-h-[200px]">
                        <p className="text-xs font-medium text-[var(--color-text-muted)] leading-relaxed italic">
                            Your account is protected with enterprise-grade encryption. Password management is currently handled by the clinical administrator.
                        </p>
                        <Button 
                            variant="outline" 
                            onClick={handleLogout} 
                            className="w-full h-14 rounded-2xl text-red-500 border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all font-black uppercase tracking-widest gap-3"
                        >
                            <LogOut size={20} /> Sign Out
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 p-6 bg-white dark:bg-white/5 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-[var(--color-primary)]/20">
                        {profileData.childName.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--color-text-main)] uppercase tracking-tight">{profileData.childName || 'Child Profile'}</h1>
                        <p className="text-[var(--color-text-muted)] font-medium italic">Parent: {user?.full_name}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!isEditing ? (
                        <Button 
                            onClick={() => setIsEditing(true)} 
                            className="h-12 px-8 rounded-2xl bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)] transition-all font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-[var(--color-secondary)]/10"
                        >
                            <Edit2 size={18} /> Edit Profile
                        </Button>
                    ) : (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => { setIsEditing(false); fetchProfile(); }}
                                className="h-12 px-6 rounded-2xl border-2 border-[var(--color-divider)] font-black uppercase tracking-widest text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving} 
                                className="h-12 px-8 rounded-2xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                            >
                                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl border-2 font-black uppercase tracking-widest text-center text-xs animate-in slide-in-from-top-4 duration-300 ${
                    message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Profile Form */}
            <div className="grid md:grid-cols-2 gap-8">
                <Card className="h-full border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]"><User size={20} /> Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Child's Name</label>
                            <input
                                type="text"
                                name="childName"
                                value={profileData.childName}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-xl disabled:font-black disabled:uppercase disabled:tracking-tight"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Age (Years)</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={profileData.age}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Gender</label>
                                <select
                                    name="gender"
                                    value={profileData.gender}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight appearance-none cursor-pointer"
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Height (cm)</label>
                                    {!isEditing && (
                                        <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">+1.2cm trend</span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    name="height"
                                    value={profileData.height}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Weight (kg)</label>
                                    {!isEditing && (
                                        <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">+0.5kg trend</span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    name="weight"
                                    value={profileData.weight}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight"
                                />
                            </div>
                        </div>

                        {/* Real-time BMI Display */}
                        {profileData.height && profileData.weight && (
                            <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--color-divider)] bg-[var(--color-bg-page)]/50 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Calculated BMI</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-black text-[var(--color-text-main)]">
                                            {calculateBMI(profileData.weight, profileData.height)}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${getBMIStatus(calculateBMI(profileData.weight, profileData.height)).color}`}>
                                            {getBMIStatus(calculateBMI(profileData.weight, profileData.height)).label}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase max-w-[100px] leading-tight">Pediatric Clinical Estimate</p>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Activity Level</label>
                            <select
                                name="activityLevel"
                                value={profileData.activityLevel}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight appearance-none cursor-pointer"
                            >
                                <option value="sedentary">Sedentary</option>
                                <option value="light">Light</option>
                                <option value="moderate">Moderate</option>
                                <option value="very_active">Very Active</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">🍽️ Dietary & Allergies</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div>
                            <label className="block mb-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Dietary Preferences</label>
                            <div className="flex flex-wrap gap-2.5">
                                {DIETARY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleSelection('dietaryPreferences', option)}
                                        disabled={!isEditing}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all border-2 ${profileData.dietaryPreferences.includes(option)
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)]'
                                            } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:border-[var(--color-primary)] hover:translate-y-[-1px]'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block mb-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Known Allergies</label>
                            <div className="flex flex-wrap gap-2.5">
                                {ALLERGY_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => toggleSelection('allergies', option)}
                                        disabled={!isEditing}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all border-2 ${profileData.allergies.includes(option)
                                            ? 'bg-red-500 text-white border-red-500 shadow-md'
                                            : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)]'
                                            } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:border-red-400 hover:translate-y-[-1px]'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Clinical Data section */}
                <Card className="h-full md:col-span-2 border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">🩺 Advanced Clinical Profile</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Structured Vaccination History</label>
                                    {isEditing && !isAddingVaccine && (
                                        <Button 
                                            onClick={() => setIsAddingVaccine(true)}
                                            className="h-8 px-3 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black uppercase tracking-widest gap-1.5 shadow-md shadow-[var(--color-primary)]/20"
                                        >
                                            <Plus size={14} /> Add Vaccine
                                        </Button>
                                    )}
                                </div>

                                {isAddingVaccine && (
                                    <div className="mb-6 p-5 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-primary)]/30 animate-in zoom-in-95 duration-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Vaccine Type</label>
                                                <select 
                                                    value={newVaccine.typeId}
                                                    onChange={(e) => setNewVaccine({...newVaccine, typeId: e.target.value})}
                                                    className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-white font-bold text-xs outline-none focus:border-[var(--color-primary)]"
                                                >
                                                    <option value="">Select Vaccine...</option>
                                                    {vaccinationTypes.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date Administered</label>
                                                <input 
                                                    type="date"
                                                    value={newVaccine.date}
                                                    onChange={(e) => setNewVaccine({...newVaccine, date: e.target.value})}
                                                    className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-white font-bold text-xs outline-none focus:border-[var(--color-primary)]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 mb-4">
                                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Clinical Notes (Batch #, Provider)</label>
                                            <input 
                                                type="text"
                                                value={newVaccine.notes}
                                                onChange={(e) => setNewVaccine({...newVaccine, notes: e.target.value})}
                                                placeholder="e.g. Batch #12345, Dr. Smith Clinic"
                                                className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-white font-bold text-xs outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" onClick={() => setIsAddingVaccine(false)} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</Button>
                                            <Button onClick={handleAddVaccine} className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black uppercase tracking-widest">Save Record</Button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {childVaccinations.length === 0 ? (
                                        <div className="p-8 text-center border-2 border-dashed border-[var(--color-divider)] rounded-2xl">
                                            <p className="text-xs font-medium text-[var(--color-text-muted)] italic">No vaccination records found for this profile.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {childVaccinations.map(v => (
                                                <div key={v.id} className="group relative flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)] transition-all">
                                                    <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <Check size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-black uppercase tracking-tight text-[var(--color-text-main)] truncate">
                                                            {v.vaccination_types?.name}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] font-bold">
                                                            <Calendar size={12} />
                                                            {new Date(v.date_administered).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        {v.notes && <p className="text-[9px] text-[var(--color-text-muted)] mt-1 truncate italic font-medium">{v.notes}</p>}
                                                    </div>
                                                    {isEditing && (
                                                        <button 
                                                            onClick={() => handleDeleteVaccine(v.id)}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Current Medications</label>
                                <textarea
                                    name="medications"
                                    rows="3"
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-medium text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-sm disabled:font-medium disabled:leading-relaxed resize-none"
                                    placeholder="e.g. Daily multivitamins, Vitamin C, Iron drops..."
                                    value={profileData.medications}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Medical History / Surgical History</label>
                            <textarea
                                name="medicalHistory"
                                rows="3"
                                disabled={!isEditing}
                                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-medium text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-sm disabled:font-medium disabled:leading-relaxed resize-none"
                                placeholder="e.g. History of mild asthma, no previous surgeries..."
                                value={profileData.medicalHistory}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Standard Weigh-in Conditions</label>
                                <input
                                    type="text"
                                    name="weighInConditions"
                                    disabled={!isEditing}
                                    className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-base disabled:font-black disabled:uppercase disabled:tracking-tight"
                                    placeholder="e.g. Morning, Before Breakfast, Wearing Diaper Only"
                                    value={profileData.weighInConditions}
                                    onChange={handleChange}
                                />
                            </div>
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Bristol Stool Scale (Gastrointestinal Assessment)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {BRISTOL_TYPES.map(type => (
                                    <button
                                        key={type.type}
                                        onClick={() => isEditing && setProfileData({...profileData, bristolStoolScale: type.type})}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group ${
                                            profileData.bristolStoolScale === type.type
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg'
                                            : 'bg-[var(--color-bg-page)] border-[var(--color-divider)] hover:border-[var(--color-primary)]'
                                        } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                                    >
                                        <span className="text-xl">
                                            {type.type === '1' && '🥜'}
                                            {type.type === '2' && '🍇'}
                                            {type.type === '3' && '🥖'}
                                            {type.type === '4' && '🐍'}
                                            {type.type === '5' && '💧'}
                                            {type.type === '6' && '☁️'}
                                            {type.type === '7' && '🌊'}
                                        </span>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black uppercase tracking-tight">{type.label}</p>
                                            <p className={`text-[8px] font-bold uppercase leading-tight ${profileData.bristolStoolScale === type.type ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                                                {type.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-[var(--color-text-muted)] font-medium bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-[var(--color-divider)]">
                                <strong>Assessment Guide:</strong> {BRISTOL_TYPES.find(t => t.type === profileData.bristolStoolScale)?.detail}
                            </p>
                        </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center pt-10 border-t-2 border-[var(--color-divider)]">
                <Button 
                    variant="outline" 
                    onClick={handleLogout} 
                    className="h-14 px-10 rounded-2xl text-red-500 border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all font-black uppercase tracking-[0.2em] text-xs gap-3 shadow-lg shadow-red-500/5"
                >
                    <LogOut size={20} /> Sign Out
                </Button>
            </div>
        </div>
    );
}
