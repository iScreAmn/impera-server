import { sendCalculatorAdminEmail, sendCalculatorUserEmail } from '../services/emailService.js';
import { sendCalculatorTelegramNotification } from '../../telegram/services/notifications.js';

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

export const submitCalculator = async (req, res) => {
  try {
    const { answers, contact, _company } = req.body;
    console.log('Received calculator submission:', { answers, contact, _company });
    
    const {
      name,
      phone,
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

    if (!name || !phone || !contactMethod) {
      console.log('Missing fields check:', { name: !!name, phone: !!phone, contactMethod: !!contactMethod });
      console.log('Actual values:', { name, phone, contactMethod });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'phone', 'contactMethod']
      });
    }

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required'
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

    const [emailResult, telegramResult] = await Promise.allSettled([
      sendCalculatorAdminEmail(emailData),
      sendCalculatorTelegramNotification(emailData)
    ]);

    if (telegramResult.status === 'fulfilled') {
      console.log('Calculator telegram notification result:', telegramResult.value);
    } else {
      console.error(
        'Calculator telegram notification failed:',
        telegramResult.reason?.message || telegramResult.reason,
        telegramResult.reason?.details || ''
      );
    }

    if (emailResult.status === 'rejected') {
      throw emailResult.reason;
    }

    console.log('Calculator submission successful:', {
      name: emailData.name,
      phone: emailData.phone,
      contactMethod: emailData.contactMethod,
      timestamp: emailData.submitted_at
    });

    const telegramPayload =
      telegramResult.status === 'fulfilled'
        ? {
            ok: true,
            okCount:
              typeof telegramResult.value?.okCount === 'number'
                ? telegramResult.value.okCount
                : null,
            skipped: Boolean(telegramResult.value?.skipped)
          }
        : {
            ok: false,
            error:
              telegramResult.reason?.message ||
              String(telegramResult.reason ?? 'Unknown error')
          };

    const payload = {
      success: true,
      message: 'Заявка успешно отправлена!',
      data: {
        timestamp: emailData.submitted_at,
        telegram: telegramPayload
      }
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error('Calculator submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
