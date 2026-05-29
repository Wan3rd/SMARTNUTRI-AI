import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import config from '../../env_config.js';

dotenv.config();

// Defensive initialization
const initializeSendGrid = () => {
    const apiKey = process.env.SENDGRID_API_KEY?.trim();
    if (apiKey) {
        sgMail.setApiKey(apiKey);
    }
};

initializeSendGrid();

const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || 'noreply@smartnutri-ai.com';
const APP_URL = config.client.url; 
const LOGO_URL = 'https://smartnutri-ai-xmn9.vercel.app/SmartNutri-logo.png';

export const sendResetPasswordEmail = async (email, token, fullName) => {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: 'Reset Your SmartNutri-AI Password',
        html: `
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
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Reset email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return { success: false, error };
    }
};

export const sendOtpEmail = async (email, otpCode, fullName) => {
    const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: 'Your SmartNutri-AI Verification Code',
        html: `
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
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`OTP verification email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid OTP Send Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return { success: false, error };
    }
};

export const sendSupportTicketEmail = async (contactDetails) => {
    const { name, email, role, subject, message } = contactDetails;
    
    const msg = {
        to: 'snutri244@gmail.com', // Official Support Inbox
        from: FROM_EMAIL,
        replyTo: email, // Set Reply-To to the sender's email so admins can reply directly
        subject: `[Support Ticket] ${subject} - ${name} (${role})`,
        html: `
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
                
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; font-size: 15px; color: #334155; line-height: 1.6; white-space: pre-wrap;">
                    ${message}
                </div>
                
                <div style="margin-top: 32px; text-align: center;">
                    <a href="mailto:${email}" style="background-color: #059669; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block;">Reply Directly to Sender</a>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
                <p style="font-size: 10px; color: #94a3b8; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">© 2026 SmartNutri-AI Clinical Support System</p>
            </div>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Support ticket email successfully sent to snutri244@gmail.com from ${email}`);
        return { success: true };
    } catch (error) {
        console.error('SendGrid Support Ticket Send Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return { success: false, error };
    }
};
