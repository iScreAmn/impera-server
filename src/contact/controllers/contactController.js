import { sendContactAdminEmail, sendContactUserEmail } from '../services/emailService.js';
import { sendContactTelegramNotification } from '../../telegram/services/notifications.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{7,15}$/;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    return `+7${cleaned.slice(1)}`;
  }
  if (cleaned.length >= 10 && !cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }
  return cleaned;
};

export const submitContact = async (req, res) => {
  try {
    const { name, phone, email, message, _company } = req.body;

    if (typeof _company === 'string' && _company.trim()) {
      return res.status(200).json({
        success: true,
        message: 'Спасибо! Заявка принята.'
      });
    }

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'phone']
      });
    }

    const emailVal = typeof email === 'string' ? email.trim() : '';
    if (emailVal && !emailRegex.test(emailVal)) {
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
      name: name.trim(),
      phone: normalizedPhone,
      email: emailVal,
      message: typeof message === 'string' ? message.trim() : '',
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

    const telegramPromise = sendContactTelegramNotification(emailData)
      .then((result) => {
        console.log('Contact telegram notification result:', result);
        return result;
      })
      .catch((err) => {
        console.error(
          'Contact telegram notification failed:',
          err?.message || err,
          err?.details || ''
        );
      });

    await Promise.all([
      sendContactAdminEmail(emailData),
      telegramPromise
    ]);

    console.log('Contact submission successful:', {
      name: emailData.name,
      phone: emailData.phone,
      email: emailData.email,
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
    console.error('Contact submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
