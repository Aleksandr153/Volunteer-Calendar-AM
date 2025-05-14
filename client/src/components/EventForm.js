import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Paper,
  Autocomplete
} from '@mui/material';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';

export default function EventForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    maxParticipants: 1,
    organizer: null
  });
  const [organizers, setOrganizers] = useState([]);
  const [cookies] = useCookies(['token']);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/organizers')
      .then(res => {
        if (!Array.isArray(res.data)) {
          throw new Error('Некорректный формат данных организаторов');
        }
        setOrganizers(res.data);
      })
      .catch(err => {
        console.error('Ошибка загрузки организаторов:', err);
        alert('Не удалось загрузить список организаторов');
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        organizer: formData.organizer?._id,
        maxParticipants: Number(formData.maxParticipants)
      };
      
      await axios.post('/api/events', eventData, {
        headers: { Authorization: `Bearer ${cookies.token}` }
      });
      navigate('/');
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.error || 'Неизвестная ошибка'));
    }
  };

  return (
    <Paper sx={{ p: 4, m: 2 }}>
      <Typography variant="h5">Создание мероприятия</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Название"
          fullWidth
          required
          sx={{ mt: 2 }}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        
        <TextField
          label="Описание"
          multiline
          rows={4}
          fullWidth
          required
          sx={{ mt: 2 }}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <Autocomplete
          options={organizers}
          getOptionLabel={(option) => option.name}
          sx={{ mt: 2 }}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Организатор" 
              required 
            />
          )}
          onChange={(e, value) => setFormData({ ...formData, organizer: value })}
        />

        <TextField
          label="Максимальное количество участников"
          type="number"
          fullWidth
          required
          sx={{ mt: 2 }}
          value={formData.maxParticipants}
          onChange={(e) => setFormData({ 
            ...formData, 
            maxParticipants: Math.max(1, e.target.value)
          })}
          inputProps={{ min: 1 }}
        />

        <TextField
          label="Начало"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          sx={{ mt: 2 }}
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
        />

        <TextField
          label="Окончание"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          fullWidth
          required
          sx={{ mt: 2 }}
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
        />

        <Button 
          type="submit" 
          variant="contained" 
          sx={{ mt: 2 }}
        >
          Создать
        </Button>
      </form>
    </Paper>
  );
}