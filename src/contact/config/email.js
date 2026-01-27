/**
 * Email configuration for nodemailer
 * Function to get config at runtime (after .env is loaded)
 */
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
    tls: {
      rejectUnauthorized: false
    }
  };
};

export const emailConfig = getEmailConfig();

/**
 * Admin email configuration
 * Function to get admin email at runtime (after .env is loaded)
 */
export const getAdminEmail = () => {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error('ADMIN_EMAIL is not configured in .env file!');
  }
  return email;
};

export const adminEmail = process.env.ADMIN_EMAIL;

/**
 * Email sender configuration
 * Function to get sender at runtime (after .env is loaded)
 */
export const getEmailSender = () => ({
  name: 'Impera Design',
  email: process.env.SMTP_USER || process.env.ADMIN_EMAIL
});
