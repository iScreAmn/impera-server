import { sendQuestionAdminEmail } from '../services/emailService.js';

const contactMethodLabels = {
  telegram: 'Telegram',
  max: 'Max',
  email: 'Email'
};

export const submitQuestion = async (req, res) => {
  try {
    const { name, contactMethod, question, _company } = req.body;

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

    const methodKey = String(contactMethod).trim();
    const emailData = {
      name: String(name).trim(),
      contactMethod: contactMethodLabels[methodKey] || methodKey,
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

    await sendQuestionAdminEmail(emailData);

    console.log('Question submission successful:', {
      name: emailData.name,
      contactMethod: emailData.contactMethod,
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
