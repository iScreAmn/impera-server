import { sendCtaAdminEmail } from '../services/emailService.js';
import { sendCtaTelegramNotification } from '../../telegram/services/notifications.js';

const phoneRegex = /^\+?[0-9]{7,15}$/;

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith('8')) return `+7${cleaned.slice(1)}`;
  if (cleaned.length >= 10 && !cleaned.startsWith('+')) return `+${cleaned}`;
  return cleaned;
};

export const submitCta = async (req, res) => {
  try {
    const { name, phone, agree, _company } = req.body;

    if (typeof _company === 'string' && _company.trim()) {
      return res.status(200).json({ success: true, message: 'Спасибо! Заявка принята.' });
    }

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Укажите имя и номер телефона',
        required: ['name', 'phone']
      });
    }

    if (!agree) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо согласие на обработку персональных данных'
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Укажите корректный номер телефона'
      });
    }

    const emailData = {
      name: String(name).trim(),
      phone: normalizedPhone,
      agree: Boolean(agree),
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

    const telegramPromise = sendCtaTelegramNotification(emailData)
      .then((r) => { console.log('CTA telegram result:', r); return r; })
      .catch((err) => {
        console.error('CTA telegram failed:', err?.message || err);
      });

    await Promise.all([
      sendCtaAdminEmail(emailData),
      telegramPromise
    ]);

    console.log('CTA submission successful:', { name: emailData.name, phone: emailData.phone, timestamp: emailData.submitted_at });

    return res.status(200).json({
      success: true,
      message: 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.'
    });
  } catch (error) {
    console.error('CTA submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Ошибка при отправке. Пожалуйста, попробуйте позже.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
