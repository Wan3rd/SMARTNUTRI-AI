import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { cn } from '../lib/utils';
import { 
    BookOpen, Calculator, Search, Filter, AlertCircle, CheckCircle2, 
    Info, ArrowRight, Droplet, Flame, Compass, ChevronRight, 
    Activity, ShieldCheck, Heart, User, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- REFERENCE DATA ---

const WHO_BOYS_DATA = {
    0: { weightMedian: 3.3, weightSD: 0.5, heightMedian: 49.9, heightSD: 2.0, bmiMedian: 13.4, bmiSD: 1.0 },
    3: { weightMedian: 6.4, weightSD: 0.7, heightMedian: 61.4, heightSD: 2.1, bmiMedian: 17.0, bmiSD: 1.2 },
    6: { weightMedian: 7.9, weightSD: 0.8, heightMedian: 67.6, heightSD: 2.2, bmiMedian: 17.3, bmiSD: 1.2 },
    9: { weightMedian: 8.9, weightSD: 0.9, heightMedian: 72.0, heightSD: 2.3, bmiMedian: 17.2, bmiSD: 1.2 },
    12: { weightMedian: 9.6, weightSD: 1.0, heightMedian: 75.7, heightSD: 2.4, bmiMedian: 16.8, bmiSD: 1.2 },
    18: { weightMedian: 10.9, weightSD: 1.1, heightMedian: 82.3, heightSD: 2.7, bmiMedian: 16.1, bmiSD: 1.1 },
    24: { weightMedian: 12.2, weightSD: 1.3, heightMedian: 87.8, heightSD: 3.1, bmiMedian: 15.8, bmiSD: 1.1 },
    36: { weightMedian: 14.3, weightSD: 1.6, heightMedian: 96.1, heightSD: 3.6, bmiMedian: 15.5, bmiSD: 1.1 },
    48: { weightMedian: 16.3, weightSD: 1.9, heightMedian: 103.3, heightSD: 4.0, bmiMedian: 15.3, bmiSD: 1.1 },
    60: { weightMedian: 18.3, weightSD: 2.3, heightMedian: 110.0, heightSD: 4.5, bmiMedian: 15.2, bmiSD: 1.1 }
};

const WHO_GIRLS_DATA = {
    0: { weightMedian: 3.2, weightSD: 0.5, heightMedian: 49.1, heightSD: 1.9, bmiMedian: 13.3, bmiSD: 1.0 },
    3: { weightMedian: 5.8, weightSD: 0.6, heightMedian: 59.8, heightSD: 2.0, bmiMedian: 16.2, bmiSD: 1.1 },
    6: { weightMedian: 7.3, weightSD: 0.7, heightMedian: 65.7, heightSD: 2.1, bmiMedian: 16.9, bmiSD: 1.1 },
    9: { weightMedian: 8.2, weightSD: 0.8, heightMedian: 70.1, heightSD: 2.2, bmiMedian: 16.7, bmiSD: 1.1 },
    12: { weightMedian: 8.9, weightSD: 0.9, heightMedian: 74.0, heightSD: 2.3, bmiMedian: 16.3, bmiSD: 1.1 },
    18: { weightMedian: 10.2, weightSD: 1.1, heightMedian: 80.7, heightSD: 2.6, bmiMedian: 15.7, bmiSD: 1.1 },
    24: { weightMedian: 11.5, weightSD: 1.3, heightMedian: 86.4, heightSD: 3.0, bmiMedian: 15.4, bmiSD: 1.1 },
    36: { weightMedian: 13.9, weightSD: 1.6, heightMedian: 95.1, heightSD: 3.5, bmiMedian: 15.3, bmiSD: 1.1 },
    48: { weightMedian: 16.1, weightSD: 2.0, heightMedian: 102.7, heightSD: 4.0, bmiMedian: 15.2, bmiSD: 1.1 },
    60: { weightMedian: 18.2, weightSD: 2.4, heightMedian: 109.4, heightSD: 4.5, bmiMedian: 15.2, bmiSD: 1.2 }
};

const PDRI_TARGETS = [
    { group: "Infants 0 - 5 mo", energy: "490 kcal", protein: "8.5 g", fluid: "Breastfed Only", iron: "0.2 mg", calcium: "200 mg", zinc: "1.1 mg", note: "Exclusive breastfeeding is recommended. Energy based on 93 kcal/kg/day." },
    { group: "Infants 6 - 11 mo", energy: "650 kcal", protein: "11 g", fluid: "800 - 1000 mL", iron: "9.0 mg", calcium: "270 mg", zinc: "2.5 mg", note: "Introduce nutrient-dense complementary foods. Fluid includes milk & solids." },
    { group: "Toddlers 1 - 3 y", energy: "1,070 kcal", protein: "14 g", fluid: "1,300 mL", iron: "8.0 mg", calcium: "500 mg", zinc: "4.1 mg", note: "High calcium needs for skeletal development. Support fat intake for brain development." },
    { group: "Preschoolers 4 - 5 y", energy: "1,350 kcal", protein: "19 g", fluid: "1,600 mL", iron: "10.0 mg", calcium: "550 mg", zinc: "5.1 mg", note: "Encourage colorful vegetables, whole grains, and lean proteins. Fluid includes food water." },
    { group: "Children 6 - 9 y", energy: "1,600 kcal", protein: "27 g", fluid: "1,800 mL", iron: "11.0 mg", calcium: "700 mg", zinc: "6.0 mg", note: "Active growth phase. Essential to meet zinc and iron targets to prevent anemia." },
    { group: "Boys 10 - 12 y", energy: "2,060 kcal", protein: "43 g", fluid: "2,100 mL", iron: "11.0 mg", calcium: "1,000 mg", zinc: "7.7 mg", note: "Pre-pubertal growth spurt starts. Prioritize calcium and high quality proteins." },
    { group: "Girls 10 - 12 y", energy: "1,980 kcal", protein: "40 g", fluid: "1,900 mL", iron: "13.0 mg", calcium: "1,000 mg", zinc: "7.2 mg", note: "Menstruation onset increases iron needs. Ensure adequate Vitamin C for absorption." },
    { group: "Boys 13 - 15 y", energy: "2,700 kcal", protein: "62 g", fluid: "2,400 mL", iron: "15.0 mg", calcium: "1,000 mg", zinc: "10.6 mg", note: "Peak growth acceleration. Energy and mineral demands are at their highest." },
    { group: "Girls 13 - 15 y", energy: "2,170 kcal", protein: "54 g", fluid: "2,000 mL", iron: "21.0 mg", calcium: "1,000 mg", zinc: "8.3 mg", note: "Menstruating girls require high iron. Focus on iron-rich animal proteins and pulses." },
    { group: "Boys 16 - 18 y", energy: "2,980 kcal", protein: "71 g", fluid: "2,600 mL", iron: "14.0 mg", calcium: "1,000 mg", zinc: "10.9 mg", note: "Growth plate consolidation. High protein turnover. Optimize micro & macronutrients." },
    { group: "Girls 16 - 18 y", energy: "2,200 kcal", protein: "57 g", fluid: "2,100 mL", iron: "20.0 mg", calcium: "1,000 mg", zinc: "8.1 mg", note: "Stabilized energy expenditure. Iron intake remains vital. Support healthy fats intake." }
];

const BRISTOL_STOOL_CHART = [
    {
        type: 1,
        title: "Separate Hard Lumps",
        desc: "Severe Constipation",
        transit: "100+ Hours",
        appearance: "Separate hard lumps, like nuts, difficult to pass.",
        indicator: "danger",
        colorClass: "from-red-500/10 to-red-600/5 border-red-500/20 text-red-500",
        badgeColor: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        clinical: "Indicates severe slow-transit constipation, lack of dietary fiber, and chronic dehydration.",
        nutrition: "Increase fluid intake significantly. Introduce high-soluble fiber and prebiotics. Avoid processed foods and excessive dairy. Monitor hydration closely."
    },
    {
        type: 2,
        title: "Sausage-Shaped but Lumpy",
        desc: "Mild Constipation",
        transit: "72 - 100 Hours",
        appearance: "Sausage-shaped stool, but clearly lumpy and dry.",
        indicator: "warning",
        colorClass: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-500",
        badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
        clinical: "Indicates mild slow-transit. The stool is impacted but has managed to aggregate.",
        nutrition: "Increase daily water intake (aim for 1.5-2L for older children). Gradually add whole grains, pears, prunes, and leafy greens to the diet."
    },
    {
        type: 3,
        title: "Sausage with Cracks",
        desc: "Normal / Ideal",
        transit: "48 - 72 Hours",
        appearance: "Like a sausage, but with visible cracks on the surface.",
        indicator: "success",
        colorClass: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-500",
        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        clinical: "Considered normal and healthy. It indicates slight dryness but passes easily.",
        nutrition: "Maintain current diet. Ensure consistent daily hydration to smooth out the surface cracks further."
    },
    {
        type: 4,
        title: "Smooth Sausage or Snake",
        desc: "Optimal / Perfect",
        transit: "24 - 48 Hours",
        appearance: "Like a sausage or snake, smooth and soft to pass.",
        indicator: "success",
        colorClass: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-500",
        badgeColor: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
        clinical: "The golden standard for bowel health. Indicates optimal transit time and gut microbiome health.",
        nutrition: "Maintain current balanced diet. Good ratio of soluble and insoluble fiber intake. Continue healthy hydration habits."
    },
    {
        type: 5,
        title: "Soft Blobs with Clear Edges",
        desc: "Lacking Fiber",
        transit: "18 - 24 Hours",
        appearance: "Soft blobs with clear-cut, defined edges. Passes easily.",
        indicator: "info",
        colorClass: "from-sky-500/10 to-sky-600/5 border-sky-500/20 text-sky-500",
        badgeColor: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
        clinical: "Slightly rapid transit. Normal for children who have multiple bowel movements daily, but could indicate minor fiber lack.",
        nutrition: "Increase soluble fiber (e.g. bananas, applesauce, oats, carrots) to help bulk up the stool matrix."
    },
    {
        type: 6,
        title: "Mushy Stool, Ragged Edges",
        desc: "Mild Diarrhea",
        transit: "10 - 18 Hours",
        appearance: "Fluffy pieces with ragged edges, a mushy, soft consistency.",
        indicator: "warning",
        colorClass: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-500",
        badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
        clinical: "Indicates rapid transit, potential food sensitivity, inflammation, or mild dysbiosis.",
        nutrition: "Temporarily adopt a bland diet (rice, bananas, crackers). Eliminate triggers (heavy lactose, artificial sweeteners, greasy foods). Rehydrate."
    },
    {
        type: 7,
        title: "Entirely Watery & Liquid",
        desc: "Severe Diarrhea",
        transit: "< 10 Hours",
        appearance: "Watery, no solid pieces, entirely liquid consistency.",
        indicator: "danger",
        colorClass: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-500",
        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
        clinical: "Severe rapid transit. High risk of mineral and fluid depletion. Possible bacterial or viral gastroenteritis.",
        nutrition: "Critical: Administer Oral Rehydration Salts (ORS) or electrolyte solutions. Keep feeding small, bland meals. Seek medical attention if persistent."
    }
];

// --- MATH HELPERS FOR CALCULATOR ---

const interpolateData = (age, sex) => {
    const data = sex === 'male' ? WHO_BOYS_DATA : WHO_GIRLS_DATA;
    const ages = Object.keys(data).map(Number).sort((a, b) => a - b);
    
    if (age <= ages[0]) return data[ages[0]];
    if (age >= ages[ages.length - 1]) return data[ages[ages.length - 1]];
    
    let lower = ages[0];
    let upper = ages[1];
    for (let i = 0; i < ages.length - 1; i++) {
        if (age >= ages[i] && age <= ages[i+1]) {
            lower = ages[i];
            upper = ages[i+1];
            break;
        }
    }
    
    const fraction = (age - lower) / (upper - lower);
    const interpolateField = (field) => {
        return data[lower][field] + fraction * (data[upper][field] - data[lower][field]);
    };
    
    return {
        weightMedian: interpolateField('weightMedian'),
        weightSD: interpolateField('weightSD'),
        heightMedian: interpolateField('heightMedian'),
        heightSD: interpolateField('heightSD'),
        bmiMedian: interpolateField('bmiMedian'),
        bmiSD: interpolateField('bmiSD')
    };
};

const zToPercentile = (z) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    const val = z >= 0 ? 1 - p : p;
    return Math.round(val * 100);
};

const getCohortTheme = (group) => {
    if (group.includes('Infants')) {
        return {
            badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
            border: "border-teal-500/20 hover:border-teal-500/50",
            bg: "from-teal-500/5 to-teal-600/5 bg-[var(--color-bg-card)]"
        };
    }
    if (group.includes('Toddlers')) {
        return {
            badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
            border: "border-emerald-500/20 hover:border-emerald-500/50",
            bg: "from-emerald-500/5 to-emerald-600/5 bg-[var(--color-bg-card)]"
        };
    }
    if (group.includes('Preschoolers') || group.includes('Children')) {
        return {
            badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
            border: "border-sky-500/20 hover:border-sky-500/50",
            bg: "from-sky-500/5 to-sky-600/5 bg-[var(--color-bg-card)]"
        };
    }
    // Adolescents
    return {
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
        border: "border-purple-500/20 hover:border-purple-500/50",
        bg: "from-purple-500/5 to-purple-600/5 bg-[var(--color-bg-card)]"
    };
};

export default function ClinicalGuides() {
    const [activeTab, setActiveTab] = useState('who'); // who, pdri, bristol

    // --- WHO Calculator State ---
    const [calcAge, setCalcAge] = useState(24); // default 2 years (24m)
    const [calcSex, setCalcSex] = useState('male');
    const [calcHeight, setCalcHeight] = useState(86);
    const [calcWeight, setCalcWeight] = useState(12);

    // --- PDRI Search State ---
    const [pdriSearch, setPdriSearch] = useState('');
    const [pdriFilter, setPdriFilter] = useState('All'); // All, Infants, Toddlers, Children, Adolescents
    const [selectedPdriRow, setSelectedPdriRow] = useState(null);

    // --- Bristol Chart State ---
    const [bristolFilter, setBristolFilter] = useState('all'); // all, constipation, optimal, diarrhea
    const [selectedBristol, setSelectedBristol] = useState(null);

    // --- Dynamic calculations for WHO Calculator ---
    const results = useMemo(() => {
        if (!calcAge || !calcHeight || !calcWeight) return null;
        
        const ageNum = parseFloat(calcAge);
        const htNum = parseFloat(calcHeight);
        const wtNum = parseFloat(calcWeight);
        
        if (ageNum < 0 || ageNum > 60 || htNum <= 0 || wtNum <= 0) return null;

        const interpolated = interpolateData(ageNum, calcSex);
        const bmi = wtNum / ((htNum / 100) ** 2);

        const weightZ = (wtNum - interpolated.weightMedian) / interpolated.weightSD;
        const heightZ = (htNum - interpolated.heightMedian) / interpolated.heightSD;
        const bmiZ = (bmi - interpolated.bmiMedian) / interpolated.bmiSD;

        const weightPercentile = zToPercentile(weightZ);
        const heightPercentile = zToPercentile(heightZ);
        const bmiPercentile = zToPercentile(bmiZ);

        // Classify statuses
        let weightStatus = "Healthy Weight";
        let weightStatusColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
        if (weightZ < -2) {
            weightStatus = "Severe Underweight";
            weightStatusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        } else if (weightZ < -1) {
            weightStatus = "Underweight";
            weightStatusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
        } else if (weightZ > 2) {
            weightStatus = "Overweight / Obese";
            weightStatusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        } else if (weightZ > 1) {
            weightStatus = "Risk of Overweight";
            weightStatusColor = "text-blue-500 border-blue-500/20 bg-blue-500/5";
        }

        let heightStatus = "Normal Stature";
        let heightStatusColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
        if (heightZ < -2) {
            heightStatus = "Severe Stunting";
            heightStatusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        } else if (heightZ < -1) {
            heightStatus = "Stunted / Short";
            heightStatusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
        } else if (heightZ > 2) {
            heightStatus = "Tall Stature";
            heightStatusColor = "text-blue-500 border-blue-500/20 bg-blue-500/5";
        }

        let bmiStatus = "Normal BMI";
        let bmiStatusColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
        if (bmiZ < -2) {
            bmiStatus = "Severe Wasting";
            bmiStatusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        } else if (bmiZ < -1) {
            bmiStatus = "Wasting / Thinness";
            bmiStatusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
        } else if (bmiZ > 2) {
            bmiStatus = "Obese";
            bmiStatusColor = "text-red-500 border-red-500/20 bg-red-500/5";
        } else if (bmiZ > 1) {
            bmiStatus = "Overweight";
            bmiStatusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
        }

        return {
            bmi: bmi.toFixed(1),
            weightZ: weightZ.toFixed(2),
            heightZ: heightZ.toFixed(2),
            bmiZ: bmiZ.toFixed(2),
            weightPercentile,
            heightPercentile,
            bmiPercentile,
            weightStatus,
            weightStatusColor,
            heightStatus,
            heightStatusColor,
            bmiStatus,
            bmiStatusColor
        };
    }, [calcAge, calcSex, calcHeight, calcWeight]);

    // --- Filter PDRI ---
    const filteredPdri = useMemo(() => {
        return PDRI_TARGETS.filter(item => {
            const matchesSearch = item.group.toLowerCase().includes(pdriSearch.toLowerCase()) || 
                                  item.note.toLowerCase().includes(pdriSearch.toLowerCase());
            
            if (pdriFilter === 'All') return matchesSearch;
            if (pdriFilter === 'Infants') return matchesSearch && item.group.includes('Infants');
            if (pdriFilter === 'Toddlers') return matchesSearch && item.group.includes('Toddlers');
            if (pdriFilter === 'Children') return matchesSearch && (item.group.includes('Preschoolers') || item.group.includes('Children'));
            if (pdriFilter === 'Adolescents') return matchesSearch && (item.group.includes('Boys') || item.group.includes('Girls'));
            return matchesSearch;
        });
    }, [pdriSearch, pdriFilter]);

    // --- Filter Bristol Chart ---
    const filteredBristol = useMemo(() => {
        return BRISTOL_STOOL_CHART.filter(item => {
            if (bristolFilter === 'all') return true;
            if (bristolFilter === 'constipation') return item.type <= 2;
            if (bristolFilter === 'optimal') return item.type === 3 || item.type === 4;
            if (bristolFilter === 'diarrhea') return item.type >= 5;
            return true;
        });
    }, [bristolFilter]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header section */}
            <div className="flex flex-col gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-primary)] font-black uppercase tracking-widest text-xs mb-1">
                        <Sparkles size={14} className="animate-pulse" />
                        Clinical Knowledge Hub
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--color-secondary)]">Clinical Guides & References 📖</h1>
                    <p className="text-[var(--color-text-muted)] mt-1">
                        Interactive clinical charts, growth calculators, and diet recommendation guides.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[var(--color-divider)] overflow-x-auto scrollbar-hide whitespace-nowrap">
                <button
                    onClick={() => setActiveTab('who')}
                    className={cn(
                        "px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2",
                        activeTab === 'who' 
                            ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                >
                    <Calculator size={16} />
                    WHO Growth Vitals
                </button>
                <button
                    onClick={() => setActiveTab('pdri')}
                    className={cn(
                        "px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2",
                        activeTab === 'pdri' 
                            ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                >
                    <BookOpen size={16} />
                    PDRI Daily Targets
                </button>
                <button
                    onClick={() => setActiveTab('bristol')}
                    className={cn(
                        "px-6 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2",
                        activeTab === 'bristol' 
                            ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/5"
                            : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-gray-50 dark:hover:bg-white/5"
                    )}
                >
                    <Activity size={16} />
                    Bristol Stool Consistency
                </button>
            </div>

            {/* Tab Content Panels */}
            <div>
                {activeTab === 'who' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Calculator Column */}
                        <div className="lg:col-span-5 space-y-6">
                            <Card className="border-[var(--color-primary)]/20 shadow-md">
                                <CardHeader className="border-b border-[var(--color-divider)] pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                            <Calculator size={20} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-black">WHO Growth & BMI Calculator</CardTitle>
                                            <p className="text-xs text-[var(--color-text-muted)]">Age range: 0 - 60 months (0 - 5 years)</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    {/* Sex Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Biological Sex</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setCalcSex('male')}
                                                className={cn(
                                                    "py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2",
                                                    calcSex === 'male'
                                                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                                        : "border-[var(--color-divider)] hover:border-gray-400 text-[var(--color-text-muted)]"
                                                )}
                                            >
                                                <User size={14} />
                                                Boy / Male
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCalcSex('female')}
                                                className={cn(
                                                    "py-2.5 rounded-xl font-bold text-sm transition-all border flex items-center justify-center gap-2",
                                                    calcSex === 'female'
                                                        ? "border-rose-600 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 shadow-sm"
                                                        : "border-[var(--color-divider)] hover:border-gray-400 text-[var(--color-text-muted)]"
                                                )}
                                            >
                                                <User size={14} />
                                                Girl / Female
                                            </button>
                                        </div>
                                    </div>

                                    {/* Age Input Slider + Number */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Age (Months)</label>
                                            <span className="text-xs font-bold bg-[var(--color-bg-page)] border border-[var(--color-divider)] px-2 py-0.5 rounded-md text-[var(--color-text-main)]">
                                                {calcAge} months ({Math.floor(calcAge / 12)}y {calcAge % 12}m)
                                            </span>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <input
                                                type="range"
                                                min="0"
                                                max="60"
                                                step="1"
                                                value={calcAge}
                                                onChange={(e) => setCalcAge(parseInt(e.target.value))}
                                                className="flex-1 accent-[var(--color-primary)] cursor-pointer h-2 bg-[var(--color-divider)] rounded-lg appearance-none"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={calcAge}
                                                onChange={(e) => setCalcAge(Math.min(60, Math.max(0, parseInt(e.target.value) || 0)))}
                                                className="w-16 rounded-xl border border-[var(--color-input-border)] px-2 py-1.5 text-center font-bold text-sm focus:outline-none focus:border-[var(--color-primary)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Height & Weight Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Height (cm)</label>
                                            <input
                                                type="number"
                                                min="30"
                                                max="150"
                                                step="0.1"
                                                value={calcHeight}
                                                onChange={(e) => setCalcHeight(parseFloat(e.target.value) || '')}
                                                placeholder="e.g. 86"
                                                className="w-full rounded-xl border border-[var(--color-input-border)] px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-[var(--color-primary)] bg-transparent"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">Weight (kg)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="40"
                                                step="0.1"
                                                value={calcWeight}
                                                onChange={(e) => setCalcWeight(parseFloat(e.target.value) || '')}
                                                placeholder="e.g. 12"
                                                className="w-full rounded-xl border border-[var(--color-input-border)] px-4 py-2.5 font-bold text-sm focus:outline-none focus:border-[var(--color-primary)] bg-transparent"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Standard WHO Information Box */}
                            <div className="p-4 rounded-2xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] text-xs text-[var(--color-text-muted)] space-y-2">
                                <div className="flex gap-2 font-bold text-[var(--color-text-main)] items-center">
                                    <Info size={14} className="text-[var(--color-primary)]" />
                                    Clinical Insight on Z-Scores
                                </div>
                                <p>
                                    Z-scores measure how many standard deviations a child is from the WHO Median. 
                                    A Z-score between <strong>-1 and +1</strong> is standard. 
                                    Scores below <strong>-2</strong> indicate significant clinical flags (stunting/wasting).
                                </p>
                            </div>
                        </div>

                        {/* Results Column */}
                        <div className="lg:col-span-7 space-y-6">
                            {results ? (
                                <div className="space-y-6">
                                    {/* Primary BMI Card */}
                                    <Card className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 border-2 border-[var(--color-primary)]/20 shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-primary)]/20 pb-4 mb-4">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">Child Biometric Health Index</span>
                                                    <h3 className="text-xl font-bold text-[var(--color-secondary)]">Calculated Z-Scores & Growth Metrics</h3>
                                                </div>
                                                <div className="px-4 py-2 rounded-2xl bg-[var(--color-bg-card)]/80 border border-[var(--color-primary)]/20 shadow-sm flex items-center gap-2">
                                                    <Activity size={16} className="text-[var(--color-primary)]" />
                                                    <span className="text-sm font-black text-[var(--color-secondary)]">BMI: {results.bmi} kg/m²</span>
                                                </div>
                                            </div>

                                            {/* Z-Score Indicators Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Weight for Age */}
                                                <div className="p-4 rounded-2xl bg-[var(--color-bg-card)]/60 border border-[var(--color-divider)] flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Weight for Age</p>
                                                        <p className="text-2xl font-black text-[var(--color-text-main)] mt-1">{calcWeight} kg</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Percentile:</span>
                                                            <span className="font-bold">{results.weightPercentile === 100 ? '>99' : results.weightPercentile === 0 ? '<1' : results.weightPercentile}th</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Z-Score:</span>
                                                            <span className="font-bold">{results.weightZ}</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn("px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-tight text-center", results.weightStatusColor)}>
                                                        {results.weightStatus}
                                                    </div>
                                                </div>

                                                {/* Height for Age */}
                                                <div className="p-4 rounded-2xl bg-[var(--color-bg-card)]/60 border border-[var(--color-divider)] flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Height for Age</p>
                                                        <p className="text-2xl font-black text-[var(--color-text-main)] mt-1">{calcHeight} cm</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Percentile:</span>
                                                            <span className="font-bold">{results.heightPercentile === 100 ? '>99' : results.heightPercentile === 0 ? '<1' : results.heightPercentile}th</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Z-Score:</span>
                                                            <span className="font-bold">{results.heightZ}</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn("px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-tight text-center", results.heightStatusColor)}>
                                                        {results.heightStatus}
                                                    </div>
                                                </div>

                                                {/* BMI for Age */}
                                                <div className="p-4 rounded-2xl bg-[var(--color-bg-card)]/60 border border-[var(--color-divider)] flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">BMI for Age</p>
                                                        <p className="text-2xl font-black text-[var(--color-text-main)] mt-1">{results.bmi}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Percentile:</span>
                                                            <span className="font-bold">{results.bmiPercentile === 100 ? '>99' : results.bmiPercentile === 0 ? '<1' : results.bmiPercentile}th</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-semibold">
                                                            <span>Z-Score:</span>
                                                            <span className="font-bold">{results.bmiZ}</span>
                                                        </div>
                                                    </div>
                                                    <div className={cn("px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-tight text-center", results.bmiStatusColor)}>
                                                        {results.bmiStatus}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Comparative Reference milestones grid */}
                                    <div className="border border-[var(--color-divider)] rounded-2xl overflow-hidden bg-[var(--color-bg-card)] shadow-sm">
                                        <div className="p-4 border-b border-[var(--color-divider)] bg-[var(--color-bg-page)]/50 flex justify-between items-center">
                                            <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text-main)]">Milestone Reference Averages ({calcSex === 'male' ? 'Boys' : 'Girls'})</span>
                                            <span className="text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold px-2 py-0.5 rounded-md">WHO Medians</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-[var(--color-divider)] text-[var(--color-text-muted)] font-black uppercase tracking-wider bg-[var(--color-bg-page)]/30">
                                                        <th className="p-3">Age</th>
                                                        <th className="p-3">Median Weight (-2SD to +2SD)</th>
                                                        <th className="p-3">Median Height (-2SD to +2SD)</th>
                                                        <th className="p-3">Median BMI</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--color-divider)] font-medium text-[var(--color-text-muted)]">
                                                    {(calcSex === 'male' ? WHO_BOYS_DATA : WHO_GIRLS_DATA) && 
                                                        Object.entries(calcSex === 'male' ? WHO_BOYS_DATA : WHO_GIRLS_DATA).map(([age, vitals]) => (
                                                            <tr 
                                                                key={age}
                                                                className={cn(
                                                                    "hover:bg-[var(--color-bg-page)]/50 transition-colors",
                                                                    parseInt(age) === calcAge ? "bg-[var(--color-primary)]/5 font-bold text-[var(--color-text-main)]" : ""
                                                                )}
                                                            >
                                                                <td className="p-3 font-bold text-[var(--color-text-main)]">
                                                                    {age === '0' ? 'Birth' : `${age} months`}
                                                                </td>
                                                                <td className="p-3">
                                                                    {vitals.weightMedian.toFixed(1)} kg 
                                                                    <span className="text-[10px] text-[var(--color-text-muted)]/70 ml-1.5">
                                                                        ({(vitals.weightMedian - 2*vitals.weightSD).toFixed(1)} - {(vitals.weightMedian + 2*vitals.weightSD).toFixed(1)})
                                                                    </span>
                                                                </td>
                                                                <td className="p-3">
                                                                    {vitals.heightMedian.toFixed(1)} cm 
                                                                    <span className="text-[10px] text-[var(--color-text-muted)]/70 ml-1.5">
                                                                        ({(vitals.heightMedian - 2*vitals.heightSD).toFixed(1)} - {(vitals.heightMedian + 2*vitals.heightSD).toFixed(1)})
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-semibold">
                                                                    {vitals.bmiMedian.toFixed(1)} kg/m²
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center border border-dashed border-[var(--color-divider)] rounded-2xl text-[var(--color-text-muted)] text-sm">
                                    Enter valid child parameters to see clinical indices.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'pdri' && (
                    <div className="space-y-6">
                        {/* Search and filter bar */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={pdriSearch}
                                    onChange={(e) => setPdriSearch(e.target.value)}
                                    placeholder="Search age group or note details..."
                                    className="w-full pl-10 pr-4 py-2.5 text-sm font-medium border border-[var(--color-input-border)] rounded-2xl focus:outline-none focus:border-[var(--color-primary)] bg-transparent text-[var(--color-text-main)]"
                                />
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0 pb-1 sm:pb-0">
                                {['All', 'Infants', 'Toddlers', 'Children', 'Adolescents'].map((cohort) => (
                                    <button
                                        key={cohort}
                                        onClick={() => setPdriFilter(cohort)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                                            pdriFilter === cohort
                                                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                                                : "border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-gray-400 hover:text-[var(--color-text-main)] bg-[var(--color-bg-card)]"
                                        )}
                                    >
                                        {cohort}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PDRI Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPdri.length > 0 ? (
                                filteredPdri.map((row, idx) => {
                                    const theme = getCohortTheme(row.group);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedPdriRow(row)}
                                            className={cn(
                                                "rounded-3xl border bg-gradient-to-br p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] group",
                                                theme.bg, theme.border
                                            )}
                                        >
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-base font-black text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">
                                                        {row.group}
                                                    </h3>
                                                    <span className={cn("px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider shrink-0", theme.badge)}>
                                                        {row.group.includes('Infants') ? 'Infant' : row.group.includes('Toddlers') ? 'Toddler' : row.group.includes('Preschoolers') ? 'Preschool' : row.group.includes('Children') ? 'Child' : 'Teen'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Flame size={14} className="text-[var(--color-accent)] shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Energy</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.energy}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Activity size={14} className="text-emerald-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Protein</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.protein}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Droplet size={14} className="text-blue-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Fluids</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.fluid}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Heart size={14} className="text-rose-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Calcium</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.calcium}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <ShieldCheck size={14} className="text-red-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Iron</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.iron}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Sparkles size={14} className="text-purple-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] uppercase font-black text-[var(--color-text-muted)] leading-none">Zinc</p>
                                                            <p className="font-bold text-[var(--color-text-main)] mt-0.5">{row.zinc}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed italic border-t border-[var(--color-divider)] pt-3 line-clamp-2">
                                                    &ldquo;{row.note}&rdquo;
                                                </p>
                                            </div>

                                            <div className="mt-4 pt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                                                <span>View Diet Guide</span>
                                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full h-48 flex items-center justify-center border border-dashed border-[var(--color-divider)] rounded-3xl text-[var(--color-text-muted)] text-sm">
                                    No cohorts match your search query.
                                </div>
                            )}
                        </div>

                        {/* PDRI Details Dialog Overlay */}
                        <AnimatePresence>
                            {selectedPdriRow && (
                                <div 
                                    onClick={() => setSelectedPdriRow(null)}
                                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-lg bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
                                    >
                                        <div className="flex justify-between items-start border-b border-[var(--color-divider)] pb-4">
                                            <div className="space-y-1">
                                                <h3 className="text-xs font-black text-[var(--color-primary)] uppercase tracking-wider">Clinical Reference Target</h3>
                                                <h2 className="text-xl font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.group}</h2>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedPdriRow(null)}
                                                className="px-3 py-1.5 text-xs font-bold bg-[var(--color-bg-page)] hover:bg-[var(--color-divider)] text-[var(--color-text-muted)] rounded-xl transition-all"
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-[var(--color-divider)] pb-4 text-xs">
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Energy Requirement</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.energy}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Protein Requirement</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.protein}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Water / Fluids</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.fluid}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Calcium Target</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.calcium}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Iron Target</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.iron}</p>
                                                </div>
                                                <div className="p-3 bg-[var(--color-bg-page)] rounded-2xl border border-[var(--color-divider)] flex flex-col justify-center">
                                                    <span className="text-[9px] uppercase font-black text-[var(--color-text-muted)]">Zinc Target</span>
                                                    <p className="font-bold text-[var(--color-text-main)] mt-0.5">{selectedPdriRow.zinc}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-text-muted)]">Reference Guidelines & Recommendations</span>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-bg-page)] p-4 rounded-2xl border border-[var(--color-divider)]">
                                                    {selectedPdriRow.note}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {activeTab === 'bristol' && (
                    <div className="space-y-6">
                        {/* Interactive filtering */}
                        <div className="flex gap-2 justify-center sm:justify-start overflow-x-auto scrollbar-hide pb-2">
                            {[
                                { id: 'all', label: 'All Types (1-7)' },
                                { id: 'constipation', label: 'Constipation (Types 1-2)' },
                                { id: 'optimal', label: 'Ideal Stool (Types 3-4)' },
                                { id: 'diarrhea', label: 'Diarrhea / Loose (Types 5-7)' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setBristolFilter(tab.id)}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer whitespace-nowrap",
                                        bristolFilter === tab.id
                                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                                            : "border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-gray-400 hover:text-[var(--color-text-main)] bg-[var(--color-bg-card)]"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Stool types gallery */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredBristol.map((stool) => (
                                <div
                                    key={stool.type}
                                    onClick={() => setSelectedBristol(stool)}
                                    className={cn(
                                        "rounded-2xl border-2 bg-gradient-to-br p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.03] group",
                                        stool.colorClass,
                                        selectedBristol?.type === stool.type ? "scale-[1.03] shadow-lg ring-2 ring-[var(--color-primary)]" : "shadow-sm border-[var(--color-divider)]"
                                    )}
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase rounded-lg tracking-wider", stool.badgeColor)}>
                                                Type {stool.type}
                                            </span>
                                            <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                                                <Compass size={11} />
                                                {stool.transit}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-[var(--color-text-main)] group-hover:text-[var(--color-primary)] transition-colors">{stool.title}</h3>
                                            <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">{stool.desc}</p>
                                        </div>

                                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed italic border-l-2 border-[var(--color-divider)] pl-2.5">
                                            &ldquo;{stool.appearance}&rdquo;
                                        </p>
                                    </div>

                                    <div className="mt-5 pt-3 border-t border-[var(--color-divider)] flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[var(--color-primary)]">
                                        <span>Clinical Details</span>
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Expanded details overlay/bottom drawer */}
                        <AnimatePresence>
                            {selectedBristol && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setSelectedBristol(null)}
                                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        exit={{ scale: 0.9, y: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-2xl bg-[var(--color-bg-card)] border-2 border-[var(--color-divider)] rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
                                    >
                                        <div className="flex justify-between items-start border-b border-[var(--color-divider)] pb-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={cn("px-2.5 py-1 text-xs font-black uppercase rounded-lg tracking-wider", selectedBristol.badgeColor)}>
                                                        Type {selectedBristol.type}
                                                    </span>
                                                    <span className="text-xs font-bold text-[var(--color-text-muted)]">Transit: {selectedBristol.transit}</span>
                                                </div>
                                                <h2 className="text-xl font-bold text-[var(--color-text-main)] mt-1">{selectedBristol.title}</h2>
                                                <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">{selectedBristol.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedBristol(null)}
                                                className="px-3 py-1.5 text-xs font-bold bg-[var(--color-bg-page)] hover:bg-[var(--color-divider)] text-[var(--color-text-muted)] rounded-xl transition-all"
                                            >
                                                Close
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Appearance description */}
                                            <div className="p-4 rounded-2xl bg-[var(--color-bg-page)] border border-[var(--color-divider)] space-y-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Visual Appearance Description</span>
                                                <p className="text-sm font-medium italic text-[var(--color-text-main)]">&ldquo;{selectedBristol.appearance}&rdquo;</p>
                                            </div>

                                            {/* Clinical indicators */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-main)]">
                                                    <AlertCircle size={16} className="text-amber-500" />
                                                    Clinical Diagnostics
                                                </div>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pl-5">
                                                    {selectedBristol.clinical}
                                                </p>
                                            </div>

                                            {/* Dietary Advice */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-main)]">
                                                    <Heart size={16} className="text-[var(--color-primary)]" />
                                                    Nutritional Recommendations
                                                </div>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 p-4 rounded-2xl pl-5">
                                                    {selectedBristol.nutrition}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
