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
      .meta { margin-top: 16px; font-size: 12px; color: #666; }
      .message { background: #f7f7f7; padding: 12px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Новая заявка с сайта студии «ИМПЕРА»</h1>
      <div class="field">
        <span class="label">Имя:</span>
        <span>${data.name}</span>
      </div>
      <div class="field">
        <span class="label">Телефон:</span>
        <span>${data.phone}</span>
      </div>
      <div class="field">
        <span class="label">Email:</span>
        <span>${data.email || '—'}</span>
      </div>
      <div class="field">
        <span class="label">Сообщение:</span>
        <div class="message">${data.message || '—'}</div>
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
Новая заявка с сайта студии «ИМПЕРА»
${'='.repeat(40)}
Имя: ${data.name}
Телефон: ${data.phone}
Email: ${data.email || '—'}
Сообщение: ${data.message || '—'}

Отправлено: ${data.submitted_at}
${data.ip ? `IP: ${data.ip}\n` : ''}${data.userAgent ? `User Agent: ${data.userAgent}` : ''}
`.trim();

const generateUserEmailHTML = (data) => `
  <!DOCTYPE html>
  <html lang="ru">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #222; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      h1 { font-size: 20px; margin-bottom: 12px; }
      .message { background: #f7f7f7; padding: 12px; border-radius: 6px; }
      .label { font-weight: 600; display: block; margin-top: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Мы получили вашу заявку</h1>
      <p>Спасибо за обращение! Мы свяжемся с вами в ближайшее время.</p>
      <div class="label">Ваши данные:</div>
      <div>Имя: ${data.name}</div>
      <div>Телефон: ${data.phone}</div>
      <div class="label">Сообщение:</div>
      <div class="message">${data.message || '—'}</div>
    </div>
  </body>
  </html>
`;

const generateUserPlainText = (data) => `
Мы получили вашу заявку
${'='.repeat(32)}
Спасибо за обращение! Мы свяжемся с вами в ближайшее время.

Ваши данные:
Имя: ${data.name}
Телефон: ${data.phone}
Email: ${data.email || '—'}
Сообщение: ${data.message || '—'}
`.trim();

export const sendContactAdminEmail = async (data) => {
  const transporter = createTransporter();
  const sender = getEmailSender();
  const mailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: getAdminEmail(),
    subject: 'Новая заявка с сайта Impera Design',
    html: generateEmailHTML(data),
    text: generatePlainText(data),
    replyTo: data.email ? `"${data.name}" <${data.email}>` : undefined
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

export const sendContactUserEmail = async (data) => {
  const transporter = createTransporter();
  const sender = getEmailSender();
  const mailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: data.email,
    subject: 'Мы получили вашу заявку',
    html: generateUserEmailHTML(data),
    text: generateUserPlainText(data)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('User email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('User email sending failed:', error.message);
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
