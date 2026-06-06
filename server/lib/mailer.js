import axios from 'axios';
import dotenv from 'dotenv';
import config from '../../env_config.js';

dotenv.config();

// ─── Brevo (Sendinblue) Transport ─────────────────────────────────────────────
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const FROM_EMAIL    = process.env.FROM_EMAIL?.trim() || 'snutri244@gmail.com';
const FROM_NAME     = 'SmartNutri-AI';
const APP_URL       = config.client.url;
const LOGO_URL      = 'https://smartnutri-ai-xmn9.vercel.app/SmartNutri-logo.png';

/**
 * Core Brevo send helper — mirrors Katebea Trading's emailService.js pattern.
 * All mailer functions funnel through here.
 */
const sendViaBrevo = async ({ to, subject, html, text }) => {
    if (!BREVO_API_KEY) {
        console.warn('[Mailer] BREVO_API_KEY is not set. Email not sent.');
        if (process.env.NODE_ENV !== 'production') {
            console.log('------------------------------------------------------------------');
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] Body Preview: ${text ? text.substring(0, 80).replace(/\n/g, ' ') : 'HTML Content'}...`);
            console.log('------------------------------------------------------------------');
        }
        return { success: true, provider: 'console' };
    }

    try {
        const payload = {
            sender:      { email: FROM_EMAIL, name: FROM_NAME },
            to:          [{ email: to }],
            subject:     subject,
            htmlContent: html || text,
            textContent: text,
        };

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'api-key':      BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept':       'application/json',
            },
        });

        console.log(`[Mailer] Sent via Brevo to: ${to} | messageId: ${response.data.messageId}`);
        return { success: true, provider: 'brevo', messageId: response.data.messageId };
    } catch (error) {
        const detail = error.response?.data || error.message;
        console.error(`[Mailer] Brevo send failed to ${to}:`, detail);
        return { success: false, error: detail };
    }
};


// ─── Shared Email Wrapper ──────────────────────────────────────────────────────

const buildEmailWrapper = (innerHtml) => `
    <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 44px; padding: 0; vertical-align: middle;">
                        <img src="${LOGO_URL}" alt="SmartNutri Logo" style="height: 40px; width: 40px; border-radius: 20px; display: block;" />
                    </td>
                    <td style="padding: 0 0 0 12px; vertical-align: middle;">
                        <h1 style="color: #059669; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">SmartNutri-AI</h1>
                        <p style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin: 2px 0 0 0;">Nutritionist Verification System</p>
                    </td>
                </tr>
            </table>
        </div>
        ${innerHtml}
        <!-- Footer -->
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin: 0;">© 2026 SmartNutri-AI Clinical Station</p>
    </div>
`;


// ─── 1. OTP Verification Email ─────────────────────────────────────────────────

export const sendOtpEmail = async (email, otpCode, fullName) => {
    const html = `
        <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
                <img src="${LOGO_URL}" alt="SmartNutri Logo" style="height: 48px; width: 48px; border-radius: 24px; margin: 0 auto 12px auto; display: block;" />
                <h1 style="color: #059669; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">SmartNutri-AI</h1>
                <p style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin: 4px 0 0 0;">Identity Verification Gateway</p>
            </div>
            
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">Hello ${fullName || 'Valued User'},</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">Thank you for registering with SmartNutri-AI. To complete your clinical identity verification and finalize your registration, please enter the following 6-digit verification code:</p>
            
            <div style="margin: 36px 0; text-align: center;">
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 24px 40px; display: inline-block; font-size: 36px; font-weight: 900; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace; box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);">
                    ${otpCode}
                </div>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; margin-bottom: 32px;">This One-Time Password (OTP) is valid for <strong style="color: #059669;">2 minutes</strong> and can only be used once.</p>
            
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.6; text-align: center;">For security reasons, never share this code with anyone. SmartNutri staff will never ask for your verification code.</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            
            <p style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">© 2026 SmartNutri-AI Clinical Station</p>
        </div>
    `;

    return sendViaBrevo({
        to:      email,
        subject: 'Your SmartNutri-AI Verification Code',
        html,
        text:    `Hello ${fullName || 'Valued User'},\n\nYour SmartNutri-AI verification code is: ${otpCode}\n\nThis code is valid for 2 minutes. Never share it with anyone.`,
    });
};


// ─── 2. Password Reset Email ───────────────────────────────────────────────────

export const sendResetPasswordEmail = async (email, token, fullName) => {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 40px; padding: 0; vertical-align: middle;">
                            <img src="${LOGO_URL}" alt="SmartNutri Logo" style="height: 36px; width: 36px; border-radius: 18px; display: block;" />
                        </td>
                        <td style="padding: 0 0 0 12px; vertical-align: middle;">
                            <h1 style="color: #059669; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">SmartNutri-AI Recovery</h1>
                        </td>
                    </tr>
                </table>
            </div>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">Hello ${fullName || 'there'},</p>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">You requested to reset your password for your SmartNutri-AI clinical account. Click the button below to set a new password. This link is valid for 1 hour.</p>
            
            <div style="margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; display: inline-block;">Reset Password</a>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            
            <p style="font-size: 11px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">© 2026 SmartNutri-AI Clinical Engine</p>
        </div>
    `;

    return sendViaBrevo({
        to:      email,
        subject: 'Reset Your SmartNutri-AI Password',
        html,
        text:    `Hello ${fullName || 'there'},\n\nReset your SmartNutri-AI password using this link (valid 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    });
};


// ─── 3. Nutritionist Approval Email ───────────────────────────────────────────

export const sendApprovalEmail = async (nutritionist) => {
    const { email, full_name } = nutritionist;
    const loginUrl = `${APP_URL}/login`;

    const inner = `
        <!-- Badge -->
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #6ee7b7; border-radius: 50px; padding: 10px 24px;">
                <span style="color: #065f46; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">✅ Account Approved</span>
            </div>
        </div>

        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 12px 0;">Hi <strong style="color: #0f172a;">${full_name || 'Nutritionist'}</strong>,</p>

        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Congratulations! 🎉 Your <strong>SmartNutri-AI nutritionist account</strong> has been reviewed and <strong style="color: #059669;">officially approved</strong> by our administrative team.
        </p>

        <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 24px 0;">
            You now have full access to your nutritionist dashboard where you can:
        </p>

        <ul style="font-size: 14px; color: #475569; line-height: 2; padding-left: 24px; margin: 0 0 28px 0;">
            <li>View and manage your assigned client profiles</li>
            <li>Monitor children's meal logs and nutritional progress</li>
            <li>Add clinical notes and personalized recommendations</li>
            <li>Collaborate with parents on meal planning</li>
        </ul>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="background-color: #059669; color: #ffffff; padding: 16px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; display: inline-block; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">Go to Dashboard →</a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; margin: 0;">
            Having trouble? Contact us at <a href="mailto:snutri244@gmail.com" style="color: #059669; text-decoration: none;">snutri244@gmail.com</a>
        </p>
    `;

    return sendViaBrevo({
        to:      email,
        subject: '🎉 Your SmartNutri-AI Account Has Been Approved!',
        html:    buildEmailWrapper(inner),
        text:    `Hi ${full_name},\n\nCongratulations! Your SmartNutri-AI nutritionist account has been approved.\n\nYou can now log in and access your dashboard:\n${loginUrl}\n\nWelcome aboard,\nThe SmartNutri-AI Team\nsnutri244@gmail.com`,
    });
};


// ─── 4. Nutritionist Rejection Email ──────────────────────────────────────────

export const sendRejectionEmail = async (nutritionist, reason = null) => {
    const { email, full_name } = nutritionist;
    const supportEmail = 'snutri244@gmail.com';

    const reasonBlock = reason
        ? `<div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 16px 20px; margin: 20px 0;">
               <p style="font-size: 13px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px 0;">Review Note from Admin:</p>
               <p style="font-size: 14px; color: #7c2d12; line-height: 1.6; margin: 0;">${reason}</p>
           </div>`
        : '';

    const inner = `
        <!-- Badge -->
        <div style="text-align: center; margin-bottom: 28px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 2px solid #fca5a5; border-radius: 50px; padding: 10px 24px;">
                <span style="color: #991b1b; font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">Application Status Update</span>
            </div>
        </div>

        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 12px 0;">Hi <strong style="color: #0f172a;">${full_name || 'Applicant'}</strong>,</p>

        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            Thank you for your interest in joining the <strong>SmartNutri-AI</strong> platform as a registered nutritionist. After careful review by our team, we regret to inform you that your application was <strong style="color: #dc2626;">not approved</strong> at this time.
        </p>

        ${reasonBlock}

        <p style="font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 16px 0;">
            If you believe this decision was made in error, or if you would like to:
        </p>
        <ul style="font-size: 14px; color: #475569; line-height: 2; padding-left: 24px; margin: 0 0 24px 0;">
            <li>Submit updated or additional supporting documents</li>
            <li>Appeal the decision for re-review</li>
            <li>Request clarification on the requirements</li>
        </ul>

        <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 28px 0;">
            Please don't hesitate to reach out to our support team. We're happy to assist you through the reapplication process.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
            <a href="mailto:${supportEmail}?subject=Re: Application Appeal - ${encodeURIComponent(full_name)}" style="background-color: #0f172a; color: #ffffff; padding: 16px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">Contact Support →</a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; margin: 0;">
            Or email us directly: <a href="mailto:${supportEmail}" style="color: #059669; text-decoration: none;">${supportEmail}</a>
        </p>
    `;

    return sendViaBrevo({
        to:      email,
        subject: 'Your SmartNutri-AI Application Status Update',
        html:    buildEmailWrapper(inner),
        text:    `Hi ${full_name},\n\nWe regret to inform you that your SmartNutri-AI nutritionist application was not approved at this time.\n${reason ? `\nReason: ${reason}\n` : ''}\nIf you would like to appeal or resubmit, please contact us:\n${supportEmail}\n\nThank you for your interest,\nThe SmartNutri-AI Team`,
    });
};


// ─── 5. Nutritionist Status Email with Retry ───────────────────────────────────

/**
 * Retry wrapper for nutritionist status emails.
 * Retries up to maxRetries times with exponential backoff.
 * Logs success/failure to audit_logs (non-blocking — errors are caught internally).
 *
 * @param {'approved'|'rejected'} status - The new status value
 * @param {{ id: string, email: string, full_name: string }} nutritionist
 * @param {Function} logAuditFn - The logAuditAction function (passed to avoid circular imports)
 * @param {string} adminId - Admin performing the action
 * @param {number} [maxRetries=3]
 * @param {string} [rejectionReason] - Optional rejection reason (only for rejected status)
 */
export const sendStatusEmailWithRetry = async ({
    status,
    nutritionist,
    logAuditFn,
    adminId,
    maxRetries = 3,
    rejectionReason = null
}) => {
    if (!['approved', 'rejected'].includes(status)) return; // No email for 'pending'

    const delays = [0, 2000, 5000]; // ms delay before each attempt
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (attempt > 1) {
            const delay = delays[attempt - 1] ?? 5000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = status === 'approved'
            ? await sendApprovalEmail(nutritionist)
            : await sendRejectionEmail(nutritionist, rejectionReason);

        if (result.success) {
            // Log success to audit_logs
            await logAuditFn({
                adminId,
                targetId:   nutritionist.id,
                action:     status === 'approved' ? 'EMAIL_APPROVAL_SENT' : 'EMAIL_REJECTION_SENT',
                entityType: 'USER',
                entityId:   nutritionist.id,
                details: {
                    to:       nutritionist.email,
                    status,
                    attempts: attempt,
                    provider: result.provider || 'brevo',
                }
            });
            return; // Done
        }

        lastError = result.error;
        console.warn(`[Mailer] Attempt ${attempt}/${maxRetries} failed for ${nutritionist.email}. ${attempt < maxRetries ? 'Retrying...' : 'Giving up.'}`);
    }

    // All retries exhausted — log the failure
    await logAuditFn({
        adminId,
        targetId:   nutritionist.id,
        action:     'EMAIL_SEND_FAILED',
        entityType: 'USER',
        entityId:   nutritionist.id,
        details: {
            to:       nutritionist.email,
            status,
            attempts: maxRetries,
            error:    typeof lastError === 'string' ? lastError : JSON.stringify(lastError),
        }
    });
};


// ─── 6. Support Ticket Email ───────────────────────────────────────────────────

export const sendSupportTicketEmail = async (contactDetails) => {
    const { name, email, role, subject, message } = contactDetails;

    const html = `
        <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 40px; padding: 0; vertical-align: middle;">
                            <img src="${LOGO_URL}" alt="SmartNutri Logo" style="height: 36px; width: 36px; border-radius: 18px; display: block;" />
                        </td>
                        <td style="padding: 0 0 0 12px; vertical-align: middle;">
                            <h1 style="color: #059669; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin: 0;">New Support Ticket</h1>
                            <p style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 2px 0 0 0;">SmartNutri-AI Clinical Support Center</p>
                        </td>
                    </tr>
                </table>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 0; font-weight: bold; color: #475569; width: 120px;">Sender Name:</td>
                    <td style="padding: 10px 0; color: #0f172a;">${name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 0; font-weight: bold; color: #475569;">Email Address:</td>
                    <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${email}" style="color: #059669; text-decoration: none;">${email}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 0; font-weight: bold; color: #475569;">Identity Role:</td>
                    <td style="padding: 10px 0; color: #0f172a; text-transform: capitalize;">${role}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 0; font-weight: bold; color: #475569;">Subject:</td>
                    <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${subject}</td>
                </tr>
            </table>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; font-size: 15px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            
            <div style="margin-top: 32px; text-align: center;">
                <a href="mailto:${email}" style="background-color: #059669; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block;">Reply Directly to Sender</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            <p style="font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">© 2026 SmartNutri-AI Clinical Support System</p>
        </div>
    `;

    return sendViaBrevo({
        to:      'snutri244@gmail.com',
        subject: `[Support Ticket] ${subject} - ${name} (${role})`,
        html,
        text:    `New support ticket from ${name} (${email}) — Role: ${role}\nSubject: ${subject}\n\n${message}`,
    });
};
