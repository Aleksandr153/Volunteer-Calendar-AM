import React, { useState, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Paper,
  Alert,
  IconButton,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

export default function OrganizersTab() {
  const [organizers, setOrganizers] = useState([]);
  const [newOrg, setNewOrg] = useState({ 
    name: '', 
    contact: '', 
    description: '' 
  });
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const loadOrganizers = async () => {
    try {
      const response = await axios.get('/api/organizers');
      setOrganizers(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!newOrg.name.trim() || !newOrg.contact.trim()) {
      setError('Заполните обязательные поля: Имя и Телефон');
      return;
    }

    if (!/^\+7\d{10}$/.test(newOrg.contact)) {
      setError('Телефон должен быть в формате +7XXXXXXXXXX');
      return;
    }

    try {
      await axios.post('/api/organizers', {
        name: newOrg.name.trim(),
        contact: newOrg.contact.trim(),
        description: newOrg.description.trim()
      });
      setNewOrg({ name: '', contact: '', description: '' });
      loadOrganizers();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания организатора');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/organizers/${id}`);
      loadOrganizers();
      setDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось удалить организатора');
    }
  };

  useEffect(() => {
    loadOrganizers();
  }, []);

  return (
    <Paper sx={{ p: 4, m: 2 }}>
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
      >
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить этого организатора?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Отмена</Button>
          <Button 
            onClick={() => handleDelete(deleteId)} 
            color="error"
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Управление организаторами</Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={loadOrganizers}
        >
          Обновить список
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleCreate}>
        <TextField
          label="Имя организатора *"
          value={newOrg.name}
          onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
          error={error.includes('Имя')}
        />
        
        <TextField
          label="Телефон *"
          value={newOrg.contact}
          onChange={(e) => setNewOrg({ ...newOrg, contact: e.target.value })}
          fullWidth
          placeholder="+71234567890"
          sx={{ mb: 2 }}
          error={error.includes('Телефон')}
          helperText={error.includes('Телефон') ? "Формат: +7XXXXXXXXXX" : ""}
        />
        
        <TextField
          label="Описание"
          value={newOrg.description}
          onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
          multiline
          rows={3}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          sx={{ mt: 1 }}
        >
          Создать организатора
        </Button>
      </form>

      <List sx={{ mt: 4 }}>
        {organizers.map((organizer) => (
          <ListItem 
            key={organizer._id}
            secondaryAction={
              <IconButton 
                edge="end" 
                onClick={() => setDeleteId(organizer._id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            }
          >
           <ListItemText 
              primary={
                <Typography component="div" variant="subtitle1">
                  {organizer.name}
                </Typography>
              }
              secondary={
                <div style={{ display: 'block' }}>
                  <Typography component="div" variant="body2" color="text.secondary">
                    Телефон: {organizer.contact}
                  </Typography>
                  {organizer.description && (
                    <Typography component="div" variant="body2" color="text.secondary">
                      Описание: {organizer.description}
                    </Typography>
                  )}
                  <Typography component="div" variant="caption" color="text.secondary">
                    Создан: {new Date(organizer.createdAt).toLocaleDateString()}
                  </Typography>
                </div>
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}