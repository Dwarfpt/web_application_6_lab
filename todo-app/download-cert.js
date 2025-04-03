const fs = require('fs');
const path = require('path');
const tls = require('tls');

// Создаем директорию для сертификатов внутри директории todo-app
const certsDir = path.join(__dirname, 'certs');  // Убираем '..' из пути
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const gmailPop3CertPath = path.join(certsDir, 'gmail-pop3.pem');

console.log(`Целевой путь для сертификата: ${gmailPop3CertPath}`);

try {
  console.log('Скачивание сертификата POP3 сервера Gmail...');
  
  // Устанавливаем TLS соединение с сервером Gmail POP3
  const socket = tls.connect({
    host: 'pop.gmail.com',
    port: 995,
    rejectUnauthorized: false // Временно отключаем проверку для получения сертификата
  }, () => {
    // Получаем сертификат из соединения
    const cert = socket.getPeerCertificate(true);
    
    if (cert && cert.raw) {
      // Преобразуем сертификат в PEM формат
      const pemCert = '-----BEGIN CERTIFICATE-----\n' +
                      Buffer.from(cert.raw).toString('base64').match(/.{1,64}/g).join('\n') +
                      '\n-----END CERTIFICATE-----\n';
      
      // Сохраняем сертификат в файл
      fs.writeFileSync(gmailPop3CertPath, pemCert);
      console.log(`Сертификат успешно сохранен в: ${gmailPop3CertPath}`);
    } else {
      console.error('Не удалось получить сертификат');
    }
    
    // Закрываем соединение
    socket.end();
  });
  
  socket.on('error', (err) => {
    console.error('Ошибка при подключении к серверу:', err);
  });
  
} catch (error) {
  console.error('Ошибка при скачивании сертификата:', error);
}