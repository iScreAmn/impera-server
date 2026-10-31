import { sendQuestionAdminEmail } from '../services/emailService.js';
import { sendQuestionTelegramNotification } from '../../telegram/services/notifications.js';

const contactMethodLabels = {
  telegram: 'Telegram',
  max: 'Max',
  phone: 'Телефон',
  email: 'Email'
};

const phoneRegex = /^\+[0-9]{7,15}$/;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const submitQuestion = async (req, res) => {
  try {
    const { name, contactMethod, contactValue, question, _company } = req.body;

    if (typeof _company === 'string' && _company.trim()) {
      return res.status(200).json({
        success: true,
        message: 'Спасибо! Вопрос получен.'
      });
    }

    if (!name || !contactMethod || !question) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['name', 'contactMethod', 'question']
      });
    }

    const methodKey = String(contactMethod).trim().toLowerCase();
    const contactVal = typeof contactValue === 'string' ? contactValue.trim() : '';

    if (!contactVal) {
      return res.status(400).json({
        success: false,
        message: 'Укажите контакт для связи'
      });
    }

    if (methodKey === 'phone') {
      const normalized = contactVal.replace(/[^\d+]/g, '');
      if (!phoneRegex.test(normalized)) {
        return res.status(400).json({
          success: false,
          message: 'Укажите корректный номер телефона'
        });
      }
    } else if (methodKey === 'email') {
      if (!emailRegex.test(contactVal)) {
        return res.status(400).json({
          success: false,
          message: 'Неверный формат email'
        });
      }
    } else if (methodKey === 'telegram' || methodKey === 'max') {
      // @username; старые клиенты присылают номер телефона — он тоже проходит
      if (contactVal.length < 2 || contactVal.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Укажите корректный контакт для связи'
        });
      }
    }

    const emailData = {
      name: String(name).trim(),
      contactMethod: contactMethodLabels[methodKey] || methodKey,
      contactValue: contactVal,
      question: String(question).trim(),
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
      sendQuestionAdminEmail(emailData),
      sendQuestionTelegramNotification(emailData)
    ]);

    if (telegramResult.status === 'fulfilled') {
      console.log('Question telegram notification result:', telegramResult.value);
    } else {
      console.error(
        'Question telegram notification failed:',
        telegramResult.reason?.message || telegramResult.reason,
        telegramResult.reason?.details || ''
      );
    }

    if (emailResult.status === 'rejected') {
      console.error('Question admin email rejected:', emailResult.reason?.message || emailResult.reason);
    }

    const deliveryOk = emailResult.status === 'fulfilled' || telegramResult.status === 'fulfilled';
    if (!deliveryOk) {
      return res.status(500).json({
        success: false,
        message: 'Ошибка при отправке вопроса. Пожалуйста, попробуйте позже.',
        error: process.env.NODE_ENV === 'development' ? 'All delivery channels failed' : undefined
      });
    }

    console.log('Question submission successful:', {
      name: emailData.name,
      contactMethod: emailData.contactMethod,
      contactValue: emailData.contactValue,
      timestamp: emailData.submitted_at
    });

    return res.status(200).json({
      success: true,
      message: 'Вопрос успешно отправлен!'
    });
  } catch (error) {
    console.error('Question submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке вопроса. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
