import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Button
} from '@mui/material';
import axios from 'axios';
import { useCookies } from 'react-cookie';
import moment from 'moment';
import 'moment/locale/ru';

moment.locale('ru');

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cookies] = useCookies(['token']);

  const fetchReports = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/volunteers/me/reports', {
        headers: { Authorization: `Bearer ${cookies.token}` }
      });
      setReports(response.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки отчетов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [cookies.token]);

  const handleDeleteReport = async (reportId) => {
    try {
      await axios.delete(`http://localhost:3000/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${cookies.token}` }
      });
      setReports(reports.filter(report => report._id !== reportId));
      setError('');
    } catch (err) {
      setError('Не удалось удалить отчет');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 4, m: 2 }}>
      <Typography variant="h4" gutterBottom>
        Мои отчеты
      </Typography>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="таблица отчетов">
          <TableHead>
            <TableRow>
              <TableCell>Мероприятие</TableCell>
              <TableCell align="center">Часы</TableCell>
              <TableCell align="center">Оценка</TableCell>
              <TableCell align="center">Дата отчета</TableCell>
              <TableCell>Описание работы</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {reports.length > 0 ? (
              reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>
                    <Chip 
                      label={report.eventId?.title || 'Неизвестное мероприятие'} 
                      color="primary" 
                    />
                  </TableCell>
                  <TableCell align="center">{report.hours}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`${report.rating}/5`} 
                      color={report.rating >= 4 ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {moment(report.reportDate).format('LL')}
                  </TableCell>
                  <TableCell>{report.workDescription}</TableCell>
                  <TableCell align="center">
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleDeleteReport(report._id)}
                    >
                      Удалить
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" color="textSecondary">
                    Нет доступных отчетов
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}