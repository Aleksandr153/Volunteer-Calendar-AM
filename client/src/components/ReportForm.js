import React, { useState } from 'react';
import axios from 'axios';
import { 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  InputLabel,
  FormControl,
  Box
} from '@mui/material';
import { useCookies } from 'react-cookie';

export default function ReportForm({ eventId, volunteerId }) {
  const [formData, setFormData] = useState({
    workDescription: '',
    hours: 1,
    rating: 5
  });
  const [cookies] = useCookies(['token']);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('/api/activity-reports', {
      ...formData,
      eventId,
      volunteerId
    }, {
      headers: { 
        Authorization: `Bearer ${cookies.token}` // Добавлен токен в заголовок
      }
    })
    .then(() => alert('Отчет сохранен!'))
    .catch(() => alert('Ошибка!'));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <TextField
        label="Описание работы"
        value={formData.workDescription}
        onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
        fullWidth
        multiline
        rows={4}
        margin="normal"
      />
      
      <TextField
        label="Часы"
        type="number"
        value={formData.hours}
        onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
        fullWidth
        margin="normal"
        inputProps={{ min: 1 }}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Оценка</InputLabel>
        <Select
          value={formData.rating}
          label="Оценка"
          onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
        >
          {[1,2,3,4,5].map(num => (
            <MenuItem key={num} value={num}>{num}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button type="submit" variant="contained" sx={{ mt: 2 }}>
        Отправить отчет
      </Button>
    </Box>
  );
}