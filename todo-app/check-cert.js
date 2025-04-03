const fs = require('fs');
const path = require('path');

// Пути к сертификатам
const certPaths = [
  path.join(__dirname, 'certs', 'gmail-ca.pem'),
  path.join(__dirname, 'certs', 'gmail-pop3.pem'),
  path.join(__dirname, 'backend', 'certs', 'gmail-ca.pem'),
  path.join(__dirname, 'backend', 'certs', 'gmail-pop3.pem')
];

console.log('Проверка наличия сертификатов:');
certPaths.forEach(certPath => {
  const exists = fs.existsSync(certPath);
  console.log(`${certPath}: ${exists ? 'НАЙДЕН ✅' : 'НЕ НАЙДЕН ❌'}`);
  
  if (exists) {
    try {
      const stats = fs.statSync(certPath);
      console.log(`  Размер: ${stats.size} байт`);
      console.log(`  Права: ${stats.mode.toString(8)}`);
      const content = fs.readFileSync(certPath, 'utf8');
      console.log(`  Начало файла: ${content.substring(0, 50)}...`);
    } catch (err) {
      console.error(`  Ошибка при чтении файла: ${err.message}`);
    }
  }
});