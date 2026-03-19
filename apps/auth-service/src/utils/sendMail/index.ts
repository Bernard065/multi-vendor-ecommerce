import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import ejs from 'ejs';
import path from 'path';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    service: process.env.SMTP_SERVICE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Render EJS template 
const renderTemplate = async (templateName: string, data: Record<string, unknown>): Promise<string> => {
    // Use process.cwd() to get the project root, then construct the path
    const projectRoot = process.cwd();
    const templatePath = path.join(projectRoot, 'apps', 'auth-service', 'src', 'utils', 'email-templates', `${templateName}.ejs`);
    
    console.log('Template path:', templatePath);

    return ejs.renderFile(templatePath, data);
}

// Send email
export const sendEmail = async (to: string, subject: string, templateName: string, data: Record<string, unknown>): Promise<void> => {
    try {
        const html = await renderTemplate(templateName, data);

        const mailOptions = {
            from: process.env.SMTP_USER,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
}