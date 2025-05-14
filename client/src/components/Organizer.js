import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function OrganizerManager() {
  const [organizers, setOrganizers] = useState([]);
  const [newOrg, setNewOrg] = useState({
    name: '',
    contact: '',
    description: ''
  });

  // Загрузка организаторов
  useEffect(() => {
    axios.get('http://localhost:3000/api/organizers')
      .then(res => setOrganizers(res.data))
      .catch(err => console.error('Ошибка загрузки:', err));
  }, []);

  // Создание организатора
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/organizers', newOrg);
      setNewOrg({ name: '', contact: '', description: '' });
      // Обновляем список после создания
      const { data } = await axios.get('http://localhost:3000/api/organizers');
      setOrganizers(data);
    } catch (err) {
      console.error('Ошибка создания:', err.response?.data);
    }
  };
  return (
    <div>
      {/* Форма и отображение организаторов */}
    </div>
  );
}