/**
 * WHO Child Growth Standards Utility (Expanded)
 * Formula: Z = [((y/M)^L) - 1] / (L * S)
 * References: WHO Growth Charts (0-5 years)
 */

// Granular LMS Values (every 6 months for balance between precision and size)
// Data sourced from WHO Child Growth Standards
const WFA_LMS = {
    male: {
        0: { L: 0.3487, M: 3.3464, S: 0.1460 },
        6: { L: -0.0031, M: 7.8974, S: 0.1118 },
        12: { L: -0.1601, M: 9.6762, S: 0.1090 },
        18: { L: -0.2227, M: 10.9221, S: 0.1105 },
        24: { L: -0.0532, M: 12.1520, S: 0.1206 },
        30: { L: -0.0881, M: 13.2500, S: 0.1240 },
        36: { L: -0.1190, M: 14.2800, S: 0.1278 },
        42: { L: -0.1461, M: 15.3100, S: 0.1312 },
        48: { L: -0.1706, M: 16.3200, S: 0.1345 },
        54: { L: -0.1919, M: 17.3200, S: 0.1378 },
        60: { L: -0.2104, M: 18.3100, S: 0.1412 }
    },
    female: {
        0: { L: 0.4349, M: 3.2322, S: 0.1411 },
        6: { L: 0.0886, M: 7.2917, S: 0.1135 },
        12: { L: -0.0381, M: 8.9416, S: 0.1137 },
        18: { L: -0.1147, M: 10.1541, S: 0.1171 },
        24: { L: -0.1401, M: 11.4820, S: 0.1245 },
        30: { L: -0.1732, M: 12.6900, S: 0.1285 },
        36: { L: -0.2016, M: 13.8500, S: 0.1325 },
        42: { L: -0.2281, M: 14.9800, S: 0.1365 },
        48: { L: -0.2520, M: 16.0700, S: 0.1402 },
        54: { L: -0.2735, M: 17.1500, S: 0.1439 },
        60: { L: -0.2925, M: 18.2300, S: 0.1476 }
    }
};

const HFA_LMS = {
    male: {
        0: { L: 1, M: 49.88, S: 0.0379 },
        6: { L: 1, M: 67.62, S: 0.0361 },
        12: { L: 1, M: 75.73, S: 0.0360 },
        18: { L: 1, M: 82.31, S: 0.0368 },
        24: { L: 1, M: 87.13, S: 0.0385 },
        30: { L: 1, M: 91.90, S: 0.0392 },
        36: { L: 1, M: 96.08, S: 0.0401 },
        42: { L: 1, M: 99.85, S: 0.0408 },
        48: { L: 1, M: 103.3, S: 0.0416 },
        54: { L: 1, M: 106.7, S: 0.0423 },
        60: { L: 1, M: 110.0, S: 0.0431 }
    },
    female: {
        0: { L: 1, M: 49.15, S: 0.0385 },
        6: { L: 1, M: 65.73, S: 0.0371 },
        12: { L: 1, M: 73.96, S: 0.0372 },
        18: { L: 1, M: 80.70, S: 0.0382 },
        24: { L: 1, M: 85.71, S: 0.0392 },
        30: { L: 1, M: 90.70, S: 0.0402 },
        36: { L: 1, M: 95.07, S: 0.0412 },
        42: { L: 1, M: 98.90, S: 0.0422 },
        48: { L: 1, M: 102.7, S: 0.0432 },
        54: { L: 1, M: 106.1, S: 0.0442 },
        60: { L: 1, M: 109.4, S: 0.0452 }
    }
};

/**
 * Interpolates LMS values between known age points
 */
function interpolateLMS(age, lmsTable) {
    const ages = Object.keys(lmsTable).map(Number).sort((a, b) => a - b);
    
    // Clamp age
    if (age <= ages[0]) return lmsTable[ages[0]];
    if (age >= ages[ages.length - 1]) return lmsTable[ages[ages.length - 1]];

    // Find bounding ages
    let lower = ages[0];
    let upper = ages[1];
    for (let i = 0; i < ages.length - 1; i++) {
        if (age >= ages[i] && age <= ages[i + 1]) {
            lower = ages[i];
            upper = ages[i + 1];
            break;
        }
    }

    const t = (age - lower) / (upper - lower);
    return {
        L: lmsTable[lower].L + t * (lmsTable[upper].L - lmsTable[lower].L),
        M: lmsTable[lower].M + t * (lmsTable[upper].M - lmsTable[lower].M),
        S: lmsTable[lower].S + t * (lmsTable[upper].S - lmsTable[lower].S)
    };
}

/**
 * Calculates Z-Score and Percentile using LMS method
 */
function calculateZAndPercentile(y, L, M, S) {
    if (!y || !M) return { zScore: 0, percentile: 50 };
    
    let zScore;
    if (Math.abs(L) < 0.01) {
        zScore = Math.log(y / M) / S;
    } else {
        zScore = (Math.pow(y / M, L) - 1) / (L * S);
    }

    // Convert Z-score to Percentile (approximation using error function)
    const percentile = Math.round(normalCDF(zScore) * 100);
    
    return { 
        zScore: parseFloat(zScore.toFixed(2)), 
        percentile: Math.max(0.1, Math.min(99.9, percentile)) 
    };
}

/**
 * Normal Cumulative Distribution Function (approximation)
 */
function normalCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
}

/**
 * Gets growth clinical status based on WHO Z-scores
 */
export const getGrowthStatus = (ageMonths, gender, weightKg, heightCm) => {
    const g = (gender && String(gender).toLowerCase() === 'male') ? 'male' : 'female';
    
    const wfaData = interpolateLMS(ageMonths, WFA_LMS[g]);
    const hfaData = interpolateLMS(ageMonths, HFA_LMS[g]);

    const weightZ = calculateZAndPercentile(weightKg, wfaData.L, wfaData.M, wfaData.S);
    const heightZ = calculateZAndPercentile(heightCm, hfaData.L, hfaData.M, hfaData.S);

    // Clinical Interpretations (WHO Standards)
    let weightStatus = "Normal";
    if (weightZ.zScore < -2) weightStatus = "Underweight";
    if (weightZ.zScore < -3) weightStatus = "Severely Underweight";
    if (weightZ.zScore > 2) weightStatus = "Overweight";
    if (weightZ.zScore > 3) weightStatus = "Obese";

    let heightStatus = "Normal";
    if (heightZ.zScore < -2) heightStatus = "Stunted";
    if (heightZ.zScore < -3) heightStatus = "Severely Stunted";

    return {
        weight: { ...weightZ, status: weightStatus },
        height: { ...heightZ, status: heightStatus },
        assessment_age_months: ageMonths
    };
};

