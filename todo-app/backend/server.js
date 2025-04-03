process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { Pool } = require('pg');
const { pool } = require('./db');
const emailService = require('./emailService');
const taskService = require('./taskService');

const app = express();
const PORT = 5000;

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Todo List API',
      version: '1.0.0',
      description: 'A simple Todo List API',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

io.on('connection', (socket) => {
  console.log('New client connected', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Returns all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: List of all tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 */
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task found
 *       404:
 *         description: Task not found
 */
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *                 default: pending
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 */
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status = 'pending' } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO tasks (title, description, status) VALUES ($1, $2, $3) RETURNING *',
      [title, description, status]
    );
    
    const newTask = result.rows[0];
    
    io.emit('taskCreated', newTask);
    
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 */
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    
    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, status = $3 WHERE id = $4 RETURNING *',
      [title, description, status, id]
    );
    
    const updatedTask = result.rows[0];
    
    io.emit('taskUpdated', updatedTask);
    
    res.json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const checkResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    
    io.emit('taskDeleted', { id: parseInt(id) });
    
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/email/send:
 *   post:
 *     summary: Send an email with task information or custom text
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *             properties:
 *               to:
 *                 type: string
 *                 description: Recipient email address
 *               subject:
 *                 type: string
 *                 description: Email subject
 *               taskId:
 *                 type: integer
 *                 description: ID of the task to include in the email (optional if text is provided)
 *               text:
 *                 type: string
 *                 description: Custom text for the email (optional if taskId is provided)
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, taskId, text } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({ error: 'Необходимы поля: to и subject' });
    }
    
    if (taskId !== undefined) {
      try {
        const task = await taskService.getTaskById(taskId);
        
        if (!task) {
          return res.status(404).json({ error: `Задача с ID ${taskId} не найдена` });
        }
        
        await emailService.sendTaskEmail(to, subject, task);
        res.json({ success: true, message: 'Email с информацией о задаче отправлен' });
      } catch (dbError) {
        console.error('Ошибка при получении задачи:', dbError);
        res.status(500).json({ error: 'Ошибка при получении задачи', details: dbError.message });
      }
    } else if (text) {
      await emailService.sendEmail(to, subject, text);
      res.json({ success: true, message: 'Email отправлен' });
    } else {
      return res.status(400).json({ error: 'Необходимо указать taskId или text' });
    }
  } catch (error) {
    console.error('Ошибка при отправке email:', error);
    res.status(500).json({ error: error.message || 'Не удалось отправить email' });
  }
});

/**
 * @swagger
 * /api/email/inbox:
 *   get:
 *     summary: Get latest emails from inbox
 *     tags: [Email]
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of emails to retrieve
 *     responses:
 *       200:
 *         description: List of emails
 *       500:
 *         description: Server error
 */
app.get('/api/email/inbox', async (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count) : 5;
    console.log(`Запрос на получение ${count} писем`);
    
    const emails = await emailService.getLatestEmails(count);
    res.json(emails);
  } catch (error) {
    console.error('Ошибка при получении писем:', error);
    res.status(500).json({ error: 'Не удалось получить письма', details: error.message });
  }
});

/**
 * @swagger
 * /api/email/inbox/imap:
 *   get:
 *     summary: Get latest emails from inbox via IMAP
 *     tags: [Email]
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of emails to retrieve
 *     responses:
 *       200:
 *         description: List of emails
 *       500:
 *         description: Server error
 */
app.get('/api/email/inbox/imap', async (req, res) => {
  try {
    console.log('Получен запрос на проверку почты через IMAP');
    const count = parseInt(req.query.count) || 5;
    const result = await emailService.getEmailsViaIMAP(count);
    res.json(result);
  } catch (error) {
    console.error('Ошибка при получении почты через IMAP:', error);
    res.status(500).json({ error: error.message || error.error || 'Unknown error' });
  }
});

/**
 * @swagger
 * /api/email/inbox/pop3:
 *   get:
 *     summary: Get latest emails from inbox via POP3
 *     tags: [Email]
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of emails to retrieve
 *     responses:
 *       200:
 *         description: List of emails
 *       500:
 *         description: Server error
 */
app.get('/api/email/inbox/pop3', async (req, res) => {
  try {
    console.log('Получен запрос на проверку почты через POP3');
    const count = parseInt(req.query.count) || 5;
    const result = await emailService.getEmailsViaPOP3(count);
    res.json(result);
  } catch (error) {
    console.error('Ошибка при получении почты через POP3:', error);
    res.status(500).json({ error: error.message || error.error || 'Unknown error' });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`WebSocket server initialized`);
});