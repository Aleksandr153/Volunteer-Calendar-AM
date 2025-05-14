const mongoose = require('mongoose');

const organizerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Имя организатора обязательно'],
    trim: true,
    maxlength: [100, 'Имя не может быть длиннее 100 символов']
  },
  contact: {
    type: String,
    required: [true, 'Телефон обязателен'],
    unique: true,
    validate: {
      validator: v => /^\+7\d{10}$/.test(v),
      message: 'Неверный формат телефона (+7XXXXXXXXXX)'
    }
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Удаление конфликтующих индексов
organizerSchema.pre('syncIndexes', async function() {
  const collection = this.collection;
  try {
    await collection.dropIndex('email_1');
  } catch (err) {
    if (err.message !== 'index not found') throw err;
  }
});

module.exports = mongoose.model('Organizer', organizerSchema);