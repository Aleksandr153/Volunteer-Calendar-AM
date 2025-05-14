import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import RefreshIcon from '@mui/icons-material/Refresh';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { Modal, Box, Typography, Button } from '@mui/material';
import ReportForm from './ReportForm';
import Notifications from './Notifications';
import { useCookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';

const localizer = momentLocalizer(moment);

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function VolunteerCalendar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [cookies] = useCookies(['token']);
  const [volunteerId, setVolunteerId] = useState(null);

  const Header = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-end', 
      marginBottom: '10px',
      padding: '0 20px'
    }}>
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={loadEvents}
        sx={{ 
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: '#f5f5f5' }
        }}
      >
        Обновить расписание
      </Button>
    </div>
  );

  useEffect(() => {
    if (cookies.token) {
      try {
        const decoded = jwtDecode(cookies.token);
        setVolunteerId(decoded.id);
      } catch (err) {
        console.error('Ошибка декодирования токена:', err);
        setNotification({
          open: true,
          message: 'Ошибка авторизации',
          severity: 'error',
        });
      }
    }
  }, [cookies.token]);

  const loadEvents = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/events');
      
      const formattedEvents = response.data.map((event) => {
        const participants = event.participants?.map(p => ({
          _id: p._id?.toString(),
          firstName: p.firstName, // Убрано значение по умолчанию
          lastName: p.lastName    // Убрано значение по умолчанию
        })) || [];

        const isRegistered = volunteerId 
          ? participants.some(p => p._id === volunteerId.toString())
          : false;

        return {
          id: event._id,
          title: event.title,
          start: new Date(event.startTime),
          end: new Date(event.endTime),
          allDay: false,
          description: event.description,
          participants,
          maxParticipants: event.maxParticipants || 2,
          creatorId: event.creatorId?._id || null,
          organizer: event.organizer || { name: 'Не указан', contact: '' },
          isRegistered,
        };
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Ошибка загрузки мероприятий',
        severity: 'error',
      });
    }
  };

  useEffect(() => {
    loadEvents();
  }, [volunteerId]);

  const handleRegistration = async (eventId) => {
    if (!volunteerId) {
      setNotification({
        open: true,
        message: '❌ Для участия необходимо авторизоваться',
        severity: 'error',
      });
      return;
    }

    try {
      await axios.post(
        `http://localhost:3000/api/events/${eventId}/register`,
        {},
        { headers: { Authorization: `Bearer ${cookies.token}` } }
      );
      setNotification({
        open: true,
        message: '✅ Вы зарегистрированы!',
        severity: 'success',
      });
      loadEvents();
    } catch (err) {
      setNotification({
        open: true,
        message: `❌ Ошибка: ${err.response?.data?.error || 'Сервер недоступен'}`,
        severity: 'error',
      });
    }
  };

  const handleCancelRegistration = async (eventId) => {
    try {
      await axios.post(
        `http://localhost:3000/api/events/${eventId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${cookies.token}` } }
      );
      setNotification({
        open: true,
        message: '✅ Участие отменено!',
        severity: 'success',
      });
      loadEvents();
    } catch (err) {
      setNotification({
        open: true,
        message: `❌ Ошибка: ${err.response?.data?.error}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await axios.delete(`http://localhost:3000/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${cookies.token}` },
      });
      setNotification({
        open: true,
        message: '✅ Мероприятие удалено!',
        severity: 'success',
      });
      loadEvents();
      setOpenModal(false);
    } catch (err) {
      setNotification({
        open: true,
        message: `❌ Ошибка удаления: ${err.response?.data?.error}`,
        severity: 'error',
      });
    }
  };

  return (
    <div style={{ height: '600px', margin: '20px' }}>
      <Header />
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultDate={new Date()}
        eventPropGetter={() => ({
          style: {
            backgroundColor: '#2196F3',
            color: '#fff',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer'
          },
        })}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setOpenModal(true);
        }}
        messages={{
          today: 'Сегодня',
          previous: 'Назад',
          next: 'Вперед',
          month: 'Месяц',
          week: 'Неделя',
          day: 'День',
        }}
      />

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box sx={modalStyle}>
          {selectedEvent && (
            <>
              <Typography variant="h5" gutterBottom>
                {selectedEvent.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedEvent.description}
              </Typography>

              <Typography variant="body1" sx={{ mt: 2 }}>
                Организатор: {selectedEvent.organizer?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Контакт: {selectedEvent.organizer?.contact}
              </Typography>

              <Typography variant="body1" sx={{ mt: 2 }}>
                Участников: {selectedEvent.participants.length} /{' '}
                {selectedEvent.maxParticipants}
              </Typography>

              {selectedEvent.participants.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Список участников:</Typography>
                  <ul style={{ 
                    paddingLeft: '20px', 
                    margin: '8px 0',
                    listStyle: 'none'
                  }}>
                    {selectedEvent.participants.map((participant, index) => (
                      <li key={index}>
                        <Typography component="span" variant="body2">
                          • {participant.firstName || 'Неизвестный'} {participant.lastName || 'Участник'}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}

              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Начало: {moment(selectedEvent.start).format('DD.MM.YYYY HH:mm')}
              </Typography>
              <Typography variant="caption" display="block">
                Окончание: {moment(selectedEvent.end).format('DD.MM.YYYY HH:mm')}
              </Typography>

              <Box sx={{ 
                mt: 2, 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap',
                '& > *': { flex: '1 1 200px' }
              }}>
                {volunteerId === selectedEvent.creatorId && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                  >
                    Удалить мероприятие
                  </Button>
                )}

                {selectedEvent.isRegistered ? (
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={() => handleCancelRegistration(selectedEvent.id)}
                  >
                    Отменить участие
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => handleRegistration(selectedEvent.id)}
                    disabled={selectedEvent.participants.length >= selectedEvent.maxParticipants}
                  >
                    {selectedEvent.participants.length >= selectedEvent.maxParticipants
                      ? 'Мероприятие заполнено'
                      : 'Участвовать'}
                  </Button>
                )}
              </Box>

              <ReportForm
                eventId={selectedEvent.id}
                volunteerId={volunteerId}
                onSuccess={() => {
                  setNotification({
                    open: true,
                    message: '✅ Отчет отправлен!',
                    severity: 'success',
                  });
                  loadEvents();
                }}
              />
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setOpenModal(false)}
              >
                Закрыть
              </Button>
            </>
          )}
        </Box>
      </Modal>
      
      <Notifications
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </div>
  );
}