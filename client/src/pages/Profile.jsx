import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { User, Save, LogOut, Edit2, Plus, Trash2, Calendar, ChevronDown, Check, Camera, Loader2, X, Shield, Phone, Building2, BadgeCheck, Users, BarChart3, Stethoscope, Link2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';

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

// Must be defined outside Profile to keep a stable reference across renders
const InfoField = ({ label, name, icon: Icon, placeholder, type = 'text', value, onChange, isEditing }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-1.5">
            {Icon && <Icon size={10} />}{label}
        </label>
        {isEditing ? (
            <input
                type={type}
                value={value}
                onChange={e => onChange(name, e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
            />
        ) : (
            <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)] text-sm min-h-[54px] flex items-center">
                {value || <span className="text-[var(--color-text-muted)] italic font-medium text-xs">{placeholder || 'Not set'}</span>}
            </div>
        )}
    </div>
);

export default function Profile() {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    
    // Redirect admins away from profile page
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isEditing, setIsEditing] = useState(false);

    // Nutritionist-specific state
    const [nutri, setNutri] = useState({
        fullName: user?.full_name || '',
        email: user?.email || '',
        phone: '',
        specialization: 'Pediatric Nutrition',
        licenseNo: '',
        clinic: '',
        profileImageUrl: ''
    });
    const [nutriEditing, setNutriEditing] = useState(false);
    const [nutriSaving, setNutriSaving] = useState(false);
    const [nutriMsg, setNutriMsg] = useState({ type: '', text: '' });
    const [clientCount, setClientCount] = useState(null);

    // Parent Account State
    const [parentData, setParentData] = useState({
        fullName: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        profileImageUrl: user?.profile_image_url || ''
    });
    const [parentEditing, setParentEditing] = useState(false);
    const [parentSaving, setParentSaving] = useState(false);
    const [parentMsg, setParentMsg] = useState({ type: '', text: '' });

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
        medicalHistory: '',
        profileImageUrl: ''
    });

    const [childVaccinations, setChildVaccinations] = useState([]);
    const [vaccinationTypes, setVaccinationTypes] = useState([]);
    const [isAddingVaccine, setIsAddingVaccine] = useState(false);
    const [newVaccine, setNewVaccine] = useState({ typeId: '', date: new Date().toISOString().split('T')[0], notes: '' });

    // Photo Crop & Upload States
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropTarget, setCropTarget] = useState('child'); // 'parent' or 'child' or 'nutritionist'

    useEffect(() => {
        if (user?.role !== 'nutritionist') {
            fetchProfile();
            fetchVaccinationData();
            // Fetch parent account data
            api.get('/auth/me').then(res => {
                setParentData({
                    fullName: res.data.full_name || '',
                    email: res.data.email || '',
                    phone: res.data.phone || '',
                    profileImageUrl: res.data.profile_image_url || ''
                });
            }).catch(err => console.error("Error fetching parent account", err));
        } else {
            // Fetch linked client count for nutritionist stats
            api.get('/nutritionist/clients').then(res => setClientCount(res.data?.length ?? 0)).catch(() => setClientCount(0));
            // Fetch nutritionist profile from backend
            api.get('/auth/me').then(res => {
                const data = res.data;
                setNutri(prev => ({
                    ...prev,
                    fullName: data.full_name || user?.full_name || '',
                    email: data.email || user?.email || '',
                    phone: data.phone || '',
                    specialization: data.specialization || 'Pediatric Nutrition',
                    licenseNo: data.license_no || '',
                    clinic: data.clinic || '',
                    profileImageUrl: data.profile_image_url || ''
                }));
            }).catch(err => console.error("Error fetching nutritionist profile", err))
            .finally(() => setLoading(false));
        }
    }, [user]);

    const handleNutriSave = async () => {
        setNutriSaving(true);
        setNutriMsg({ type: '', text: '' });
        try {
            const res = await api.put('/auth/profile', {
                full_name: nutri.fullName,
                phone: nutri.phone,
                specialization: nutri.specialization,
                license_no: nutri.licenseNo,
                clinic: nutri.clinic,
                profile_image_url: nutri.profileImageUrl
            });
            setNutriMsg({ type: 'success', text: 'Professional info saved to cloud!' });
            
            // Sync with global auth state
            if (updateUser) {
                updateUser({
                    ...user,
                    full_name: nutri.fullName,
                    profile_image_url: nutri.profileImageUrl
                });
            }
            
            setNutriEditing(false);
        } catch (err) {
            console.error(err);
            setNutriMsg({ type: 'error', text: 'Failed to save to server.' });
        } finally {
            setNutriSaving(false);
        }
    };

    const handleParentSave = async () => {
        setParentSaving(true);
        setParentMsg({ type: '', text: '' });
        try {
            await api.put('/auth/profile', {
                full_name: parentData.fullName,
                phone: parentData.phone,
                profile_image_url: parentData.profileImageUrl
            });
            setParentMsg({ type: 'success', text: 'Account updated successfully!' });
            
            if (updateUser) {
                updateUser({
                    ...user,
                    full_name: parentData.fullName,
                    profile_image_url: parentData.profileImageUrl
                });
            }
            setParentEditing(false);
        } catch (err) {
            console.error(err);
            setParentMsg({ type: 'error', text: 'Failed to update account.' });
        } finally {
            setParentSaving(false);
        }
    };

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
                    medicalHistory: profile.medical_history || '',
                    profileImageUrl: profile.profile_image_url || ''
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

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = (e, target = 'child') => {
        const file = e.target.files[0];
        if (!file) return;

        setCropTarget(target);
        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setImageToCrop(reader.result);
        });
        reader.readAsDataURL(file);
    };

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handlePhotoUpload = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setIsUploadingPhoto(true);
        try {
            const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
            
            if (cropTarget === 'nutritionist' || cropTarget === 'parent') {
                // For account photos, we use FormData to avoid payload size issues
                const formData = new FormData();
                formData.append('photo', croppedBlob, 'account.jpg');

                const res = await api.post('/auth/photo', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                const newUrl = res.data.profile_image_url;
                
                if (cropTarget === 'nutritionist') {
                    setNutri(prev => ({ ...prev, profileImageUrl: newUrl }));
                } else {
                    setParentData(prev => ({ ...prev, profileImageUrl: newUrl }));
                }
                
                if (updateUser) {
                    updateUser({ ...user, profile_image_url: newUrl });
                }
            } else {
                const formData = new FormData();
                formData.append('photo', croppedBlob, 'profile.jpg');

                const res = await api.post(`/profiles/${profileData.id}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProfileData(prev => ({ ...prev, profileImageUrl: res.data.profile_image_url }));
            }
            setImageToCrop(null);
        } catch (err) {
            console.error("Error uploading photo", err);
        } finally {
            setIsUploadingPhoto(false);
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
        const initials = nutri.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'N';
        const memberSince = user.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
        const handleNutriFieldChange = (name, val) => setNutri(p => ({ ...p, [name]: val }));

        return (
            <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">

                {/* ── HERO BANNER ── */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl">
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="relative p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6">
                        {/* Avatar with pulse ring */}
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute inset-0 rounded-3xl bg-white/30 animate-ping opacity-30" style={{ animationDuration: '2.5s' }} />
                            <div className="relative h-24 w-24 overflow-hidden bg-white/20 backdrop-blur-sm rounded-3xl border-2 border-white/40 flex items-center justify-center text-white text-3xl font-black shadow-2xl select-none">
                                {isUploadingPhoto ? (
                                    <div className="flex flex-col items-center justify-center bg-black/20 w-full h-full backdrop-blur-sm">
                                        <Loader2 size={32} className="animate-spin text-white" />
                                    </div>
                                ) : nutri.profileImageUrl ? (
                                    <img 
                                        src={nutri.profileImageUrl} 
                                        alt={nutri.fullName} 
                                        className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            {!isUploadingPhoto && (
                                <>
                                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-3xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] z-10">
                                        <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'nutritionist')} accept="image/*" />
                                        <Camera size={28} className="animate-bounce" />
                                        <span className="text-[10px] font-black uppercase tracking-widest mt-1">Change</span>
                                    </label>
                                    <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-emerald-400 rounded-xl border-2 border-white flex items-center justify-center z-20">
                                        <BadgeCheck size={14} className="text-white" />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Name & role */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
                                <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">{nutri.fullName}</h1>
                                <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/30 backdrop-blur-sm">
                                    Nutritionist
                                </span>
                            </div>
                            <p className="text-blue-100 font-medium text-sm">{nutri.specialization} &bull; {nutri.clinic || 'SmartNutri Clinical'}</p>
                        </div>

                        {/* Member since pill */}
                        <div className="flex-shrink-0 text-center">
                            <div className="px-5 py-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/25">
                                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-0.5">Member Since</p>
                                <p className="text-2xl font-black text-white">{memberSince}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── STATS ROW ── */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Active Clients', value: clientCount ?? '—', icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Role', value: 'Clinical', icon: Stethoscope, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Status', value: 'Verified', icon: Shield, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
                    ].map(stat => (
                        <div key={stat.label} className="p-5 bg-white dark:bg-white/5 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-all">
                            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <p className="text-2xl font-black text-[var(--color-text-main)]">{stat.value}</p>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest text-center">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {nutriMsg.text && (
                    <div className={`p-4 rounded-2xl border-2 font-black uppercase tracking-widest text-center text-xs animate-in slide-in-from-top-4 duration-300 ${
                        nutriMsg.type === 'error' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                        {nutriMsg.text}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    {/* ── PROFESSIONAL IDENTITY ── */}
                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <Stethoscope size={18} className="text-blue-500" /> Professional Info
                                </CardTitle>
                                {!nutriEditing ? (
                                    <button
                                        onClick={() => setNutriEditing(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setNutriEditing(false); setNutriMsg({ type: '', text: '' }); }}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-[var(--color-text-muted)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-gray-200"
                                        >Cancel</button>
                                        <button
                                            onClick={handleNutriSave}
                                            disabled={nutriSaving}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-60"
                                        >
                                            {nutriSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            Save
                                        </button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <InfoField label="Full Name" name="fullName" icon={User} placeholder="Your full name" value={nutri.fullName} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Specialization" name="specialization" icon={Stethoscope} placeholder="e.g. Pediatric Nutrition" value={nutri.specialization} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="License / PRC ID No." name="licenseNo" icon={BadgeCheck} placeholder="e.g. PRC-0012345" value={nutri.licenseNo} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Clinic / Institution" name="clinic" icon={Building2} placeholder="e.g. SmartNutri Health Center" value={nutri.clinic} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Contact Number" name="phone" icon={Phone} placeholder="e.g. +63 912 345 6789" type="tel" value={nutri.phone} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                        </CardContent>
                    </Card>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="flex flex-col gap-6">
                        {/* Account Details */}
                        <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                            <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <User size={18} className="text-blue-500" /> Account Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)] text-sm flex items-center gap-3">
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Link2 size={14} className="text-blue-500" />
                                        </div>
                                        {user.email}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Account Type</label>
                                    <div className="p-4 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-divider)] flex items-center gap-3">
                                        <div className="h-8 w-8 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Shield size={14} className="text-violet-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-tight">Nutritionist</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Clinical Reviewer Access</p>
                                        </div>
                                        <span className="ml-auto px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-200 dark:border-emerald-800">Active</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Links */}
                        <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                            <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <BarChart3 size={18} className="text-blue-500" /> Quick Navigation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-2 gap-3">
                                {[
                                    { label: 'My Clients', icon: Users, path: '/clients', color: 'from-emerald-500 to-teal-500' },
                                    { label: 'Dashboard', icon: BarChart3, path: '/', color: 'from-blue-500 to-indigo-500' },
                                ].map(link => (
                                    <button
                                        key={link.label}
                                        onClick={() => navigate(link.path)}
                                        className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-[var(--color-divider)] hover:border-transparent hover:shadow-lg transition-all duration-300 bg-[var(--color-bg-page)] hover:bg-gradient-to-br hover:text-white overflow-hidden relative"
                                        style={{ '--tw-gradient-from': link.color.split(' ')[0].replace('from-', ''), '--tw-gradient-to': link.color.split(' ')[1].replace('to-', '') }}
                                    >
                                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-md`}>
                                            <link.icon size={18} className="text-white" />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-main)] group-hover:text-[var(--color-text-main)] transition-colors">{link.label}</span>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Security & Sign Out */}
                        <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                            <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <Lock size={18} className="text-red-400" /> Security
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
                                    <Shield size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Your account is secured with enterprise-grade encryption. Contact your clinical administrator to change your password.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="w-full h-12 rounded-2xl text-red-500 border-2 border-red-100 hover:bg-red-50 hover:border-red-300 transition-all font-black uppercase tracking-widest gap-2 text-xs"
                                >
                                    <LogOut size={16} /> Sign Out
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Image Cropper Modal */}
                {imageToCrop && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <Card className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border-none shadow-2xl">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-divider)] p-6">
                                <CardTitle className="text-sm font-black uppercase tracking-widest">Adjust Professional Photo</CardTitle>
                                <button onClick={() => setImageToCrop(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={20} />
                                </button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="relative h-80 w-full bg-gray-100">
                                    <Cropper
                                        image={imageToCrop}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                        cropShape="rect"
                                        showGrid={true}
                                    />
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Zoom Level</label>
                                        <input
                                            type="range"
                                            value={zoom}
                                            min={1}
                                            max={3}
                                            step={0.1}
                                            onChange={(e) => setZoom(e.target.value)}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setImageToCrop(null)}
                                            className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            onClick={handlePhotoUpload}
                                            disabled={isUploadingPhoto}
                                            className="flex-1 h-12 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-xs gap-2"
                                        >
                                            {isUploadingPhoto ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Saving...
                                                </>
                                            ) : 'Save Photo'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    // --- PARENT / CHILD VIEW ---
    const handleParentFieldChange = (name, val) => setParentData(p => ({ ...p, [name]: val }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
            {/* ── PARENT ACCOUNT SECTION ── */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl bg-[var(--color-bg-card)]">
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                    {/* Parent Avatar */}
                    <div className="relative flex-shrink-0 group">
                        <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white shadow-lg flex items-center justify-center text-slate-400 text-2xl font-black">
                            {parentData.profileImageUrl ? (
                                <img src={parentData.profileImageUrl} alt="Parent" className="h-full w-full object-cover" />
                            ) : (
                                <User size={32} />
                            )}
                        </div>
                        <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                            <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'parent')} accept="image/*" />
                            <Camera size={20} />
                        </label>
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <h2 className="text-xl font-black text-[var(--color-text-main)] uppercase tracking-tight">{parentData.fullName || 'Parent Account'}</h2>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700">Account Holder</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                <Link2 size={10} className="text-slate-400" /> {parentData.email}
                            </p>
                            {parentData.phone && (
                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                    <Phone size={10} className="text-slate-400" /> {parentData.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!parentEditing ? (
                            <button
                                onClick={() => setParentEditing(true)}
                                className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10"
                            >Edit Account</button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setParentEditing(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >Cancel</button>
                                <button
                                    onClick={handleParentSave}
                                    disabled={parentSaving}
                                    className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-60"
                                >
                                    {parentSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {parentEditing && (
                    <div className="px-8 pb-8 grid md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <InfoField label="Account Full Name" name="fullName" value={parentData.fullName} onChange={(n, v) => setParentData(p => ({ ...p, fullName: v }))} isEditing={true} />
                        <InfoField label="Contact Phone" name="phone" value={parentData.phone} onChange={(n, v) => setParentData(p => ({ ...p, phone: v }))} isEditing={true} />
                    </div>
                )}
                
                {parentMsg.text && (
                    <div className={`mx-8 mb-6 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${parentMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {parentMsg.text}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 px-4">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-divider)] to-transparent" />
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] whitespace-nowrap">Clinical Child Profile</span>
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-divider)] to-transparent" />
            </div>

            {/* Header Section (Child-Focused) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 p-6 bg-white dark:bg-white/5 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="h-24 w-24 overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-[var(--color-primary)]/20 border-4 border-white">
                            {isUploadingPhoto ? (
                                <div className="flex flex-col items-center justify-center bg-black/20 w-full h-full backdrop-blur-sm">
                                    <Loader2 size={32} className="animate-spin text-white" />
                                </div>
                            ) : profileData.profileImageUrl ? (
                                <img 
                                    src={profileData.profileImageUrl} 
                                    alt={profileData.childName} 
                                    className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500"
                                />
                            ) : (
                                profileData.childName.charAt(0).toUpperCase() || 'C'
                            )}
                        </div>
                        {isEditing && !isUploadingPhoto && (
                            <>
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-3xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                    <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'child')} accept="image/*" />
                                    <Camera size={28} className="animate-bounce" />
                                    <span className="text-[10px] font-black uppercase tracking-widest mt-1">Change</span>
                                </label>
                                <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-[var(--color-primary)] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                                    <Camera size={14} />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Image Cropper Modal */}
                    {imageToCrop && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <Card className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border-none shadow-2xl">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-divider)] p-6">
                                    <CardTitle className="text-sm font-black uppercase tracking-widest">Adjust Profile Photo</CardTitle>
                                    <button onClick={() => setImageToCrop(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                        <X size={20} />
                                    </button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="relative h-80 w-full bg-gray-100">
                                        <Cropper
                                            image={imageToCrop}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={1}
                                            onCropChange={setCrop}
                                            onCropComplete={onCropComplete}
                                            onZoomChange={setZoom}
                                            cropShape="rect"
                                            showGrid={true}
                                        />
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Zoom Level</label>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                onChange={(e) => setZoom(e.target.value)}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setImageToCrop(null)}
                                                className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                onClick={handlePhotoUpload}
                                                disabled={isUploadingPhoto}
                                                className="flex-1 h-12 rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-xs gap-2"
                                            >
                                                {isUploadingPhoto ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : 'Save Photo'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
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
