export const getEmailConfig = () => {
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
  };
};

export const getAdminEmail = () => {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL is not configured in .env file!');
  return email;
};

export const getEmailSender = () => ({
  name: 'Impera Design',
  email: process.env.SMTP_USER || process.env.ADMIN_EMAIL
});
