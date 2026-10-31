import { sendCalculatorAdminEmail, sendCalculatorUserEmail } from '../services/emailService.js';
import { sendCalculatorTelegramNotification } from '../../telegram/services/notifications.js';

const phoneRegex = /^\+?[0-9]{7,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      email,
      contactMethod,
      contactValue,
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

    // contactValue — новый формат (@username или email); phone/email — старые клиенты
    const rawContact = [contactValue, contactMethod === 'email' ? email : '', phone]
      .find((v) => typeof v === 'string' && v.trim()) || '';
    const isLegacyPhone = !contactValue && !(contactMethod === 'email' && email) && Boolean(phone);

    if (!name || !rawContact || !contactMethod) {
      console.log('Missing fields check:', { name: !!name, contactValue: !!rawContact, contactMethod: !!contactMethod });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'contactValue', 'contactMethod']
      });
    }

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required'
      });
    }

    let normalizedContact = rawContact.trim();
    if (isLegacyPhone || contactMethod === 'phone') {
      normalizedContact = normalizePhone(rawContact);
      if (!phoneRegex.test(normalizedContact)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone format. Expected 7-15 digits (optionally with +).'
        });
      }
    } else if (contactMethod === 'email') {
      if (!emailRegex.test(normalizedContact)) {
        return res.status(400).json({
          success: false,
          message: 'Неверный формат email'
        });
      }
    } else if (normalizedContact.length < 2 || normalizedContact.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Укажите корректный контакт для связи'
      });
    }

    const emailData = {
      answers,
      name: name.trim(),
      contactValue: normalizedContact,
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
      console.error('Calculator admin email rejected:', emailResult.reason?.message || emailResult.reason);
      // Не возвращаем 500 — заявка могла дойти по Telegram; клиенту показываем успех
    }

    // После отправки (email и/или telegram) всегда отвечаем 200, иначе клиент покажет ошибку при успешной заявке
    const sendSuccess = () => {
      try {
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

        return res.status(200).json({
          success: true,
          message: 'Заявка успешно отправлена!',
          data: {
            timestamp: emailData.submitted_at,
            telegram: telegramPayload
          }
        });
      } catch (responseError) {
        console.error('Calculator response build/send error:', responseError);
        return res.status(200).json({
          success: true,
          message: 'Заявка успешно отправлена!'
        });
      }
    };

    console.log('Calculator submission successful:', {
      name: emailData.name,
      contactValue: emailData.contactValue,
      contactMethod: emailData.contactMethod,
      timestamp: emailData.submitted_at
    });

    return sendSuccess();
  } catch (error) {
    console.error('Calculator submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
