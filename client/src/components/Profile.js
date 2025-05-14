import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import { Typography, CircularProgress, Alert, Paper, Box } from '@mui/material';

export default function Profile() {
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    rating: 0,
    totalEvents: 0,
    totalHours: 0,
    reports: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cookies] = useCookies(['token']);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data } = await axios.get('/api/volunteers/me', {
          headers: { Authorization: `Bearer ${cookies.token}` }
        });

        setProfileData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          rating: data.rating || 0,
          totalEvents: data.totalEvents || 0,
          totalHours: data.totalHours || 0,
          reports: data.reports || []
        });

      } catch (err) {
        setError(err.response?.data?.error || 'Ошибка загрузки профиля');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [cookies.token]);

  const chartData = {
    labels: ['Мероприятия', 'Часы'],
    datasets: [{
      label: 'Статистика',
      data: [profileData.totalEvents, profileData.totalHours],
      backgroundColor: ['#4CAF50', '#2196F3']
    }]
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, mx: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, m: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Профиль волонтёра
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6">
          {profileData.firstName} {profileData.lastName}
        </Typography>
        <Typography variant="body1">Email: {profileData.email}</Typography>
        <Typography variant="body1">Телефон: {profileData.phone}</Typography>
        <Typography variant="body1">
          Рейтинг: {profileData.rating.toFixed(1)}
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Bar 
          data={chartData} 
          options={{ 
            responsive: true,
            plugins: { legend: { display: false } }
          }}
        />
      </Box>

      <Typography variant="h5" gutterBottom>
        История активностей
      </Typography>
      
      {profileData.reports.length > 0 ? (
        profileData.reports.map((report) => (
          <Paper 
            key={report._id}
            sx={{ 
              p: 2, 
              mb: 2, 
              backgroundColor: (theme) => theme.palette.grey[100]
            }}
          >
            <Typography variant="body1" paragraph>
              {report.workDescription}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2">
                Часы: {report.hours}
              </Typography>
              <Typography variant="body2">
                Оценка: {report.rating}/5
              </Typography>
              <Typography variant="body2">
                Дата: {new Date(report.reportDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Paper>
        ))
      ) : (
        <Typography variant="body1" color="textSecondary">
          Нет данных об активностях
        </Typography>
      )}
    </Paper>
  );
}