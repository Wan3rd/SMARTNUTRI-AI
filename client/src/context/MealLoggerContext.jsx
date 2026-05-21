import React, { createContext, useContext, useState } from 'react';

const MealLoggerContext = createContext();

export function MealLoggerProvider({ children }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fileAfter, setFileAfter] = useState(null);
    const [previewAfter, setPreviewAfter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [verifiedItems, setVerifiedItems] = useState([]);
    const [status, setStatus] = useState('idle');
    
    // Helper to get local ISO time (up to minutes)
    const getLocalISOTime = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    const getDefaultMealCategory = () => {
        const phHour = new Date().getHours();
        if (phHour >= 5 && phHour < 11) return 'Breakfast';
        if (phHour >= 11 && phHour < 14) return 'Lunch';
        if (phHour >= 14 && phHour < 17) return 'PM Snack';
        if (phHour >= 17 && phHour < 21) return 'Dinner';
        return 'Other';
    };

    const [autoOpenWebcam, setAutoOpenWebcam] = useState(false);
    const [autoQuickLog, setAutoQuickLog] = useState(false);

    const [suppData, setSuppData] = useState({
        waterMl: '',
        supplements: '',
        physicalActivity: '',
        servingSpoonUsed: false,
        cookingMethod: '',
        hiddenIngredients: '',
        isParentVerified: false,
        mealCategory: getDefaultMealCategory(),
        plateWaste: 100,
        loggedAt: getLocalISOTime()
    });

    const resetLogger = () => {
        setFile(null);
        setPreview(null);
        setFileAfter(null);
        setPreviewAfter(null);
        setLoading(false);
        setAnalysisResult(null);
        setVerifiedItems([]);
        setStatus('idle');
        setAutoOpenWebcam(false);
        setAutoQuickLog(false);
        setSuppData(prev => ({
            ...prev,
            waterMl: '',
            supplements: '',
            physicalActivity: '',
            servingSpoonUsed: false,
            cookingMethod: '',
            hiddenIngredients: '',
            isParentVerified: false,
            mealCategory: getDefaultMealCategory(),
            plateWaste: 100,
            loggedAt: getLocalISOTime()
        }));
    };

    return (
        <MealLoggerContext.Provider value={{
            file, setFile,
            preview, setPreview,
            fileAfter, setFileAfter,
            previewAfter, setPreviewAfter,
            loading, setLoading,
            analysisResult, setAnalysisResult,
            verifiedItems, setVerifiedItems,
            status, setStatus,
            suppData, setSuppData,
            resetLogger,
            autoOpenWebcam, setAutoOpenWebcam,
            autoQuickLog, setAutoQuickLog
        }}>
            {children}
        </MealLoggerContext.Provider>
    );
}

export const useMealLoggerStore = () => useContext(MealLoggerContext);
