import { sendCalculatorAdminEmail, sendCalculatorUserEmail } from '../services/emailService.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{7,15}$/;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  return cleaned;
};

export const submitCalculator = async (req, res) => {
  try {
    const { answers, contact, _company } = req.body;
    const {
      name,
      phone,
      email,
      contactMethod,
      consent
    } = contact || {};

    if (typeof _company === 'string' && _company.trim()) {
      return res.status(200).json({
        success: true,
        message: 'Спасибо! Заявка принята.'
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['answers', 'contact']
      });
    }

    if (!name || !phone || !email || !contactMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'phone', 'email', 'contactMethod']
      });
    }

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required'
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone format. Expected 7-15 digits (optionally with +).'
      });
    }

    const emailData = {
      answers,
      name: name.trim(),
      phone: normalizedPhone,
      email: email.trim(),
      contactMethod,
      consent: Boolean(consent),
      submitted_at: new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent') || 'Unknown'
    };

    await sendCalculatorAdminEmail(emailData);

    console.log('Calculator submission successful:', {
      name: emailData.name,
      phone: emailData.phone,
      email: emailData.email,
      contactMethod: emailData.contactMethod,
      timestamp: emailData.submitted_at
    });

    return res.status(200).json({
      success: true,
      message: 'Заявка успешно отправлена!',
      data: {
        timestamp: emailData.submitted_at
      }
    });
  } catch (error) {
    console.error('Calculator submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
