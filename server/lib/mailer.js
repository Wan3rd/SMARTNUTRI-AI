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

export const sendResetPasswordEmail = async (email, token, fullName) => {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    
    const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: 'Reset Your SmartNutri-AI Password',
        html: `
            <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px;">
                <h1 style="color: #059669; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em; margin-bottom: 16px;">SmartNutri-AI Recovery</h1>
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
