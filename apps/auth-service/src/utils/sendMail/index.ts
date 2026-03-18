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
        pass: process.env.SMTP_PASSWORD,
    },
})

// Render EJS template 
const renderTemplate = async (templateName: string, data: Record<string, unknown>): Promise<string> => {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.ejs`);

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