// Добавьте эту строку в самое начало файла, перед импортами
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const POP3Client = require('poplib');
const fs = require('fs');
const path = require('path');

// Импортируем конфигурацию
const emailConfig = require('./emailConfig');

// Функция для отправки писем через SMTP
async function sendEmail(to, subject, text, html) {
  try {
    console.log(`Отправка письма на ${to} с темой: ${subject}`);
    
    // Создаем транспорт
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const info = await transporter.sendMail({
      from: `Todo App <${emailConfig.user}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text.replace(/\n/g, '<br>')
    });
    
    console.log(`Письмо отправлено: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Ошибка при отправке письма:', error);
    return { success: false, error: error.message };
  }
}

// Функция для получения писем через IMAP
async function getEmailsViaIMAP(count = 5) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Получение писем через IMAP...');
      console.log(`Подключение к ${emailConfig.imap.host}:${emailConfig.imap.port} как ${emailConfig.user}`);
      
      const imap = new Imap({
        user: emailConfig.user,
        password: emailConfig.pass,
        host: emailConfig.imap.host,
        port: emailConfig.imap.port,
        tls: emailConfig.imap.tls,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        connTimeout: 10000,
        debug: console.log,
        tlsOptions: {
          rejectUnauthorized: false,
          secureProtocol: 'TLSv1_2_method'
        }
      });
      
      const emails = [];
      let imapTimeout;
      
      // Устанавливаем общий таймаут
      imapTimeout = setTimeout(() => {
        console.error('IMAP таймаут соединения');
        try { imap.end(); } catch (e) {}
        resolve(getDemoEmails());
      }, 15000);
      
      imap.once('ready', () => {
        clearTimeout(imapTimeout); // Очищаем таймаут при успехе
        console.log('IMAP соединение установлено. Открываем почтовый ящик INBOX...');
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error('Ошибка при открытии почтового ящика:', err);
            imap.end();
            resolve(getDemoEmails());
            return;
          }
          
          console.log(`Почтовый ящик открыт. Всего писем: ${box.messages.total}`);
          
          // Получаем последние count писем
          const total = box.messages.total;
          if (total === 0) {
            console.log('Почтовый ящик пуст.');
            imap.end();
            resolve([]);
            return;
          }
          
          const range = `${Math.max(total - count + 1, 1)}:${total}`;
          console.log(`Получаем письма в диапазоне: ${range}`);
          
          const fetch = imap.seq.fetch(range, {
            bodies: '',
            struct: true
          });
          
          fetch.on('message', (msg, seqno) => {
            console.log(`Получено письмо #${seqno}`);
            
            msg.on('body', async (stream, info) => {
              try {
                const parsed = await simpleParser(stream);
                emails.push({
                  from: parsed.from ? parsed.from.text : 'Неизвестный отправитель',
                  subject: parsed.subject || 'Без темы',
                  date: parsed.date || new Date(),
                  text: parsed.text || parsed.textAsHtml || 'Письмо без содержимого'
                });
                console.log(`Письмо #${seqno} успешно обработано, тема: ${parsed.subject}`);
              } catch (parseErr) {
                console.error(`Ошибка при парсинге письма #${seqno}:`, parseErr);
              }
            });
          });
          
          fetch.once('error', (err) => {
            console.error('Ошибка при получении писем:', err);
            imap.end();
            resolve(emails.length > 0 ? emails : getDemoEmails());
          });
          
          fetch.once('end', () => {
            console.log('Все письма получены');
            imap.end();
            console.log(`Всего получено писем: ${emails.length}`);
            resolve(emails.length > 0 ? emails : getDemoEmails());
          });
        });
      });
      
      imap.once('error', (err) => {
        clearTimeout(imapTimeout); // Очищаем таймаут при ошибке
        console.error('Ошибка IMAP соединения:', err);
        resolve(getDemoEmails());
      });
      
      imap.once('end', () => {
        clearTimeout(imapTimeout); // Очищаем таймаут при завершении
        console.log('IMAP соединение закрыто');
      });
      
      // Подключаемся
      console.log('Инициализация IMAP соединения...');
      imap.connect();
      
    } catch (error) {
      console.error('Ошибка в IMAP процессе:', error);
      resolve(getDemoEmails());
    }
  });
}

// Функция для получения писем через POP3
async function getEmailsViaPOP3(count = 5) {
  return new Promise((resolve) => {
    try {
      console.log(`Начинаем получение писем через POP3...`);
      console.log(`Хост: ${emailConfig.pop3.host}, порт: ${emailConfig.pop3.port}`);
      
      // Создаем экземпляр POP3Client
      const client = new POP3Client(
        emailConfig.pop3.port,
        emailConfig.pop3.host,
        {
          tlserrs: false,
          enabletls: true,
          debug: true,
          timeout: 30000, // 30 секунд таймаут
          tlsOptions: {
            rejectUnauthorized: false
          }
        }
      );
      
      let emails = [];
      
      client.on("error", (err) => {
        console.error('POP3 ошибка:', err);
        client.quit();
        resolve(getDemoEmails());
      });
      
      client.on("connect", () => {
        console.log("POP3 соединение установлено");
        client.login(emailConfig.user, emailConfig.pass);
      });
      
      client.on("login", (status, rawdata) => {
        if (status) {
          console.log("POP3 авторизация успешна");
          client.list();
        } else {
          console.error("POP3 ошибка авторизации:", rawdata);
          client.quit();
          resolve(getDemoEmails());
        }
      });
      
      client.on("list", (status, msgcount, msglist) => {
        if (status) {
          console.log(`POP3: найдено ${msgcount} писем`);
          
          if (msgcount === 0) {
            client.quit();
            resolve(getDemoEmails());
            return;
          }
          
          // Получаем последние count писем
          const messagesToRetrieve = Math.min(count, msgcount);
          const messageIndexes = [];
          
          // Собираем индексы сообщений с конца (самые новые)
          for (let i = msgcount; i > msgcount - messagesToRetrieve; i--) {
            messageIndexes.push(i);
          }
          
          let processedCount = 0;
          
          // Функция для получения следующего письма
          const retrieveNext = () => {
            if (messageIndexes.length === 0) {
              client.quit();
              resolve(emails.length > 0 ? emails : getDemoEmails());
              return;
            }
            
            const msgIndex = messageIndexes.shift();
            client.retr(msgIndex);
          };
          
          client.on("retr", (status, msgnum, data) => {
            if (status) {
              try {
                // Извлекаем заголовки и тело письма
                const from = extractEmailHeader(data, "From") || "unknown@example.com";
                const subject = extractEmailHeader(data, "Subject") || "(Без темы)";
                const dateStr = extractEmailHeader(data, "Date") || new Date().toString();
                const text = extractEmailBody(data);
                
                emails.push({
                  from,
                  subject,
                  date: new Date(dateStr),
                  text
                });
                
                processedCount++;
                console.log(`POP3: получено письмо ${processedCount}/${messagesToRetrieve}`);
                
                // Получаем следующее письмо
                retrieveNext();
              } catch (err) {
                console.error("Ошибка при обработке письма:", err);
                retrieveNext();
              }
            } else {
              console.error(`POP3: ошибка получения письма #${msgnum}`);
              retrieveNext();
            }
          });
          
          // Начинаем получать письма
          retrieveNext();
        } else {
          console.error("POP3: ошибка получения списка писем");
          client.quit();
          resolve(getDemoEmails());
        }
      });
      
      client.on("quit", () => {
        console.log("POP3: Соединение закрыто");
      });
      
      // Таймаут для всей операции
      setTimeout(() => {
        if (emails.length === 0) {
          console.log('Таймаут POP3 операции');
          client.quit();
          resolve(getDemoEmails());
        }
      }, 30000);
      
    } catch (error) {
      console.error('POP3: Общая ошибка:', error);
      resolve(getDemoEmails());
    }
  });
}

// Вспомогательные функции для извлечения данных из письма
function extractEmailHeader(data, headerName) {
  const headerRegex = new RegExp(`^${headerName}:\\s*(.+)$`, 'im');
  const match = data.match(headerRegex);
  return match ? match[1].trim() : null;
}

function extractEmailBody(data) {
  // Ищем первую пустую строку (конец заголовков)
  const headerEndIndex = data.search(/\r?\n\r?\n/);
  if (headerEndIndex === -1) return data;
  
  // Извлекаем тело письма
  return data.substring(headerEndIndex + 2).trim();
}

// Функция для получения демо-писем
function getDemoEmails() {
  return [
    {
      from: "support@mail.ru",
      subject: "Добро пожаловать в Mail.ru!",
      date: new Date(),
      text: "Это демонстрационное сообщение из POP3 API. В реальном режиме здесь будут ваши письма из Mail.ru."
    },
    {
      from: "notifications@mail.ru",
      subject: "Важное уведомление о безопасности",
      date: new Date(Date.now() - 86400000),
      text: "Демо: Мы заметили вход в ваш почтовый ящик с нового устройства."
    },
    {
      from: "news@mail.ru",
      subject: "Новости дня",
      date: new Date(Date.now() - 172800000),
      text: "Демо: Самые важные события сегодняшнего дня в одном письме."
    }
  ];
}

// Функция для тестирования соединения
async function testConnection() {
  try {
    console.log("Тестирование POP3 соединения...");
    const pop3Result = await testPOP3Connection();
    
    console.log("Тестирование SMTP соединения...");
    const smtpResult = await testSMTPConnection();
    
    return {
      pop3: pop3Result,
      smtp: smtpResult
    };
  } catch (error) {
    console.error("Ошибка при тестировании соединений:", error);
    return {
      pop3: { success: false, error: error.message },
      smtp: { success: false, error: error.message }
    };
  }
}

// Функция тестирования SMTP соединения
async function testSMTPConnection() {
  try {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: true,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const verified = await transporter.verify();
    return { success: verified };
  } catch (error) {
    console.error("Ошибка SMTP соединения:", error);
    return { success: false, error: error.message };
  }
}

// Функция тестирования POP3 соединения
async function testPOP3Connection() {
  return new Promise((resolve) => {
    try {
      const client = new POP3Client(
        emailConfig.pop3.port,
        emailConfig.pop3.host,
        {
          tlserrs: false,
          enabletls: true,
          debug: true,
          tlsOptions: {
            rejectUnauthorized: false
          }
        }
      );
      
      client.on("error", (err) => {
        console.error('POP3 ошибка:', err);
        client.quit();
        resolve({ success: false, error: err.message });
      });
      
      client.on("connect", () => {
        console.log("POP3 соединение установлено");
        client.login(emailConfig.user, emailConfig.pass);
      });
      
      client.on("login", (status) => {
        if (status) {
          console.log("POP3 авторизация успешна");
          client.quit();
          resolve({ success: true });
        } else {
          console.error("POP3 ошибка авторизации");
          client.quit();
          resolve({ success: false, error: 'Ошибка авторизации' });
        }
      });
      
      // Таймаут
      setTimeout(() => {
        resolve({ success: false, error: 'Таймаут соединения' });
      }, 10000);
      
    } catch (error) {
      console.error('Ошибка при создании POP3 соединения:', error);
      resolve({ success: false, error: error.message });
    }
  });
}

// Функция для получения писем (комбинированный метод)
async function getLatestEmails(count = 5) {
  try {
    console.log(`Получение последних ${count} писем...`);
    
    // Пробуем IMAP в первую очередь
    try {
      const imapEmails = await getEmailsViaIMAP(count);
      if (imapEmails && imapEmails.length > 0) {
        console.log(`Успешно получено ${imapEmails.length} писем через IMAP`);
        return imapEmails;
      }
    } catch (error) {
      console.error('Ошибка IMAP метода:', error);
    }
    
    // Пробуем POP3 как запасной вариант
    try {
      const pop3Emails = await getEmailsViaPOP3(count);
      if (pop3Emails && pop3Emails.length > 0) {
        console.log(`Успешно получено ${pop3Emails.length} писем через POP3`);
        return pop3Emails;
      }
    } catch (error) {
      console.error('Ошибка POP3 метода:', error);
    }
    
    // Если не удалось получить письма, возвращаем демо-данные
    console.log('Не удалось получить письма. Возвращаем демо-данные.');
    return getDemoEmails();
  } catch (error) {
    console.error('Ошибка в getLatestEmails:', error);
    return getDemoEmails();
  }
}

// Функция для отправки информации о задаче по email
async function sendTaskEmail(to, subject, task) {
  try {
    console.log(`Отправка информации о задаче ${task.id} на ${to}`);
    
    if (!task) {
      throw new Error(`Задача не найдена`);
    }
    
    // Формирование текста письма
    const text = `
      Информация о задаче:
      
      ID: ${task.id}
      Название: ${task.title}
      Описание: ${task.description || 'Отсутствует'}
      Статус: ${task.status}
      Приоритет: ${task.priority || 'Обычный'}
      Срок выполнения: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Не указан'}
      
      Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.
    `;
    
    // Отправка письма
    return await sendEmail(to, subject, text);
  } catch (error) {
    console.error('Ошибка при отправке информации о задаче:', error);
    throw error;
  }
}

// Обновляем экспорт функций
module.exports = {
  sendEmail,
  getEmailsViaIMAP,
  getEmailsViaPOP3,
  getLatestEmails,
  sendTaskEmail,
  testConnection
};
