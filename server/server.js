const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OpenAI } = require('openai');
const Organizer = require('./models/Organizer');
require('dotenv').config({ path: path.resolve(__dirname, '../client/.env') });
const axios = require('axios'); // Добавьте эту строку

const app = express();
mongoose.set('strictQuery', true);

// Проверка переменных окружения
if (!process.env.OPENROUTER_API_KEY || !process.env.HTTP_REFERER || !process.env.APP_TITLE) {
  throw new Error('Необходимые переменные окружения не найдены');
}
console.log('[DEBUG] Переменные окружения:', {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.slice(0, 5) + '***',
  HTTP_REFERER: process.env.HTTP_REFERER,
  APP_TITLE: process.env.APP_TITLE
});
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.HTTP_REFERER,
    "X-Title": process.env.APP_TITLE,
    "Content-Type": "application/json"
  }
});

// Схемы и модели
const activityReportSchema = new mongoose.Schema({
  volunteerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Volunteer', 
    required: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  workDescription: { 
    type: String, 
    required: true, 
    trim: true 
  },
  reportDate: { 
    type: Date, 
    default: Date.now 
  },
  hours: { 
    type: Number, 
    min: 1, 
    required: true 
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5 
  }
});

const ActivityReport = mongoose.model('ActivityReport', activityReportSchema);

const volunteerSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 50 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Некорректный email']
  },
  phone: { 
    type: String, 
    required: true,
    validate: { 
      validator: v => /^\+7\d{10}$/.test(v), 
      message: 'Неверный формат телефона (+7XXXXXXXXXX)' 
    }
  },
  password: { 
    type: String, 
    required: true, 
    select: false, 
    minlength: 6 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  rating: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 5 
  },
  reports: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ActivityReport' 
  }]
}, { 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

volunteerSchema.virtual('totalEvents', {
  ref: 'ActivityReport',
  localField: '_id',
  foreignField: 'volunteerId',
  count: true
});

volunteerSchema.virtual('totalHours', {
  ref: 'ActivityReport',
  localField: '_id',
  foreignField: 'volunteerId',
  sum: 'hours'
});

const Volunteer = mongoose.model('Volunteer', volunteerSchema);

const eventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true,
    validate: { 
      validator: function(v) { return v > this.startTime; }, 
      message: 'Окончание должно быть позже начала' 
    }
  },
  maxParticipants: { 
    type: Number, 
    default: 2 
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  creatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Volunteer', 
    required: true 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Volunteer',
    default: [] 
  }]
});

const Event = mongoose.model('Event', eventSchema);

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: 'GET,POST,PUT,DELETE',
  credentials: true
}));

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Volunteer.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Ошибка аутентификации:', err.message);
    res.status(401).json({ 
      error: 'Недействительный токен',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
};

const creatorOnly = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }
    if (event.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Только создатель может редактировать' });
    }
    next();
  } catch (err) {
    console.error('Ошибка проверки прав:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASSWORD 
  }
});

schedule.scheduleJob('0 9 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const events = await Event.find({ 
      startTime: { 
        $gte: tomorrow, 
        $lt: new Date(tomorrow.getTime() + 86400000) 
      } 
    }).populate('participants');

    for (const event of events) {
      for (const participant of event.participants) {
        if (participant.email) {
          await transporter.sendMail({
            from: `"Система" <${process.env.EMAIL_USER}>`,
            to: participant.email,
            subject: `Напоминание: ${event.title}`,
            html: `<p>Мероприятие "${event.title}" начинается завтра в ${event.startTime.toLocaleTimeString('ru-RU')}</p>`
          });
        }
      }
    }
  } catch (err) {
    console.error('Ошибка отправки уведомлений:', err.message);
  }
});

// Роуты
app.post("/api/chat", async (req, res) => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.0-flash-001", // Исправлено здесь
        messages: req.body.messages,
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.HTTP_REFERER,
          "X-Title": process.env.APP_TITLE,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      return res.status(502).json({ 
        error: "Некорректный ответ от AI",
        details: response.data 
      });
    }

    res.json(response.data);
  } catch (err) {
    console.error("Ошибка OpenRouter:", err.message);
    const errorSolution = err.response?.data?.error?.code === "unsupported_country_region_territory"
      ? "Используйте VPN (США/Европа)"
      : "Проверьте API ключ";

    res.status(500).json({
      error: err.response?.data?.error?.message || "Ошибка сервера",
      solution: errorSolution,
    });
  }
});
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'name contact')
      .populate('creatorId', '_id firstName lastName')
      .populate('participants', 'firstName lastName')
      .sort({ startTime: 1 });

    res.json(events);
  } catch (err) {
    console.error('Ошибка загрузки мероприятий:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки мероприятий' });
  }
});

app.get('/api/organizers', async (req, res) => {
  try {
    const organizers = await Organizer.find().sort({ createdAt: -1 });
    res.json(organizers);
  } catch (err) {
    console.error('Ошибка загрузки организаторов:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки организаторов' });
  }
});

app.post('/api/organizers', async (req, res) => {
  try {
    const { name, contact, description } = req.body;
    const errors = [];
    
    if (!name?.trim()) errors.push('Имя обязательно');
    if (!contact?.trim()) errors.push('Телефон обязателен');
    if (!/^\+7\d{10}$/.test(contact)) errors.push('Неверный формат телефона');
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const newOrganizer = await Organizer.create({
      name: name.trim(),
      contact: contact.trim(),
      description: description?.trim() || ''
    });

    res.status(201).json(newOrganizer);
  } catch (err) {
    console.error('Ошибка создания организатора:', err.message);
    const errorMessage = err.code === 11000 
      ? 'Организатор с таким телефоном уже существует'
      : 'Ошибка сервера';
    res.status(500).json({ error: errorMessage });
  }
});

app.delete('/api/organizers/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findByIdAndDelete(req.params.id);
    if (!organizer) {
      return res.status(404).json({ error: 'Организатор не найден' });
    }
    res.json({ message: 'Организатор удален' });
  } catch (err) {
    console.error('Ошибка удаления организатора:', err.message);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

app.post('/api/activity-reports', authMiddleware, async (req, res) => {
  try {
    const { workDescription, hours, rating, eventId } = req.body;
    
    const newReport = await ActivityReport.create({
      volunteerId: req.user._id,
      eventId,
      workDescription: workDescription.trim(),
      hours,
      rating
    });

    res.status(201).json(newReport);
  } catch (err) {
    console.error('Ошибка создания отчета:', err.message);
    res.status(500).json({ error: 'Ошибка создания отчета' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    const errors = [];
    
    if (!firstName?.trim()) errors.push('Имя обязательно');
    if (!lastName?.trim()) errors.push('Фамилия обязательна');
    if (!email?.trim()) errors.push('Email обязателен');
    if (!phone?.trim()) errors.push('Телефон обязателен');
    if (!password || password.length < 6) errors.push('Пароль слишком короткий');
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    const existUser = await Volunteer.findOne({ email: email.toLowerCase().trim() });
    if (existUser) {
      return res.status(409).json({ error: 'Email уже используется' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newVolunteer = await Volunteer.create({ 
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword
    });

    const token = jwt.sign({ id: newVolunteer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ 
      token, 
      user: { 
        id: newVolunteer._id, 
        email: newVolunteer.email,
        firstName: newVolunteer.firstName,
        lastName: newVolunteer.lastName
      } 
    });
  } catch (err) {
    console.error('Ошибка регистрации:', err.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const volunteer = await Volunteer.findOne({ email: email.toLowerCase().trim() })
      .select('+password');
    
    if (!volunteer || !(await bcrypt.compare(password, volunteer.password))) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const token = jwt.sign({ id: volunteer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { 
        id: volunteer._id, 
        email: volunteer.email, 
        rating: volunteer.rating,
        firstName: volunteer.firstName,
        lastName: volunteer.lastName
      } 
    });
  } catch (err) {
    console.error('Ошибка входа:', err.message);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

app.post('/api/events', authMiddleware, async (req, res) => {
  try {
    const { title, description, startTime, endTime, maxParticipants, organizer } = req.body;
    
    const newEvent = await Event.create({ 
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      maxParticipants,
      organizer,
      creatorId: req.user._id,
      participants: []
    });

    res.status(201).json(newEvent);
  } catch (err) {
    console.error('Ошибка создания мероприятия:', err.message);
    res.status(500).json({ error: 'Ошибка создания мероприятия' });
  }
});

app.put('/api/events/:id', authMiddleware, creatorOnly, async (req, res) => {
  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updatedEvent);
  } catch (err) {
    console.error('Ошибка обновления мероприятия:', err.message);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

app.delete('/api/events/:id', authMiddleware, creatorOnly, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Мероприятие удалено' });
  } catch (err) {
    console.error('Ошибка удаления мероприятия:', err.message);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

app.delete('/api/reports/:id', authMiddleware, async (req, res) => {
  try {
    await ActivityReport.deleteOne({ 
      _id: req.params.id, 
      volunteerId: req.user._id 
    });
    res.json({ message: 'Отчет удален' });
  } catch (err) {
    console.error('Ошибка удаления отчета:', err.message);
    res.status(500).json({ error: 'Ошибка удаления отчета' });
  }
});

app.post('/api/events/:eventId/register', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }
    if (event.participants.length >= event.maxParticipants) {
      return res.status(400).json({ error: 'Достигнут лимит участников' });
    }

    await Event.findByIdAndUpdate(req.params.eventId, {
      $addToSet: { participants: req.user._id }
    });
    res.json({ message: 'Вы успешно зарегистрированы!' });
  } catch (err) {
    console.error('Ошибка регистрации на мероприятие:', err.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/api/events/:eventId/cancel', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Мероприятие не найдено' });
    }

    await Event.findByIdAndUpdate(req.params.eventId, {
      $pull: { participants: req.user._id }
    });
    res.json({ message: 'Участие отменено' });
  } catch (err) {
    console.error('Ошибка отмены участия:', err.message);
    res.status(500).json({ error: 'Ошибка отмены' });
  }
});

app.get('/api/volunteers/me', authMiddleware, async (req, res) => {
  try {
    const user = await Volunteer.findById(req.user._id)
      .populate('reports', 'workDescription hours rating reportDate')
      .lean();

    res.json({ 
      ...user, 
      totalEvents: user.totalEvents || 0, 
      totalHours: user.totalHours || 0 
    });
  } catch (err) {
    console.error('Ошибка получения данных пользователя:', err.message);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

app.get('/api/volunteers/me/reports', authMiddleware, async (req, res) => {
  try {
    const user = await Volunteer.findById(req.user._id)
      .populate({
        path: 'reports',
        populate: { 
          path: 'eventId', 
          select: 'title startTime endTime' 
        }
      });

    res.json({ reports: user.reports });
  } catch (err) {
    console.error('Ошибка загрузки отчетов:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки отчетов' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
  console.error('Глобальная ошибка:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && {
      details: err.message,
      stack: err.stack
    })
  });
});

// Запуск сервера
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB подключен');
    app.listen(process.env.PORT, () => {
      console.log(`\n✓ Сервер запущен: http://localhost:${process.env.PORT}`);
      console.log(`✓ Время: ${new Date().toLocaleString()}`);
      console.log(`✓ Режим: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('✗ Ошибка подключения к MongoDB:', err.message);
    process.exit(1);
  });