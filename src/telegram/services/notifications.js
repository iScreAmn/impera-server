import { sendTelegramMessage, telegram } from './telegramClient.js';

const { escapeHtml } = telegram;

const formatAnswerValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value || '—';
};

const answerLabels = {
  area: 'Площадь помещения',
  services: 'Услуги',
  style: 'Стиль',
  budget: 'Бюджет'
};

const formatAnswerLabel = (key) => answerLabels[key] || key;

const contactMethodLabels = {
  telegram: 'Telegram',
  messenger: 'MAX',
  max: 'Max',
  email: 'Email'
};

const formatContactMethod = (value) => contactMethodLabels[value] || value;

const linesToHtml = (lines) => lines.filter(Boolean).join('\n');

export const sendCalculatorTelegramNotification = async (data) => {
  const answersLines = Object.entries(data.answers || {}).map(([key, value]) => {
    return `- <b>${escapeHtml(formatAnswerLabel(key))}:</b> ${escapeHtml(formatAnswerValue(value))}`;
  });

  const html = linesToHtml([
    `<b>Новая заявка из калькулятора студии «ИМПЕРА»</b>`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name)}`,
    `<b>Телефон:</b> ${escapeHtml(data.phone)}`,
    `<b>Способ связи:</b> ${escapeHtml(formatContactMethod(data.contactMethod))}`,
    `<b>Согласие:</b> ${data.consent ? 'Да' : 'Нет'}`,
    ``,
    `<b>Ответы:</b>`,
    answersLines.length ? answersLines.join('\n') : 'Ответы отсутствуют',
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`
  ]);

  return sendTelegramMessage(html);
};

export const sendContactTelegramNotification = async (data) => {
  const html = linesToHtml([
    `<b>Новая заявка с сайта студии «ИМПЕРА»</b>`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name)}`,
    `<b>Телефон:</b> ${escapeHtml(data.phone)}`,
    `<b>Email:</b> ${escapeHtml(data.email)}`,
    `<b>Сообщение:</b> ${escapeHtml(data.message || '—')}`,
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`
  ]);

  return sendTelegramMessage(html);
};

export const sendQuestionTelegramNotification = async (data) => {
  const html = linesToHtml([
    `<b>Новый вопрос с сайта студии «ИМПЕРА»</b>`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name)}`,
    `<b>Способ связи:</b> ${escapeHtml(data.contactMethod)}`,
    `<b>Контакт для ответа:</b> ${escapeHtml(data.contactValue || '—')}`,
    `<b>Вопрос:</b> ${escapeHtml(data.question)}`,
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`
  ]);

  return sendTelegramMessage(html);
};

export const sendCtaTelegramNotification = async (data) => {
  const html = linesToHtml([
    `<b>Заявка из блока призыва к действию, студии «ИМПЕРА»</b>`,
    ``,
    `<b>Имя:</b> ${escapeHtml(data.name)}`,
    `<b>Телефон:</b> ${escapeHtml(data.phone)}`,
    `<b>Согласие:</b> ${data.agree ? 'Да' : 'Нет'}`,
    ``,
    `<b>Отправлено:</b> ${escapeHtml(data.submitted_at)}`
  ]);

  return sendTelegramMessage(html);
};

