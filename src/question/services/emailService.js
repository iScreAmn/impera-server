import pkg from 'nodemailer';
const { createTransport } = pkg;
import { getEmailConfig, getAdminEmail, getEmailSender } from '../config/email.js';

const createTransporter = () => {
  const config = getEmailConfig();
  console.log('Creating transporter with config:', {
    host: config.host,
    port: config.port,
    user: config.auth.user,
    hasPass: !!config.auth.pass
  });
  return createTransport(config);
};

const generateEmailHTML = (data) => `
  <!DOCTYPE html>
  <html lang="ru">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #222; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      .field { margin-bottom: 12px; }
      .label { font-weight: 600; display: block; margin-bottom: 4px; }
      .message { background: #f7f7f7; padding: 12px; border-radius: 6px; }
      .meta { margin-top: 16px; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Новый вопрос с сайта Impera Design</h1>
      <div class="field">
        <span class="label">Имя:</span>
        <span>${data.name}</span>
      </div>
      <div class="field">
        <span class="label">Способ связи:</span>
        <span>${data.contactMethod}</span>
      </div>
      <div class="field">
        <span class="label">Контакт для ответа:</span>
        <span>${data.contactValue || '—'}</span>
      </div>
      <div class="field">
        <span class="label">Вопрос:</span>
        <div class="message">${data.question}</div>
      </div>
      <div class="meta">
        Отправлено: ${data.submitted_at}<br />
        ${data.ip ? `IP: ${data.ip}<br />` : ''}
        ${data.userAgent ? `User Agent: ${data.userAgent}` : ''}
      </div>
    </div>
  </body>
  </html>
`;

const generatePlainText = (data) => `
Новый вопрос с сайта Impera Design
${'='.repeat(36)}
Имя: ${data.name}
Способ связи: ${data.contactMethod}
Контакт для ответа: ${data.contactValue || '—'}
Вопрос: ${data.question}

Отправлено: ${data.submitted_at}
${data.ip ? `IP: ${data.ip}\n` : ''}${data.userAgent ? `User Agent: ${data.userAgent}` : ''}
`.trim();

export const sendQuestionAdminEmail = async (data) => {
  const transporter = createTransporter();
  const sender = getEmailSender();
  const mailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: getAdminEmail(),
    subject: 'Новый вопрос с сайта Impera Design',
    html: generateEmailHTML(data),
    text: generatePlainText(data)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Admin email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Admin email sending failed:', error.message);
    throw error;
  }
};

export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error.message);
    return false;
  }
};
