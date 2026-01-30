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

const formatAnswerValue = (value) => {
  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '—';
  }
  return value || '—';
};

const answerLabels = {
  area: 'Площадь помещения',
  services: 'Услуги',
  style: 'Стиль',
  budget: 'Бюджет'
};

const formatAnswerLabel = (key) => answerLabels[key] || key;

const generateAnswersHTML = (answers) => {
  const items = Object.entries(answers || {}).map(([key, value]) => `
    <div class="field">
      <span class="label">${formatAnswerLabel(key)}</span>
      <span>${formatAnswerValue(value)}</span>
    </div>
  `);
  return items.length ? items.join('') : '<div class="field">Ответы отсутствуют</div>';
};

const generateAnswersText = (answers) => {
  const items = Object.entries(answers || {}).map(([key, value]) => {
    return `${formatAnswerLabel(key)}: ${formatAnswerValue(value)}`;
  });
  return items.length ? items.join('\n') : 'Ответы отсутствуют';
};

const contactMethodLabels = {
  telegram: 'Telegram',
  messenger: 'MAX',
  email: 'Email'
};

const formatContactMethod = (value) => contactMethodLabels[value] || value;

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
      .field { margin-bottom: 10px; }
      .label { font-weight: 600; display: block; margin-bottom: 4px; }
      .block { background: #f7f7f7; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
      .meta { margin-top: 16px; font-size: 12px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Новая заявка из калькулятора студии «ИМПЕРА»</h1>
      <div class="block">
        <div class="field">
          <span class="label">Имя:</span>
          <span>${data.name}</span>
        </div>
        <div class="field">
          <span class="label">Телефон:</span>
          <span>${data.phone}</span>
        </div>
        <div class="field">
          <span class="label">Способ связи:</span>
          <span>${formatContactMethod(data.contactMethod)}</span>
        </div>
        <div class="field">
          <span class="label">Согласие:</span>
          <span>${data.consent ? 'Да' : 'Нет'}</span>
        </div>
      </div>
      <div class="block">
        <span class="label">Ответы:</span>
        ${generateAnswersHTML(data.answers)}
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
Новая заявка из калькулятора Impera Design
${'='.repeat(48)}
Имя: ${data.name}
Телефон: ${data.phone}
Способ связи: ${formatContactMethod(data.contactMethod)}
Согласие: ${data.consent ? 'Да' : 'Нет'}

Ответы:
${generateAnswersText(data.answers)}

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
      .block { background: #f7f7f7; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
      .label { font-weight: 600; display: block; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Мы получили вашу заявку</h1>
      <p>Спасибо! Мы свяжемся с вами в ближайшее время.</p>
      <div class="block">
        <div class="label">Ваши ответы:</div>
        ${generateAnswersHTML(data.answers)}
      </div>
      <div class="block">
        <div class="label">Контакты:</div>
        <div>Имя: ${data.name}</div>
        <div>Телефон: ${data.phone}</div>
        <div>Email: ${data.email}</div>
      </div>
    </div>
  </body>
  </html>
`;

const generateUserPlainText = (data) => `
Мы получили вашу заявку
${'='.repeat(32)}
Спасибо! Мы свяжемся с вами в ближайшее время.

Ваши ответы:
${generateAnswersText(data.answers)}

Контакты:
Имя: ${data.name}
Телефон: ${data.phone}
Email: ${data.email}
`.trim();

export const sendCalculatorAdminEmail = async (data) => {
  const transporter = createTransporter();
  const sender = getEmailSender();
  const mailOptions = {
    from: `"${sender.name}" <${sender.email}>`,
    to: getAdminEmail(),
    subject: 'Новая заявка из калькулятора',
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

export const sendCalculatorUserEmail = async (data) => {
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
