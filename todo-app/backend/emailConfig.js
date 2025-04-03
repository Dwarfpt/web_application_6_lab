// Конфигурация для Mail.ru
const emailConfig = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD,
  smtp: {
    host: 'smtp.mail.ru',
    port: 465,
    secure: true
  },
  imap: {
    host: 'imap.mail.ru',
    port: 993,
    tls: true
  },
  pop3: {
    host: 'pop.mail.ru',
    port: 995,
    tls: true
  }
};

module.exports = emailConfig;