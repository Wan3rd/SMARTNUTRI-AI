import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Activity, User, Save, LogOut, Edit2, Plus, Trash2, Calendar, ChevronDown, Check, Camera, Loader2, X, Shield, ShieldAlert, Phone, Building2, BadgeCheck, Users, BarChart3, Stethoscope, Link2, Lock, Eye, EyeOff, FileUp, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { cn, convertHeight, convertWeight } from '../lib/utils';
import { ProfileSkeleton } from '../components/SkeletonShell';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import Notification from '../components/common/Notification';
import ConfirmDialog from '../components/common/ConfirmDialog';
import AddChildModal from '../components/AddChildModal';
import AddClientModal from '../components/AddClientModal';

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
    "Sesame",
    "Mustard",
    "Sulfites",
    "Corn",
    "Celery",
    "Lupin",
    "Molluscs",
    "Garlic",
    "Onions",
    "Chocolate/Cocoa",
    "Strawberries",
    "Citrus Fruits",
    "Kiwi",
    "Pineapple",
    "Honey",
    "Beef",
    "Chicken",
    "Pork",
    "Food Dyes/Additives"
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
        <label className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1 flex items-center gap-1.5">
            {Icon && <Icon size={10} />}{label}
        </label>
        {isEditing ? (
            <input
                type={type}
                value={value}
                onChange={e => onChange(name, e.target.value)}
                placeholder={placeholder}
                className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-xs sm:text-sm focus:border-[var(--color-primary)] outline-none transition-all"
            />
        ) : (
            <div className="p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)] text-xs sm:text-sm min-h-[48px] sm:min-h-[54px] flex items-center">
                {value || <span className="text-[var(--color-text-muted)] italic font-medium text-xs">{placeholder || 'Not set'}</span>}
            </div>
        )}
    </div>
);

export default function Profile() {
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const { user, logout, updateUser } = useAuth();
    const { startLoading, stopLoading } = useLoading();
    const navigate = useNavigate();

    // Redirect admins away from profile page
    useEffect(() => {
        if (user?.role === 'admin') {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);
    const [saving, setSaving] = useState(false);
    const [isInitialSync, setIsInitialSync] = useState(true);
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
        profileImageUrl: '',
        licenseImageUrl: user?.license_image_url || ''
    });
    const [nutriEditing, setNutriEditing] = useState(false);
    const [nutriSaving, setNutriSaving] = useState(false);
    const [nutriMsg, setNutriMsg] = useState({ type: '', text: '' });
    const [clientCount, setClientCount] = useState(null);
    const [isLicenseBlurred, setIsLicenseBlurred] = useState(true);

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
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: true });

    // Multi-Child Support
    const [allProfiles, setAllProfiles] = useState([]);
    const [isAddChildOpen, setIsAddChildOpen] = useState(false);
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [notif, setNotif] = useState({ show: false, type: 'success', message: '' });

    // Photo Crop & Upload States
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropTarget, setCropTarget] = useState('child'); // 'parent' or 'child' or 'nutritionist' or 'license'

    useEffect(() => {
        const fetchInitialData = async () => {
            startLoading('Syncing Clinical Identity...');
            try {
                if (user?.role !== 'nutritionist') {
                    await Promise.all([fetchProfile(), fetchVaccinationData()]);
                    // Fetch parent account data
                    const res = await api.get('/auth/me');
                    setParentData({
                        fullName: res.data.full_name || '',
                        email: res.data.email || '',
                        phone: res.data.phone || '',
                        profileImageUrl: res.data.profile_image_url || ''
                    });
                } else {
                    // Fetch linked client count for nutritionist stats
                    const [clientsRes, authRes] = await Promise.all([
                        api.get('/nutritionist/clients'),
                        api.get('/auth/me')
                    ]);
                    setClientCount(clientsRes.data?.length ?? 0);
                    const data = authRes.data;
                    setNutri(prev => ({
                        ...prev,
                        fullName: data.full_name || user?.full_name || '',
                        email: data.email || user?.email || '',
                        phone: data.phone || '',
                        specialization: data.specialization || 'Pediatric Nutrition',
                        licenseNo: data.license_no || '',
                        clinic: data.clinic || '',
                        profileImageUrl: data.profile_image_url || '',
                        licenseImageUrl: data.license_image_url || ''
                    }));
                }
            } catch (err) {
                console.error("Error fetching initial profile data", err);
            } finally {
                setIsInitialSync(false);
                stopLoading();
            }
        };
        if (user) fetchInitialData();
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
            setNutriMsg({ type: 'success', text: 'Nutritionist professional profile updated' });

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
            setNutriMsg({ type: 'error', text: 'Failed to synchronize clinical profile' });
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
            setParentMsg({ type: 'success', text: 'Account information updated' });

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
            setParentMsg({ type: 'error', text: 'Failed to update account details' });
        } finally {
            setParentSaving(false);
        }
    };

    const handleCancelNutri = () => {
        const isDirty = nutri.fullName !== (user?.full_name || '') ||
                        nutri.phone !== (user?.phone || '') ||
                        nutri.specialization !== (user?.specialization || 'Pediatric Nutrition') ||
                        nutri.licenseNo !== (user?.license_no || '') ||
                        nutri.clinic !== (user?.clinic || '');
        
        if (isDirty) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Professional Edits?',
                message: 'You have unsaved changes in your professional clinical profile. Are you sure you want to discard them?',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setNutriEditing(false);
                    // Reset to user data
                    setNutri(prev => ({
                        ...prev,
                        fullName: user?.full_name || '',
                        phone: user?.phone || '',
                        specialization: user?.specialization || 'Pediatric Nutrition',
                        licenseNo: user?.license_no || '',
                        clinic: user?.clinic || ''
                    }));
                }
            });
        } else {
            setNutriEditing(false);
        }
    };

    const handleCancelParent = () => {
        const isDirty = parentData.fullName !== (user?.full_name || '') ||
                        parentData.phone !== (user?.phone || '');
        
        if (isDirty) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Account Edits?',
                message: 'You have unsaved changes in your account information. Are you sure you want to discard them?',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setParentEditing(false);
                    // Reset to user data
                    setParentData(prev => ({
                        ...prev,
                        fullName: user?.full_name || '',
                        phone: user?.phone || ''
                    }));
                }
            });
        } else {
            setParentEditing(false);
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

    const handleCancelProfile = () => {
        // Find initial state from allProfiles
        const initial = allProfiles.find(p => p.id === profileData.id);
        if (!initial) {
            setIsEditing(false);
            return;
        }

        const isDirty = profileData.childName !== (initial.child_name || '') ||
                        profileData.age !== (initial.age?.toString() || '') ||
                        profileData.height.toString() !== (initial.height_cm?.toString() || '') ||
                        profileData.weight.toString() !== (initial.weight_kg?.toString() || '') ||
                        profileData.medicalHistory !== (initial.medical_history || '');
        
        if (isDirty) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard Profile Edits?',
                message: 'You have unsaved changes to this clinical child profile. Are you sure you want to discard them?',
                onConfirm: () => {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    setIsEditing(false);
                    fetchProfile(profileData.id); // Reset
                }
            });
        } else {
            setIsEditing(false);
        }
    };

    const fetchProfile = async (specificProfileId = null) => {
        try {
            const res = await api.get('/profiles');
            if (res.data && res.data.length > 0) {
                // Sort profiles by age (Oldest to Youngest) for a stable UI
                const sortedProfiles = [...res.data].sort((a, b) => {
                    if (!a.date_of_birth) return 1;
                    if (!b.date_of_birth) return -1;
                    return new Date(a.date_of_birth) - new Date(b.date_of_birth);
                });

                setAllProfiles(sortedProfiles);

                // If specific ID requested, find it, otherwise use first (or existing)
                const profile = specificProfileId
                    ? res.data.find(p => p.id === specificProfileId)
                    : (profileData.id ? (res.data.find(p => p.id === profileData.id) || res.data[0]) : res.data[0]);

                if (!profile) return;

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
            console.error("Error fetching profiles", err);
        }
    };

    const selectProfile = (id) => {
        fetchProfile(id);
    };

    const handleLogout = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Sign Out',
            message: 'Are you sure you want to end your current clinical session?',
            onConfirm: () => {
                logout();
                navigate('/login');
            },
            isDestructive: false
        });
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
            setMessage({ type: 'success', text: 'Vaccination record added' });
        } catch (err) {
            console.error("Error adding vaccine", err);
            setMessage({ type: 'error', text: 'Failed to add immunization record' });
        }
    };

    const handleDeleteVaccine = async (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Vaccination Record',
            message: 'Are you sure you want to permanently remove this immunization record?',
            onConfirm: async () => {
                try {
                    await api.delete(`/profiles/vaccinations/${id}`);
                    setChildVaccinations(childVaccinations.filter(v => v.id !== id));
                    if (user?.role === 'nutritionist') setNutriMsg({ type: 'success', text: 'Removed' });
                    else setMessage({ type: 'success', text: 'Removed' });
                } catch (err) {
                    console.error("Error deleting vaccine", err);
                }
            },
            isDestructive: true
        });
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
            } else if (cropTarget === 'license') {
                const formData = new FormData();
                formData.append('license', croppedBlob, 'license.jpg');

                const res = await api.post('/auth/license-image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                setNutri(prev => ({ ...prev, licenseImageUrl: res.data.user.license_image_url }));
                setNutriMsg({ type: 'success', text: 'Credential document uploaded' });
            } else {
                const formData = new FormData();
                formData.append('photo', croppedBlob, 'profile.jpg');

                const res = await api.post(`/profiles/${profileData.id}/photo`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProfileData(prev => ({ ...prev, profileImageUrl: res.data.profile_image_url }));
            }
            if (cropTarget === 'nutritionist') setNutriMsg({ type: 'success', text: 'Profile photo updated' });
            else if (cropTarget === 'parent') setParentMsg({ type: 'success', text: 'Account photo updated' });
            else setMessage({ type: 'success', text: 'Child profile photo updated' });

            setImageToCrop(null);
        } catch (err) {
            console.error("Error uploading photo", err);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (deleteConfirmName.trim().toLowerCase() !== profileData.childName.trim().toLowerCase()) return;

        setIsDeleting(true);
        try {
            await api.delete(`/profiles/${profileData.id}`);

            // Success cleanup
            setIsDeleteModalOpen(false);
            setDeleteConfirmName('');

            // Refresh profiles list
            const res = await api.get('/profiles');
            setAllProfiles(res.data);

            if (res.data.length > 0) {
                // Fetch the first available profile
                fetchProfile(res.data[0].id);
            } else {
                // Clear selected profile if none left
                setProfileData(null);
                setSelectedProfileId(null);
            }

            setNotif({ show: true, type: 'success', message: 'Profile deleted successfully' });
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
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

            setMessage({ type: 'success', text: 'Child clinical profile updated' });
            setIsEditing(false);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Failed to update clinical profile data' });
        } finally {
            setSaving(false);
        }
    };


    if (isInitialSync) return <ProfileSkeleton />;

    // --- NUTRITIONIST VIEW ---
    if (user?.role === 'nutritionist') {
        const initials = nutri.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'N';
        const memberSince = user.created_at
            ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const handleNutriFieldChange = (name, val) => setNutri(p => ({ ...p, [name]: val }));

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-8 sm:pb-12 px-4 sm:px-0 overflow-x-hidden sm:overflow-x-visible"
            >

                {/* ── HERO BANNER ── */}
                <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl">
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="relative px-6 sm:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 overflow-hidden">
                        {/* Avatar with pulse ring */}
                        <div className="relative flex-shrink-0 group">
                            <div className="absolute inset-0 rounded-3xl bg-white/30 animate-ping opacity-30" style={{ animationDuration: '2.5s' }} />
                            <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden bg-white/20 backdrop-blur-sm rounded-3xl border-2 border-white/40 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-2xl select-none">
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
                                    {user?.status === 'approved' && (
                                        <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-emerald-400 rounded-xl border-2 border-white flex items-center justify-center z-20">
                                            <BadgeCheck size={14} className="text-white" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Name & role */}
                        <div className="flex-1 text-center sm:text-left min-w-0">
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 mb-2 sm:mb-1">
                                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md truncate max-w-full text-center sm:text-left leading-tight">{nutri.fullName}</h1>
                                <span className="px-3 py-1 bg-white/20 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full border border-white/30 backdrop-blur-sm whitespace-nowrap">
                                    Nutritionist
                                </span>
                            </div>
                            <p className="text-blue-100 font-medium text-xs sm:text-sm truncate">{nutri.specialization} &bull; {nutri.clinic || 'SmartNutri Clinical'}</p>
                        </div>

                        {/* Member since pill */}
                        <div className="flex-shrink-0 text-center w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="px-4 sm:px-5 py-2 sm:py-3 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/25 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0">
                                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest sm:mb-0.5">Member Since:</p>
                                <p className="text-lg sm:text-xl font-black text-white">{memberSince}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── STATS ROW ── */}
                <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 sm:gap-4">
                    {[
                        { label: 'Active Clients', value: clientCount ?? '—', icon: Users, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Role', value: 'Clinical', icon: Stethoscope, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
                        {
                            label: 'Status',
                            value: user?.status === 'approved' ? 'Verified' : 'Pending',
                            icon: user?.status === 'approved' ? Shield : ShieldAlert,
                            color: user?.status === 'approved'
                                ? 'text-violet-600 bg-violet-50 dark:bg-violet-900/20'
                                : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                        },
                    ].map(stat => (
                        <motion.div
                            whileHover={{ y: -5, transition: { duration: 0.2 } }}
                            key={stat.label}
                            className="p-3 sm:p-5 bg-white dark:bg-white/5 rounded-2xl sm:rounded-3xl border-2 border-[var(--color-divider)] shadow-sm flex flex-col items-center gap-1 sm:gap-2 hover:shadow-md transition-all"
                        >
                            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <p className="text-lg sm:text-2xl font-black text-[var(--color-text-main)] leading-none mt-1 sm:mt-0 text-center">{stat.value}</p>
                            <p className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-tighter sm:tracking-widest text-center leading-tight truncate w-full px-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <Notification
                    show={!!nutriMsg.text}
                    type={nutriMsg.type}
                    message={nutriMsg.text}
                    onClose={() => setNutriMsg({ type: '', text: '' })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ── PROFESSIONAL IDENTITY ── */}
                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)] p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <Stethoscope size={18} className="text-blue-500 shrink-0" /> <span className="truncate">Professional Info</span>
                                </CardTitle>
                                {!nutriEditing ? (
                                    <button
                                        onClick={() => setNutriEditing(true)}
                                        className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-[var(--color-primary)]/20 shadow-sm hover:shadow-md"
                                    >
                                        <Edit2 size={12} /> <span className="hidden sm:inline">Edit Profile</span><span className="sm:hidden">Edit</span>
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancelNutri}
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
                        <CardContent className="p-4 sm:p-5 pt-2 space-y-4">
                            <InfoField label="Full Name" name="fullName" icon={User} placeholder="Your full name" value={nutri.fullName} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Specialization" name="specialization" icon={Stethoscope} placeholder="e.g. Pediatric Nutrition" value={nutri.specialization} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="License / PRC ID No." name="licenseNo" icon={BadgeCheck} placeholder="e.g. PRC-0012345" value={nutri.licenseNo} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Clinic / Institution" name="clinic" icon={Building2} placeholder="e.g. SmartNutri Health Center" value={nutri.clinic} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                            <InfoField label="Contact Number" name="phone" icon={Phone} placeholder="e.g. +63 912 345 6789" type="tel" value={nutri.phone} onChange={handleNutriFieldChange} isEditing={nutriEditing} />
                        </CardContent>
                    </Card>

                    {/* ── LICENSE VERIFICATION ── */}
                    <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)] p-4 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                <ShieldCheck size={18} className="text-emerald-500 shrink-0" /> <span className="truncate">Verification</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                                <Shield className="text-emerald-500 flex-shrink-0 mt-0.5" size={16} />
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">Identity Compliance</p>
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300/70 font-medium leading-relaxed">
                                        Upload a clear photo of your PRC ID or medical license to achieve "Verified" status and gain full clinical authority.
                                    </p>
                                </div>
                            </div>

                            {nutri.licenseImageUrl ? (
                                <div className="space-y-3">
                                    <div className="relative aspect-[3/2] rounded-2xl overflow-hidden border-2 border-[var(--color-divider)] bg-zinc-900 group shadow-inner">
                                        <img
                                            src={nutri.licenseImageUrl}
                                            className={cn(
                                                "w-full h-full object-cover transition-all duration-500",
                                                isLicenseBlurred ? "blur-xl scale-110" : "blur-0 scale-100"
                                            )}
                                            alt="License Document"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-black rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-100 transition-colors shadow-xl">
                                                <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'license')} accept="image/*" />
                                                <Edit2 size={12} /> Replace
                                            </label>
                                        </div>
                                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 sm:gap-2">
                                            <button
                                                onClick={() => setIsLicenseBlurred(!isLicenseBlurred)}
                                                className="p-1.5 sm:p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-md transition-all border border-white/20 shadow-md"
                                                title={isLicenseBlurred ? "Unblur Document" : "Blur Document"}
                                            >
                                                {isLicenseBlurred ? <Eye size={12} className="sm:w-3.5 sm:h-3.5" /> : <EyeOff size={12} className="sm:w-3.5 sm:h-3.5" />}
                                            </button>
                                            <div className="px-1.5 py-1 sm:px-2 sm:py-1 bg-emerald-500 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg flex items-center gap-1">
                                                <CheckCircle2 size={10} className="hidden xs:block" /> Uploaded
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-center text-[var(--color-text-muted)] font-bold uppercase tracking-widest italic">
                                        Current document pending clinical audit
                                    </p>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-[var(--color-divider)] rounded-2xl hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all cursor-pointer group">
                                    <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'license')} accept="image/*" />
                                    <div className="h-14 w-14 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center text-[var(--color-primary)] mb-3 group-hover:scale-110 transition-transform">
                                        <FileUp size={24} />
                                    </div>
                                    <span className="text-xs font-black text-[var(--color-text-main)] uppercase tracking-widest">Upload License Photo</span>
                                    <span className="text-[9px] text-[var(--color-text-muted)] mt-1 font-bold">JPG, PNG or PDF (Max 5MB)</span>
                                </label>
                            )}
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
                            <CardContent className="p-5 pt-2 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="p-3 sm:p-4 bg-[var(--color-bg-page)] rounded-xl sm:rounded-2xl border-2 border-[var(--color-divider)] font-bold text-[var(--color-text-main)] text-xs sm:text-sm flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Link2 size={14} className="text-blue-500" />
                                        </div>
                                        <span className="truncate">{user.email}</span>
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
                                        {user?.status === 'approved' ? (
                                            <span className="ml-auto px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-200 dark:border-emerald-800">Verified</span>
                                        ) : (
                                            <span className="ml-auto px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-200 dark:border-amber-800">Under Audit</span>
                                        )}
                                    </div>
                                </div>

                            </CardContent>
                        </Card>


                        {/* Security & Sign Out */}
                        <Card className="border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                            <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)]">
                                <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                    <Lock size={18} className="text-red-400" /> Security
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 space-y-4">
                                <div className="flex items-start gap-3 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
                                    <Shield size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] sm:text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Your account is secured with enterprise-grade encryption. Contact your clinical administrator to change your password.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleLogout}
                                    className="w-full h-11 sm:h-12 rounded-xl sm:rounded-2xl text-red-500 border-2 border-red-100 hover:bg-red-50 hover:border-red-300 transition-all font-black uppercase tracking-widest gap-2 text-[10px] sm:text-xs"
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
                            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-divider)] p-4 sm:p-6">
                                <CardTitle className="text-[10px] sm:text-sm font-black uppercase tracking-widest">
                                    {cropTarget === 'license' ? 'Adjust Credential Document' : 'Adjust Professional Photo'}
                                </CardTitle>
                                <button onClick={() => setImageToCrop(null)} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X size={18} />
                                </button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="relative h-64 sm:h-80 w-full bg-gray-100">
                                    <Cropper
                                        image={imageToCrop}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={cropTarget === 'license' ? 3 / 2 : 1}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                        cropShape="rect"
                                        showGrid={true}
                                    />
                                </div>
                                <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
                                    <div className="space-y-2 sm:space-y-3">
                                        <label className="text-[9px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Zoom Level</label>
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
                                    <div className="flex gap-3 sm:gap-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setImageToCrop(null)}
                                            className="flex-1 h-11 sm:h-12 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handlePhotoUpload}
                                            disabled={isUploadingPhoto}
                                            className="flex-1 h-11 sm:h-12 rounded-xl sm:rounded-2xl bg-[var(--color-primary)] text-white font-black uppercase tracking-widest text-[10px] sm:text-xs gap-2"
                                        >
                                            {isUploadingPhoto ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
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
                <ConfirmDialog
                    {...confirmDialog}
                    onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                />
            </motion.div>
        );
    }

    // --- PARENT / CHILD VIEW ---
    const handleParentFieldChange = (name, val) => setParentData(p => ({ ...p, [name]: val }));

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 sm:space-y-8 max-w-4xl mx-auto pb-10 px-4 sm:px-0 overflow-x-hidden sm:overflow-x-visible"
        >
            {/* ── PARENT ACCOUNT SECTION ── */}
            <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-divider)] shadow-xl bg-[var(--color-bg-card)]">
                <div className="p-5 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
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

                    <div className="flex-1 text-center sm:text-left space-y-2 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2">
                            <h2 className="text-xl font-black text-[var(--color-text-main)] uppercase tracking-tight truncate w-full text-center sm:text-left">{parentData.fullName || 'Parent Account'}</h2>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">Account Holder</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 sm:gap-4">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5 truncate">
                                <Link2 size={10} className="text-slate-400 flex-shrink-0" /> <span className="truncate">{parentData.email}</span>
                            </p>
                            {parentData.phone && (
                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                                    <Phone size={10} className="text-slate-400" /> {parentData.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {!parentEditing ? (
                            <button
                                onClick={() => setParentEditing(true)}
                                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-[var(--color-primary)]/20 cursor-pointer shadow-sm hover:shadow-md"
                            >Edit Account</button>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleCancelParent}
                                    className="px-4 py-3 sm:py-2 bg-gray-100 dark:bg-white/5 text-[var(--color-text-muted)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer order-2 sm:order-1"
                                >Cancel</button>
                                <button
                                    onClick={handleParentSave}
                                    disabled={parentSaving}
                                    className="px-4 py-3 sm:py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-60 order-1 sm:order-2"
                                >
                                    {parentSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {parentEditing && (
                    <div className="px-5 sm:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <InfoField label="Account Full Name" name="fullName" value={parentData.fullName} onChange={(n, v) => setParentData(p => ({ ...p, fullName: v }))} isEditing={true} />
                        <InfoField label="Contact Phone" name="phone" value={parentData.phone} onChange={(n, v) => setParentData(p => ({ ...p, phone: v }))} isEditing={true} />
                    </div>
                )}

                <Notification
                    show={!!parentMsg.text}
                    type={parentMsg.type}
                    message={parentMsg.text}
                    onClose={() => setParentMsg({ type: '', text: '' })}
                />
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 w-full">
                    <div className="h-[1px] sm:h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-divider)] to-transparent" />
                    <span className="text-[8px] sm:text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em] sm:tracking-[0.3em] whitespace-nowrap sm:whitespace-nowrap text-center">Clinical Child Profiles</span>
                    <div className="h-[1px] sm:h-[2px] flex-1 bg-gradient-to-r from-transparent via-[var(--color-divider)] to-transparent" />
                </div>
                <Button
                    onClick={() => setIsAddChildOpen(true)}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest gap-2 shadow-lg shadow-[var(--color-primary)]/20"
                >
                    <Plus size={16} /> Add Child
                </Button>
            </motion.div>

            {/* Profile Switcher */}
            {allProfiles.length > 1 && (
                <motion.div variants={itemVariants} className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 scrollbar-hide px-0">
                    {allProfiles.map(p => (
                        <button
                            key={p.id}
                            onClick={() => fetchProfile(p.id)}
                            className={cn(
                                "flex-shrink-0 px-4 sm:px-5 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                                profileData.id === p.id
                                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md"
                                    : "bg-white dark:bg-white/5 border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]"
                            )}
                        >
                            {p.child_name}
                        </button>
                    ))}
                </motion.div>
            )}

            {/* Header Section (Child-Focused) */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-4 sm:mb-10 p-5 sm:p-6 bg-white dark:bg-white/5 rounded-3xl border-2 border-[var(--color-divider)] shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                    <div className="relative group">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-3xl flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-xl shadow-[var(--color-primary)]/20 border-4 border-white">
                            {isUploadingPhoto ? (
                                <div className="flex flex-col items-center justify-center bg-black/20 w-full h-full backdrop-blur-sm">
                                    <Loader2 size={24} className="animate-spin text-white" />
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
                                            aspect={cropTarget === 'license' ? 3 / 2 : 1}
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
                    <div className="w-full min-w-0">
                        <h1 className={cn("text-2xl sm:text-3xl font-black text-[var(--color-text-main)] uppercase tracking-tight truncate", user?.privacy_mode && "privacy-blur")}>{profileData.childName || 'Child Profile'}</h1>
                        <p className="text-[10px] sm:text-xs text-[var(--color-text-muted)] font-medium italic truncate">Parent Account &bull; {user?.full_name}</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {!isEditing ? (
                        <Button
                            onClick={() => setIsEditing(true)}
                            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all font-black uppercase tracking-widest text-[9px] sm:text-[10px] gap-2 shadow-md shadow-[var(--color-primary)]/20 flex items-center justify-center border-b-2 border-black/10 active:border-b-0 active:translate-y-[1px] pt-[1px]"
                        >
                            <Edit2 size={14} /> Edit Profile
                        </Button>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-3 w-full">
                            <Button
                                variant="outline"
                                onClick={handleCancelProfile}
                                className="w-full sm:w-auto h-11 px-6 rounded-xl border-2 border-[var(--color-divider)] font-black uppercase tracking-widest text-[10px] order-2 sm:order-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg shadow-[var(--color-primary)]/20 order-1 sm:order-2"
                            >
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>

            <Notification
                show={!!message.text}
                type={message.type}
                message={message.text}
                onClose={() => setMessage({ type: '', text: '' })}
            />

            {/* Profile Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <motion.div variants={itemVariants}>
                    <Card className="h-full border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)] p-5 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]"><User size={20} /> Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Child's Name</label>
                                <input
                                    type="text"
                                    name="childName"
                                    value={profileData.childName}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    className="w-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-xs sm:text-sm focus:border-[var(--color-primary)] outline-none transition-all disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:text-lg sm:disabled:text-xl disabled:font-black disabled:uppercase disabled:tracking-tight"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Height ({user?.measurement_system === 'imperial' ? 'ft/in' : 'cm'})
                                        </label>
                                        {!isEditing && (
                                            <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">+1.2cm trend</span>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="height"
                                            value={profileData.height}
                                            onChange={handleChange}
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                        />
                                    ) : (
                                        <div className="text-base font-black uppercase tracking-tight text-[var(--color-text-main)]">
                                            {user?.measurement_system === 'imperial' ? (
                                                (() => {
                                                    const h = convertHeight(profileData.height, 'imperial');
                                                    return `${h.feet}'${h.inches}"`;
                                                })()
                                            ) : (
                                                `${profileData.height} cm`
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                            Weight ({user?.measurement_system === 'imperial' ? 'lbs' : 'kg'})
                                        </label>
                                        {!isEditing && (
                                            <span className="text-[9px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">+0.5kg trend</span>
                                        )}
                                    </div>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            name="weight"
                                            value={profileData.weight}
                                            onChange={handleChange}
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-bold text-sm focus:border-[var(--color-primary)] outline-none transition-all"
                                        />
                                    ) : (
                                        <div className="text-base font-black uppercase tracking-tight text-[var(--color-text-main)]">
                                            {user?.measurement_system === 'imperial' ? (
                                                `${convertWeight(profileData.weight, 'imperial').value} lbs`
                                            ) : (
                                                `${profileData.weight} kg`
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Real-time BMI Display */}
                            {profileData.height && profileData.weight && (
                                <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--color-divider)] bg-[var(--color-bg-page)]/50 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Calculated BMI</p>
                                        <div className="flex items-center justify-center sm:justify-start gap-3">
                                            <span className="text-2xl sm:text-3xl font-black text-[var(--color-text-main)]">
                                                {calculateBMI(profileData.weight, profileData.height)}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-2 ${getBMIStatus(calculateBMI(profileData.weight, profileData.height)).color}`}>
                                                {getBMIStatus(calculateBMI(profileData.weight, profileData.height)).label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-center sm:text-right border-t sm:border-t-0 border-[var(--color-divider)] pt-3 sm:pt-0 w-full sm:w-auto">
                                        <p className="text-[8px] sm:text-[9px] text-[var(--color-text-muted)] font-bold uppercase max-w-full sm:max-w-[100px] leading-tight mx-auto sm:ml-auto">Pediatric Clinical Estimate</p>
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
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="h-full border-2 border-[var(--color-divider)] rounded-3xl shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)] p-5 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">🍽️ Dietary & Allergies</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-8 space-y-8">
                            <div>
                                <label className="block mb-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Dietary Preferences</label>
                                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                                    {DIETARY_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => toggleSelection('dietaryPreferences', option)}
                                            disabled={!isEditing}
                                            className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-tight transition-all border-2 ${profileData.dietaryPreferences.includes(option)
                                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                                : 'bg-[var(--color-bg-page)] text-[var(--color-text-main)] border-[var(--color-divider)]'
                                                } ${!isEditing ? 'cursor-default' : 'cursor-pointer hover:border-[var(--color-primary)] hover:translate-y-[-1px] active:scale-95'}`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block mb-4 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Known Allergies</label>

                                {isEditing && (
                                    <div className="mb-4 relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className={cn(
                                                "w-full h-11 px-4 flex items-center justify-between rounded-xl border-2 transition-all cursor-pointer bg-[var(--color-bg-page)]",
                                                isDropdownOpen ? "border-red-400 ring-4 ring-red-400/10" : "border-[var(--color-divider)]"
                                            )}
                                        >
                                            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate">
                                                <Plus size={14} className="inline mr-2" /> <span className="truncate">Add Allergy...</span>
                                            </span>
                                            <ChevronDown size={14} className={cn("transition-transform duration-200 text-[var(--color-text-muted)] flex-shrink-0", isDropdownOpen && "rotate-180")} />
                                        </button>

                                        {isDropdownOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="absolute top-full left-0 w-full mt-2 p-2 bg-white dark:bg-slate-900 border-2 border-[var(--color-divider)] rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-thin"
                                                >
                                                    {ALLERGY_OPTIONS.map(option => {
                                                        const isSelected = profileData.allergies.includes(option);
                                                        if (isSelected) return null;

                                                        return (
                                                            <button
                                                                key={option}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (option === 'None') {
                                                                        setProfileData({ ...profileData, allergies: ['None'] });
                                                                    } else {
                                                                        let newAllergies = profileData.allergies.filter(a => a !== 'None');
                                                                        newAllergies.push(option);
                                                                        setProfileData({ ...profileData, allergies: newAllergies });
                                                                    }
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-main)] transition-colors border-l-4 border-transparent hover:border-red-400"
                                                            >
                                                                {option}
                                                            </button>
                                                        );
                                                    })}
                                                    {ALLERGY_OPTIONS.every(o => profileData.allergies.includes(o)) && (
                                                        <div className="p-4 text-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase italic">
                                                            All allergies selected
                                                        </div>
                                                    )}
                                                </motion.div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {(profileData.allergies.length === 0 || (profileData.allergies.length === 1 && profileData.allergies[0] === "None")) ? (
                                        <div className="px-3 py-1.5 rounded-lg border-2 border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20 text-green-600 text-[9px] font-black uppercase tracking-widest">None</div>
                                    ) : (
                                        profileData.allergies.map(allergy => (
                                            <div
                                                key={allergy}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-[0.1em] transition-all animate-in zoom-in-95 duration-200 ${allergy === 'None'
                                                    ? 'bg-green-50 dark:bg-green-950/20 text-green-600 border-green-100 dark:border-green-900/30'
                                                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/30'
                                                    }`}
                                            >
                                                {allergy}
                                                {isEditing && (
                                                    <button
                                                        onClick={() => toggleSelection('allergies', allergy)}
                                                        className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Clinical Data section spanning 2 columns */}
                <motion.div variants={itemVariants} className="md:col-span-2">
                    <Card className="h-full border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-lg">
                        <CardHeader className="bg-gray-50/50 dark:bg-white/5 border-b border-[var(--color-divider)] p-5 sm:p-6">
                            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">
                                <Stethoscope size={18} className="text-blue-500" /> Advanced Clinical Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 sm:p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <div className="mb-6 p-5 bg-[var(--color-bg-page)] rounded-2xl border-2 border-[var(--color-primary)]/30 animate-in zoom-in-95 duration-200 shadow-inner">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Vaccine Type</label>
                                                    <select
                                                        value={newVaccine.typeId}
                                                        onChange={(e) => setNewVaccine({ ...newVaccine, typeId: e.target.value })}
                                                        className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] font-bold text-xs outline-none focus:border-[var(--color-primary)] transition-all"
                                                    >
                                                        <option value="">Select Vaccine...</option>
                                                        {vaccinationTypes.map(t => (
                                                            <option key={t.id} value={t.id} className="bg-[var(--color-bg-card)]">{t.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Date Administered</label>
                                                    <input
                                                        type="date"
                                                        value={newVaccine.date}
                                                        onChange={(e) => setNewVaccine({ ...newVaccine, date: e.target.value })}
                                                        className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] font-bold text-xs outline-none focus:border-[var(--color-primary)] transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 mb-4">
                                                <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Clinical Notes (Batch #, Provider)</label>
                                                <input
                                                    type="text"
                                                    value={newVaccine.notes}
                                                    onChange={(e) => setNewVaccine({ ...newVaccine, notes: e.target.value })}
                                                    placeholder="e.g. Batch #12345, Dr. Smith Clinic"
                                                    className="w-full p-3 rounded-xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] font-bold text-xs outline-none focus:border-[var(--color-primary)] transition-all placeholder:opacity-40"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" onClick={() => setIsAddingVaccine(false)} className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancel</Button>
                                                <Button onClick={handleAddVaccine} className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[9px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20">Save Record</Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {childVaccinations.length === 0 ? (
                                            <div className="p-6 sm:p-8 text-center border-2 border-dashed border-[var(--color-divider)] rounded-2xl">
                                                <p className="text-[10px] sm:text-xs font-medium text-[var(--color-text-muted)] italic">No vaccination records found for this profile.</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                                                {childVaccinations.map(v => (
                                                    <div key={v.id} className="group relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-white/5 rounded-2xl border-2 border-[var(--color-divider)] hover:border-[var(--color-primary)] transition-all">
                                                        <div className="h-9 w-9 sm:h-10 sm:w-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <Check size={18} className="sm:w-5 sm:h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-[var(--color-text-main)] whitespace-normal break-words leading-tight mb-1">
                                                                {v.vaccination_types?.name}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] text-[var(--color-text-muted)] font-bold">
                                                                <Calendar size={10} className="flex-shrink-0" />
                                                                {new Date(v.date_administered).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </div>
                                                            {v.notes && <p className="text-[9px] text-[var(--color-text-muted)] mt-2 whitespace-normal break-words italic font-medium border-l-2 border-[var(--color-divider)] pl-2">{v.notes}</p>}
                                                        </div>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => handleDeleteVaccine(v.id)}
                                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0"
                                                            >
                                                                <Trash2 size={14} />
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
                                    {isEditing ? (
                                        <textarea
                                            name="medications"
                                            rows="4"
                                            className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-medium text-sm focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                                            placeholder="e.g. Daily multivitamins, Vitamin C, Iron drops..."
                                            value={profileData.medications}
                                            onChange={handleChange}
                                        />
                                    ) : (
                                        <div className="p-0 text-sm font-medium text-[var(--color-text-main)] leading-relaxed min-h-[1.5rem]">
                                            {profileData.medications || <span className="text-[var(--color-text-muted)] italic opacity-50">No medications listed</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest ml-1">Medical History / Surgical History</label>
                                {isEditing ? (
                                    <textarea
                                        name="medicalHistory"
                                        rows="4"
                                        className="w-full p-4 rounded-2xl border-2 border-[var(--color-divider)] bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-medium text-sm focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                                        placeholder="e.g. History of mild asthma, no previous surgeries..."
                                        value={profileData.medicalHistory}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <div className="p-0 text-sm font-medium text-[var(--color-text-main)] leading-relaxed min-h-[1.5rem]">
                                        {profileData.medicalHistory || <span className="text-[var(--color-text-muted)] italic opacity-50">No medical history provided</span>}
                                    </div>
                                )}
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
                                                onClick={() => isEditing && setProfileData({ ...profileData, bristolStoolScale: type.type })}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group ${profileData.bristolStoolScale === type.type
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
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-red-500/10">
                <div className="flex flex-col md:flex-row items-center justify-between p-5 bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-2xl gap-4">
                    <div>
                        <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Danger Zone</h3>
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mt-0.5 opacity-80">Permanently delete this child's clinical record</p>
                    </div>
                    <Button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="h-11 px-6 rounded-xl bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/30 transition-all font-black uppercase tracking-widest text-[9px] gap-2 shadow-sm"
                    >
                        <Trash2 size={14} /> Delete Profile
                    </Button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex justify-center pt-10 border-t-2 border-[var(--color-divider)]">
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="h-14 px-10 rounded-2xl text-red-500 border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all font-black uppercase tracking-[0.2em] text-xs gap-3 shadow-lg shadow-red-500/5"
                >
                    <LogOut size={20} /> Sign Out
                </Button>
            </motion.div>
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                isDestructive={confirmDialog.isDestructive}
            />
            <AddChildModal
                isOpen={isAddChildOpen}
                onClose={() => setIsAddChildOpen(false)}
                onChildAdded={() => fetchProfile()}
            />
            <AddClientModal
                isOpen={isAddClientOpen}
                onClose={() => setIsAddClientOpen(false)}
                onClientAdded={() => {
                    setNotif({ show: true, type: 'success', message: 'Client link request sent!' });
                }}
            />

            {/* Delete Profile Confirmation Modal */}
            {isDeleteModalOpen && profileData.id && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md animate-in zoom-in duration-300">
                        <Card className="border border-[var(--color-divider)] rounded-[32px] overflow-hidden shadow-2xl bg-white dark:bg-gray-900">
                            <div className="p-8 pb-0 flex flex-col items-center text-center relative">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-[var(--color-text-muted)]">
                                    <X size={20} />
                                </button>
                                <div className="h-16 w-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4 border-2 border-red-100 dark:border-red-500/20">
                                    <Trash2 size={32} className="text-red-500" />
                                </div>
                                <h2 className="text-2xl font-black uppercase tracking-tight text-red-600">Delete Profile?</h2>
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mt-1">Irreversible Clinical Action</p>
                            </div>
                            <CardContent className="p-8 space-y-6">
                                <div className="p-4 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100/50 dark:border-red-500/10">
                                    <p className="text-xs font-bold text-red-700 dark:text-red-400 leading-relaxed">
                                        All clinical data, meal logs, growth charts, and vaccinations for <strong className="underline underline-offset-4">{profileData.childName || 'this profile'}</strong> will be permanently erased.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] ml-1">Type <span className="text-red-600">"{profileData.childName}"</span> to confirm</label>
                                    <input
                                        type="text"
                                        value={deleteConfirmName}
                                        onChange={(e) => setDeleteConfirmName(e.target.value)}
                                        placeholder="Enter child's name"
                                        className="w-full h-14 px-6 rounded-2xl border-2 border-[var(--color-divider)] focus:border-red-500 bg-[var(--color-bg-page)] text-[var(--color-text-main)] font-black outline-none transition-all placeholder:font-bold placeholder:opacity-30"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs border-2 border-[var(--color-divider)]"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={deleteConfirmName.trim().toLowerCase() !== profileData.childName.trim().toLowerCase() || isDeleting}
                                        onClick={handleDeleteProfile}
                                        className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs gap-2 shadow-xl shadow-red-600/20 disabled:opacity-50 disabled:grayscale transition-all"
                                    >
                                        {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Delete Forever'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <Notification
                show={notif.show}
                type={notif.type}
                message={notif.message}
                onClose={() => setNotif({ ...notif, show: false })}
            />

            <ConfirmDialog
                {...confirmDialog}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </motion.div>
    );
}
