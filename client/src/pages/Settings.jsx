import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Bell, Shield, Smartphone, Scale, UserCog, HelpCircle, ChevronRight, Key, FileDown } from 'lucide-react';
import ChangePasswordModal from '../components/ChangePasswordModal';
import DeactivateAccountModal from '../components/DeactivateAccountModal';
import api from '../lib/api';
import MaintenanceModeModal from '../admin/components/MaintenanceModeModal';

// Helper to convert OKLCH color strings to standard RGB/RGBA strings for html2canvas compatibility
function replaceOklchWithRgb(str) {
    if (typeof str !== 'string' || !str.includes('oklch')) {
        return str;
    }
    
    return str.replace(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+(?:deg|rad|grad|turn)?)\s*(?:\/\s*([0-9.]+%?))?\s*\)/g, (match, lStr, cStr, hStr, aStr) => {
        try {
            let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
            let c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
            
            let h = 0;
            if (hStr.endsWith('deg')) {
                h = parseFloat(hStr);
            } else if (hStr.endsWith('rad')) {
                h = parseFloat(hStr) * (180 / Math.PI);
            } else if (hStr.endsWith('grad')) {
                h = parseFloat(hStr) * 0.9;
            } else if (hStr.endsWith('turn')) {
                h = parseFloat(hStr) * 360;
            } else {
                h = parseFloat(hStr);
            }
            
            let a = 1;
            if (aStr !== undefined) {
                a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
            }
            
            const hRad = (h * Math.PI) / 180;
            const oklab_a = c * Math.cos(hRad);
            const oklab_b = c * Math.sin(hRad);
            
            const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
            const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
            const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
            
            const l_lin = l_ * l_ * l_;
            const m_lin = m_ * m_ * m_;
            const s_lin = s_ * s_ * s_;
            
            let r_lin = +4.0767416621 * l_lin - 3.3077115913 * m_lin + 0.2309699292 * s_lin;
            let g_lin = -1.2684380046 * l_lin + 2.6097574011 * m_lin - 0.3413193965 * s_lin;
            let b_lin = -0.0041960863 * l_lin - 0.7034186147 * m_lin + 1.7076147010 * s_lin;
            
            const gamma = (val) => {
                return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
            };
            
            let r = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
            let g = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
            let b = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);
            
            if (a === 1) {
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
        } catch (e) {
            console.warn("Failed to parse oklch color:", match, e);
            return 'rgb(255, 255, 255)';
        }
    });
}

// Helper to convert OKLAB color strings to standard RGB/RGBA strings for html2canvas compatibility
function replaceOklabWithRgb(str) {
    if (typeof str !== 'string' || !str.includes('oklab')) {
        return str;
    }
    
    return str.replace(/oklab\(\s*([0-9.]+%?)\s+([0-9.-]+%?)\s+([0-9.-]+%?)\s*(?:\/\s*([0-9.]+%?))?\s*\)/g, (match, lStr, aStr, bStr, alphaStr) => {
        try {
            let l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
            let oklab_a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
            let oklab_b = bStr.endsWith('%') ? parseFloat(bStr) / 100 : parseFloat(bStr);
            
            let a = 1;
            if (alphaStr !== undefined) {
                a = alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr);
            }
            
            const l_ = l + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
            const m_ = l - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
            const s_ = l - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
            
            const l_lin = l_ * l_ * l_;
            const m_lin = m_ * m_ * m_;
            const s_lin = s_ * s_ * s_;
            
            let r_lin = +4.0767416621 * l_lin - 3.3077115913 * m_lin + 0.2309699292 * s_lin;
            let g_lin = -1.2684380046 * l_lin + 2.6097574011 * m_lin - 0.3413193965 * s_lin;
            let b_lin = -0.0041960863 * l_lin - 0.7034186147 * m_lin + 1.7076147010 * s_lin;
            
            const gamma = (val) => {
                return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
            };
            
            let r = Math.round(Math.max(0, Math.min(1, gamma(r_lin))) * 255);
            let g = Math.round(Math.max(0, Math.min(1, gamma(g_lin))) * 255);
            let b = Math.round(Math.max(0, Math.min(1, gamma(b_lin))) * 255);
            
            if (a === 1) {
                return `rgb(${r}, ${g}, ${b})`;
            } else {
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
        } catch (e) {
            console.warn("Failed to parse oklab color:", match, e);
            return 'rgb(255, 255, 255)';
        }
    });
}

// Wrapper to convert all unsupported colors
function replaceUnsupportedColors(str) {
    if (typeof str !== 'string') return str;
    let result = str;
    if (result.includes('oklch')) {
        result = replaceOklchWithRgb(result);
    }
    if (result.includes('oklab')) {
        result = replaceOklabWithRgb(result);
    }
    return result;
}

export default function Settings() {
    const { user, updatePreferences } = useAuth();
    const { setTheme, theme } = useTheme();
    const { showNotification } = useNotification();
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceLoading, setMaintenanceLoading] = useState(false);
    const location = useLocation();
    const [isPrinting, setIsPrinting] = useState(false);
    const [printData, setPrintData] = useState(null);
    const [compilingPDF, setCompilingPDF] = useState(false);

    useEffect(() => {
        if (isPrinting && printData) {
            const downloadAsPDF = async () => {
                setCompilingPDF(true);
                
                try {
                    // Dynamically import jsPDF
                    const jspdfModule = await import('jspdf');
                    const jsPDFClass = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;
                    const pdf = new jsPDFClass({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });

                    const child = printData.profiles?.[0];
                    const childName = child?.child_name || 'Patient';

                    // Page and coordinate settings
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const margin = 15;
                    const maxContentHeight = pageHeight - margin;
                    let y = 20;
                    let pageNum = 1;

                    // Stripper to remove HTML tags from progress notes
                    const stripHtml = (html) => {
                        if (!html) return 'N/A';
                        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                    };

                    // Function to draw header on each page
                    const drawHeader = () => {
                        // Title "SMARTNUTRI-AI"
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(18);
                        pdf.setTextColor(5, 150, 105); // emerald-600
                        pdf.text('SMARTNUTRI-AI', margin, 22);

                        // Subtitle
                        pdf.setFont('Helvetica', 'normal');
                        pdf.setFontSize(8);
                        pdf.setTextColor(100, 116, 139); // slate-500
                        pdf.text('CLINICAL-GRADE PEDIATRIC NUTRITION STATION', margin, 27);

                        // Type of document
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(10);
                        pdf.setTextColor(15, 23, 42); // slate-900
                        pdf.text('PEDIATRIC HEALTH RECORD', pageWidth - margin - 55, 20);

                        // Faux barcode lines
                        pdf.setFillColor(0, 0, 0);
                        let bx = pageWidth - margin - 40;
                        const bw = [1, 2, 1, 3, 1, 4, 1, 2, 1, 3, 1];
                        bw.forEach(w => {
                            pdf.rect(bx, 22, w * 0.3, 5, 'F');
                            bx += w * 0.3 + 0.3;
                        });

                        // Metadata date
                        pdf.setFont('Helvetica', 'normal');
                        pdf.setFontSize(7);
                        pdf.setTextColor(148, 163, 184); // slate-400
                        pdf.text(`Generated: ${new Date().toLocaleDateString()}  |  Page ${pageNum}`, pageWidth - margin - 55, 31);

                        // Border line
                        pdf.setDrawColor(5, 150, 105);
                        pdf.setLineWidth(0.5);
                        pdf.line(margin, 34, pageWidth - margin, 34);

                        y = 42;
                    };

                    const checkPageOverflow = (heightNeeded) => {
                        if (y + heightNeeded > maxContentHeight) {
                            // Draw footer of current page
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setFontSize(6);
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('SmartNutri-AI v1.2.0 • HIPAA & DPA (RA 10173) Compliant Digest', pageWidth / 2 - 35, pageHeight - 8);

                            pdf.addPage();
                            pageNum++;
                            drawHeader();
                            return true;
                        }
                        return false;
                    };

                    // Draw first page header
                    drawHeader();

                    // 1. PATIENT INFORMATION
                    checkPageOverflow(30);
                    pdf.setDrawColor(226, 232, 240); // slate-200
                    pdf.setFillColor(248, 250, 252); // slate-50
                    pdf.setLineWidth(0.3);
                    pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'FD');

                    pdf.setFont('Helvetica', 'bold');
                    pdf.setFontSize(8);
                    pdf.setTextColor(5, 150, 105);
                    pdf.text('PATIENT & GUARDIAN VITALS', margin + 4, y + 5);

                    pdf.setFont('Helvetica', 'normal');
                    pdf.setFontSize(7);
                    pdf.setTextColor(148, 163, 184);
                    pdf.text('Caregiver Name', margin + 4, y + 10);
                    pdf.text('Patient Name', margin + 50, y + 10);
                    pdf.text('Gender / DOB', margin + 95, y + 10);
                    pdf.text('Allergens', margin + 140, y + 10);

                    pdf.setFont('Helvetica', 'bold');
                    pdf.setFontSize(8);
                    pdf.setTextColor(15, 23, 42);
                    pdf.text(String(printData.full_name || 'N/A').toUpperCase(), margin + 4, y + 15);
                    pdf.text(String(childName).toUpperCase(), margin + 50, y + 15);
                    pdf.text(String(`${child?.gender || 'N/A'} • ${child?.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'N/A'}`).toUpperCase(), margin + 95, y + 15);
                    
                    if (child?.allergies?.length > 0) {
                        pdf.setTextColor(225, 29, 72); // rose-600
                        pdf.text(String(child.allergies.join(', ')).toUpperCase(), margin + 140, y + 15);
                    } else {
                        pdf.setTextColor(71, 85, 105);
                        pdf.text('NONE', margin + 140, y + 15);
                    }

                    y += 28;

                    // 2. GROWTH HISTORY
                    if (child?.growth_logs && child.growth_logs.length > 0) {
                        checkPageOverflow(15 + child.growth_logs.length * 8);
                        
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(9);
                        pdf.setTextColor(51, 65, 85); // slate-700
                        pdf.text('GROWTH TRACKER HISTORY', margin, y);
                        y += 3;

                        // Grid header
                        pdf.setFillColor(248, 250, 252);
                        pdf.rect(margin, y, pageWidth - margin * 2, 6, 'F');
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(7);
                        pdf.setTextColor(100, 116, 139);
                        pdf.text('Log Date', margin + 4, y + 4.5);
                        pdf.text('Weight (kg)', margin + 45, y + 4.5);
                        pdf.text('Height (cm)', margin + 90, y + 4.5);
                        pdf.text('BMI Vitals', margin + 135, y + 4.5);
                        
                        pdf.setDrawColor(226, 232, 240);
                        pdf.line(margin, y + 6, pageWidth - margin, y + 6);
                        y += 6;

                        // Rows
                        pdf.setFont('Helvetica', 'normal');
                        pdf.setFontSize(7.5);
                        pdf.setTextColor(51, 65, 85);
                        
                        child.growth_logs.forEach((log, index) => {
                            checkPageOverflow(8);
                            const bmi = (log.weight_kg / Math.pow(log.height_cm / 100, 2)).toFixed(1);
                            
                            pdf.text(new Date(log.logged_at).toLocaleDateString(), margin + 4, y + 5.5);
                            pdf.setFont('Helvetica', 'bold');
                            pdf.text(`${log.weight_kg} kg`, margin + 45, y + 5.5);
                            pdf.text(`${log.height_cm} cm`, margin + 90, y + 5.5);
                            pdf.setFont('Helvetica', 'normal');
                            pdf.text(`${bmi} (Pediatric)`, margin + 135, y + 5.5);

                            pdf.setDrawColor(241, 245, 249);
                            pdf.line(margin, y + 8, pageWidth - margin, y + 8);
                            y += 8;
                        });
                        
                        y += 5;
                    }

                    // 3. MEAL AUDIT
                    if (child?.meal_logs && child.meal_logs.length > 0) {
                        const logsToPrint = child.meal_logs.slice(0, 8);
                        checkPageOverflow(15 + logsToPrint.length * 8);

                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(9);
                        pdf.setTextColor(51, 65, 85);
                        pdf.text('MEAL INTAKES & ADHERENCE AUDIT', margin, y);
                        y += 3;

                        // Grid header
                        pdf.setFillColor(248, 250, 252);
                        pdf.rect(margin, y, pageWidth - margin * 2, 6, 'F');
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(7);
                        pdf.setTextColor(100, 116, 139);
                        pdf.text('Logged Date', margin + 4, y + 4.5);
                        pdf.text('Category', margin + 35, y + 4.5);
                        pdf.text('Nutrient Inferences', margin + 65, y + 4.5);
                        pdf.text('Score', margin + 130, y + 4.5);
                        pdf.text('Compliance Status', margin + 150, y + 4.5);
                        
                        pdf.setDrawColor(226, 232, 240);
                        pdf.line(margin, y + 6, pageWidth - margin, y + 6);
                        y += 6;

                        // Rows
                        logsToPrint.forEach((log, index) => {
                            checkPageOverflow(8);
                            
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setFontSize(7.5);
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(new Date(log.logged_at).toLocaleDateString(), margin + 4, y + 5.5);
                            
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(4, 120, 87); // emerald-700
                            pdf.text(String(log.meal_category).toUpperCase(), margin + 35, y + 5.5);
                            
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(71, 85, 105);
                            pdf.text(`${log.total_calories} kcal • ${log.total_protein_g}g P • ${log.total_sugar_g}g S • ${log.total_sodium_mg}mg Na`, margin + 65, y + 5.5);
                            
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(15, 23, 42);
                            pdf.text(`${log.compliance_score}%`, margin + 130, y + 5.5);
                            
                            if (log.compliance_status === 'violation') {
                                pdf.setTextColor(225, 29, 72); // rose-600
                                pdf.text('HIGH SUGAR/SODIUM', margin + 150, y + 5.5);
                            } else {
                                pdf.setTextColor(5, 150, 105); // emerald-500
                                pdf.text('COMPLIANT', margin + 150, y + 5.5);
                            }

                            pdf.setDrawColor(241, 245, 249);
                            pdf.line(margin, y + 8, pageWidth - margin, y + 8);
                            y += 8;
                        });

                        y += 5;
                    }

                    // 4. DIETITIAN ADIME progress NOTES
                    if (child?.adime_notes && child.adime_notes.length > 0) {
                        const notesToPrint = child.adime_notes.slice(0, 2);
                        
                        checkPageOverflow(20);
                        pdf.setFont('Helvetica', 'bold');
                        pdf.setFontSize(9);
                        pdf.setTextColor(51, 65, 85);
                        pdf.text('PRACTITIONER ADIME CHARTS', margin, y);
                        y += 4;

                        for (const note of notesToPrint) {
                            // Calculate block size dynamically based on wrapped text lengths
                            const cleanAssessment = stripHtml(note.assessment);
                            const cleanDiagnosis = stripHtml(note.diagnosis);
                            const cleanIntervention = stripHtml(note.intervention);
                            const cleanMonitoring = stripHtml(note.monitoring);
                            const cleanEvaluation = stripHtml(note.evaluation);

                            const colWidth = (pageWidth - margin * 2 - 8) / 2;
                            const textAssessment = pdf.splitTextToSize(cleanAssessment, colWidth - 6);
                            const textDiagnosis = pdf.splitTextToSize(cleanDiagnosis, colWidth - 6);

                            const textIntervention = pdf.splitTextToSize(cleanIntervention, ((pageWidth - margin * 2 - 12) / 3) - 2);
                            const textMonitoring = pdf.splitTextToSize(cleanMonitoring, ((pageWidth - margin * 2 - 12) / 3) - 2);
                            const textEvaluation = pdf.splitTextToSize(cleanEvaluation, ((pageWidth - margin * 2 - 12) / 3) - 2);

                            const row1Height = Math.max(textAssessment.length, textDiagnosis.length) * 4 + 10;
                            const row2Height = Math.max(textIntervention.length, textMonitoring.length, textEvaluation.length) * 4 + 10;
                            const totalNoteBlockHeight = 10 + row1Height + row2Height;

                            checkPageOverflow(totalNoteBlockHeight + 5);

                            // Draw containing box
                            pdf.setDrawColor(226, 232, 240);
                            pdf.setFillColor(248, 250, 252);
                            pdf.roundedRect(margin, y, pageWidth - margin * 2, totalNoteBlockHeight, 3, 3, 'FD');

                            // Card header
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setFontSize(7.5);
                            pdf.setTextColor(6, 95, 70); // emerald-800
                            pdf.text('REGISTERED DIETITIAN CLINICAL ASSESSMENT', margin + 4, y + 5);
                            
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setFontSize(7);
                            pdf.setTextColor(100, 116, 139);
                            pdf.text(`Logged Date: ${new Date(note.created_at).toLocaleDateString()}`, pageWidth - margin - 40, y + 5);
                            
                            pdf.setDrawColor(226, 232, 240);
                            pdf.line(margin + 4, y + 7, pageWidth - margin - 4, y + 7);

                            y += 9;

                            // Row 1: Assessment & Diagnosis
                            const blockY = y;
                            
                            // Left Assessment block
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setFontSize(7);
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('Assessment & Vitals', margin + 4, blockY + 3);
                            
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(textAssessment, margin + 4, blockY + 7);

                            // Right Diagnosis block
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('Diagnosis & Inferences', margin + colWidth + 8, blockY + 3);
                            
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(textDiagnosis, margin + colWidth + 8, blockY + 7);

                            y += row1Height;
                            pdf.line(margin + 4, y, pageWidth - margin - 4, y);
                            y += 2;

                            // Row 2: Intervention, Monitoring, Evaluation
                            const blockY2 = y;
                            const col3Width = (pageWidth - margin * 2 - 12) / 3;

                            // Intervention
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('Interventions', margin + 4, blockY2 + 3);
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(textIntervention, margin + 4, blockY2 + 7);

                            // Monitoring
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('Monitoring Charts', margin + col3Width + 8, blockY2 + 3);
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(textMonitoring, margin + col3Width + 8, blockY2 + 7);

                            // Evaluation
                            pdf.setFont('Helvetica', 'bold');
                            pdf.setTextColor(148, 163, 184);
                            pdf.text('Evaluations', margin + col3Width * 2 + 12, blockY2 + 3);
                            pdf.setFont('Helvetica', 'normal');
                            pdf.setTextColor(51, 65, 85);
                            pdf.text(textEvaluation, margin + col3Width * 2 + 12, blockY2 + 7);

                            y += row2Height - 2; // Adjust block y offset
                        }
                        y += 5;
                    }

                    // 5. SIGNATURES
                    checkPageOverflow(30);
                    y += 10;
                    pdf.setDrawColor(148, 163, 184);
                    pdf.setLineWidth(0.2);
                    
                    const sigWidth = 60;
                    pdf.line(margin + 10, y, margin + 10 + sigWidth, y);
                    pdf.line(pageWidth - margin - 10 - sigWidth, y, pageWidth - margin - 10, y);
                    
                    y += 4;
                    pdf.setFont('Helvetica', 'bold');
                    pdf.setFontSize(7.5);
                    pdf.setTextColor(148, 163, 184);
                    pdf.text('PARENT / CAREGIVER SIGNATURE', margin + 14, y);
                    pdf.text('REGISTERED DIETITIAN (RND) SIGNATURE', pageWidth - margin - 10 - sigWidth + 4, y);

                    // Final page footer drawing
                    pdf.setFont('Helvetica', 'bold');
                    pdf.setFontSize(6);
                    pdf.setTextColor(148, 163, 184);
                    pdf.text('SmartNutri-AI v1.2.0 • HIPAA & DPA (RA 10173) Compliant Digest', pageWidth / 2 - 35, pageHeight - 8);

                    // Save
                    pdf.save(`SmartNutri_Clinical_Summary_${childName.replace(/\s+/g, '_')}.pdf`);
                    showNotification('Clinical Medical Summary downloaded as PDF!', 'success');
                } catch (error) {
                    console.error("PDF generation failed:", error);
                    showNotification("Failed to compile medical PDF. Please try again.", "error");
                } finally {
                    setIsPrinting(false);
                    setPrintData(null);
                    setCompilingPDF(false);
                }
            };

            downloadAsPDF();
        }
    }, [isPrinting, printData]);

    useEffect(() => {
        const fetchHealth = async () => {
            if (user?.role === 'admin') {
                try {
                    const res = await api.get('/health');
                    setMaintenanceMode(res.data.maintenance ?? false);
                } catch (err) {
                    console.error("Failed to fetch system health");
                }
            }
        };
        fetchHealth();
    }, [user?.role]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('reason') === 'force_reset') {
            setShowPasswordModal(true);
            showNotification('Security Policy: An administrator has requested a mandatory password update for your account.', 'error');
        }
    }, [location, showNotification]);

    const [isUpdating, setIsUpdating] = useState(false);

    const handlePreferenceChange = async (key, value, customMessage) => {
        setIsUpdating(true);
        try {
            const res = await updatePreferences({ [key]: value });
            if (res.success) {
                showNotification(customMessage || 'Preference updated and saved', 'success');
            } else {
                showNotification('Failed to sync preference with server', 'error');
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleThemeChange = async (newTheme) => {
        if (isUpdating || theme === newTheme) return;
        setTheme(newTheme);
        await handlePreferenceChange('theme', newTheme, `Theme changed to ${newTheme} mode`);
    };

    const handleMaintenanceToggle = async () => {
        setShowMaintenanceModal(false);
        setMaintenanceLoading(true);
        try {
            const res = await api.patch('/admin/maintenance', { enabled: !maintenanceMode });
            setMaintenanceMode(res.data.maintenanceMode);
            showNotification(res.data.message, 'success');
        } catch (err) {
            console.error(err);
            showNotification(err.response?.data?.message || 'Failed to toggle maintenance mode', 'error');
        } finally {
            setMaintenanceLoading(false);
        }
    };

    const handleDataExport = async () => {
        try {
            showNotification('Compiling clinical data export, please wait...', 'success');
            const res = await api.get('/auth/export-data');
            
            let exportData = res.data;
            if (user?.research_anonymize) {
                const pId = user.id.substring(0, 4);
                const safeUser = {
                    ...exportData.data,
                    full_name: `Research_Parent_${pId}`,
                    email: `anonymized_${pId}@research.smartnutri.ai`,
                    phone: `[REDACTED]`,
                    profiles: exportData.data.profiles.map(profile => {
                        const cId = profile.id.substring(0, 4);
                        return {
                            ...profile,
                            child_name: `Subject_${cId}`,
                            date_of_birth: profile.date_of_birth ? `${profile.date_of_birth.split('-')[0]}-xx-xx` : null,
                            vaccinations: `[REDACTED]`,
                            medications: `[REDACTED]`,
                            daily_logs: profile.daily_logs.map(log => ({ ...log, notes: `[REDACTED]` })),
                            meal_logs: profile.meal_logs.map(log => ({ ...log, hidden_ingredients: `[REDACTED]` }))
                        };
                    })
                };
                exportData = {
                    ...exportData,
                    compliance_anonymized: true,
                    data: safeUser
                };
                showNotification('Data compiled with strict research de-identification!', 'success');
            }

            // Generate clean downloadable JSON blob
            const dataStr = JSON.stringify(exportData, null, 4);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `smartnutri_clinical_export_${user?.full_name?.toLowerCase().replace(/\s+/g, '_') || 'caregiver'}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            if (!user?.research_anonymize) {
                showNotification('Clinical history export downloaded successfully!', 'success');
            }
        } catch (err) {
            console.error("Export failed:", err);
            showNotification(err.response?.data?.message || 'Failed to export clinical data. Please try again.', 'error');
        }
    };

    const handlePrintSummary = async () => {
        try {
            showNotification('Compiling pediatrician medical summary report, please wait...', 'success');
            const res = await api.get('/auth/export-data');
            setPrintData(res.data.data);
            setIsPrinting(true);
        } catch (err) {
            console.error("Failed to compile print records:", err);
            showNotification(err.response?.data?.message || 'Failed to compile pediatrician report details.', 'error');
        }
    };

    const sections = [
        {
            title: "App Preferences",
            icon: Smartphone,
            items: [
                {
                    label: "Dark Mode",
                    desc: "Switch between light and dark themes",
                    action: (
                        <div className={`flex bg-gray-100 dark:bg-zinc-800 rounded-full p-1 border border-gray-200 dark:border-zinc-700 transition-opacity duration-300 ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            <button
                                onClick={() => handleThemeChange('light')}
                                disabled={isUpdating}
                                className={`p-2 rounded-full transition-all duration-300 transform active:scale-95 focus:outline-none theme-button-hover ${theme === 'light' ? 'bg-white shadow text-yellow-500 scale-110 theme-button-active' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}`}
                                aria-label="Light Mode"
                            >
                                <Sun size={18} className="theme-icon-rotate" />
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                disabled={isUpdating}
                                className={`p-2 rounded-full transition-all duration-300 transform active:scale-95 focus:outline-none theme-button-hover ${theme === 'dark' ? 'bg-zinc-600 shadow text-blue-300 scale-110 theme-button-active' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}`}
                                aria-label="Dark Mode"
                            >
                                <Moon size={18} className="theme-icon-rotate" />
                            </button>
                        </div>
                    )
                },
                {
                    label: "Privacy Mode",
                    desc: "Blur patient names in shared environments",
                    toggle: true,
                    active: user?.privacy_mode,
                    onToggle: () => handlePreferenceChange('privacy_mode', !user?.privacy_mode, `Privacy mode ${!user?.privacy_mode ? 'enabled' : 'disabled'}`)
                },
                ...(user?.role !== 'admin' ? [
                    {
                        label: "Academic Research Mode",
                        desc: "Anonymize patient identity tags on exported data logs",
                        toggle: true,
                        active: user?.research_anonymize,
                        onToggle: () => handlePreferenceChange('research_anonymize', !user?.research_anonymize, `Research de-identification ${!user?.research_anonymize ? 'enabled' : 'disabled'}`)
                    }
                ] : [])
            ]
        },
        // Clinical sections hidden for Admins
        ...(user?.role !== 'admin' ? [
            {
                title: "Nutrition & Units",
                icon: Scale,
                items: [
                    {
                        label: "Unit System",
                        desc: user?.measurement_system === 'metric' ? "Metric (kg, cm)" : "Imperial (lbs, ft)",
                        action: (
                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-[var(--color-divider)]">
                                <button
                                    onClick={() => handlePreferenceChange('measurement_system', 'metric', 'Units updated to Metric')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.measurement_system === 'metric' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Metric
                                </button>
                                <button
                                    onClick={() => handlePreferenceChange('measurement_system', 'imperial', 'Units updated to Imperial')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.measurement_system === 'imperial' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Imperial
                                </button>
                            </div>
                        )
                    },
                    {
                        label: "Nutrient Precision",
                        desc: "Control decimal places for clinical data",
                        action: (
                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-[var(--color-divider)]">
                                <button
                                    onClick={() => handlePreferenceChange('nutrient_precision', 'whole', 'Precision set to Whole Numbers')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.nutrient_precision === 'whole' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Whole
                                </button>
                                <button
                                    onClick={() => handlePreferenceChange('nutrient_precision', 'decimal', 'Precision set to Decimals')}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user?.nutrient_precision === 'decimal' ? 'bg-white dark:bg-white/10 text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                                >
                                    Decimal
                                </button>
                            </div>
                        )
                    }
                ]
            }
        ] : []),
        ...(user?.role === 'parent' ? [
            {
                title: "Notifications",
                icon: Bell,
                items: [
                    {
                        label: "Critical Compliance Alerts",
                        desc: "Immediate push/email for high sodium/sugar violations",
                        toggle: true,
                        active: user?.notif_compliance !== false,
                        onToggle: () => handlePreferenceChange('notif_compliance', user?.notif_compliance === false, `Critical Compliance Alerts ${user?.notif_compliance === false ? 'enabled' : 'disabled'}`)
                    },
                    {
                        label: "Meal Reminders",
                        desc: "Receive alerts for meal times",
                        toggle: true,
                        active: user?.notif_reminders !== false,
                        onToggle: () => handlePreferenceChange('notif_reminders', user?.notif_reminders === false, `Meal Reminders ${user?.notif_reminders === false ? 'enabled' : 'disabled'}`)
                    }
                ]
            }
        ] : []),
        {
            title: "Account & Privacy",
            icon: Shield,
            items: [
                {
                    label: "Change Password",
                    type: "link",
                    onClick: () => setShowPasswordModal(true)
                },
                ...(user?.role !== 'admin' ? [
                    ...(user?.role === 'parent' ? [
                        {
                            label: "Data Export",
                            desc: "Download your nutrition data",
                            type: "link",
                            onClick: handleDataExport
                        },
                        {
                            label: "Printable Medical Summary",
                            desc: "Download clinical report PDF for your pediatrician",
                            type: "link",
                            onClick: handlePrintSummary
                        }
                    ] : []),
                    { 
                        label: "Delete Account", 
                        desc: "Deactivate your account and clinical data", 
                        type: "danger",
                        onClick: () => setShowDeactivateModal(true)
                    }
                ] : []),
            ]
        },
        ...(user?.role === 'admin' ? [
            {
                title: "System Administration",
                icon: Shield,
                items: [
                    {
                        label: "Maintenance Mode",
                        desc: "Enable to instantly block all non-admin traffic. Use only during emergencies or upgrades.",
                        action: (
                            <button
                                onClick={() => setShowMaintenanceModal(true)}
                                disabled={maintenanceLoading}
                                className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner focus:outline-none ${maintenanceMode ? 'bg-rose-500 shadow-rose-500/30' : 'bg-gray-300 dark:bg-zinc-700'}`}
                            >
                                <div 
                                    className={`w-5 h-5 bg-white rounded-full absolute top-1 left-1 shadow-sm ${maintenanceMode ? 'scale-110' : ''}`}
                                    style={{ 
                                        transform: maintenanceMode ? 'translateX(28px)' : 'translateX(0)',
                                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                />
                            </button>
                        )
                    }
                ]
            }
        ] : [])
    ];

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20 px-2 sm:px-0 relative">
            {compilingPDF && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <FileDown className="text-emerald-500 animate-pulse" size={24} />
                        </div>
                    </div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-4">Compiling High-DPI PDF Document...</p>
                </div>
            )}
            <div className="pt-2 sm:pt-0 px-1 sm:px-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">Settings</h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">Manage app preferences and clinical configurations.</p>
            </div>

            {sections.map((section, idx) => (
                <Card key={idx} className="border-2 border-[var(--color-divider)] overflow-hidden shadow-sm rounded-xl sm:rounded-3xl">
                    <CardHeader className="border-b border-[var(--color-divider)] p-3.5 sm:p-6 bg-gray-50/30 dark:bg-white/5">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black uppercase tracking-tight">
                            <section.icon size={20} className="text-[var(--color-primary)]" />
                            {section.title}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {section.items.map((item, i) => (
                            <div
                                key={i}
                                onClick={item.onClick}
                                className={`flex items-center justify-between p-3.5 sm:p-5 transition-all border-b last:border-0 border-[var(--color-divider)] ${item.onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''}`}
                            >
                                <div>
                                    <div className={`font-black uppercase text-xs sm:text-sm ${item.type === 'danger' ? 'text-red-500' : 'text-[var(--color-text-main)]'}`}>
                                        {item.label}
                                    </div>
                                    {item.desc && <div className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-tight mt-0.5">{item.desc}</div>}
                                </div>

                                <div>
                                    {item.action ? (
                                        item.action
                                    ) : item.toggle ? (
                                        <button
                                            onClick={item.onToggle}
                                            className={`w-12 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${item.active ? 'bg-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20' : 'bg-gray-300 dark:bg-zinc-700'}`}
                                        >
                                            <div 
                                                className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"
                                                style={{ 
                                                    transform: item.active ? 'translateX(24px)' : 'translateX(0)',
                                                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                            />
                                        </button>
                                    ) : (
                                        <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <div className="text-center pt-8 text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em] opacity-40">
                <p>SmartNutri-AI v1.2.0 • Clinical Engine</p>
                <p>© 2026 SmartNutri Inc.</p>
            </div>

            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />

            <DeactivateAccountModal
                isOpen={showDeactivateModal}
                onClose={() => setShowDeactivateModal(false)}
            />

            <MaintenanceModeModal
                isOpen={showMaintenanceModal}
                onClose={() => setShowMaintenanceModal(false)}
                onConfirm={handleMaintenanceToggle}
                currentlyEnabled={maintenanceMode}
                isLoading={maintenanceLoading}
            />
        </div>
    );
}


