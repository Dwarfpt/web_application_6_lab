FROM node:18-alpine

WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apk add --no-cache make gcc g++ python3

COPY package*.json ./

RUN npm install

# Устанавливаем необходимые пакеты для работы с почтой и WebSocket
RUN npm install nodemailer imap mailparser poplib socket.io

COPY . .

# Переменные окружения для email
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Запускаем сервер напрямую
CMD ["node", "server.js"] 