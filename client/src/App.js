import React, { useState, useEffect } from 'react';
import { 
  unstable_HistoryRouter as HistoryRouter,
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import { createBrowserHistory } from 'history';
import { useCookies } from 'react-cookie';
import Navbar from './components/Navbar';
import Calendar from './components/Calendar';
import RegistrationForm from './components/RegistrationForm';
import Profile from './components/Profile';
import OrganizersTab from './components/OrganizersTab';
import LoginForm from './components/LoginForm';
import EventForm from './components/EventForm';
import Reports from './components/Reports';
import ChatBot from './components/ChatBot'; // Добавлен компонент чат-бота

const history = createBrowserHistory();

function App() {
  const [events, setEvents] = useState([]);
  const [cookies] = useCookies(['token']);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error('Ошибка загрузки мероприятий:', err));
  }, []);

  const ProtectedRoute = ({ children }) => {
    return cookies.token ? children : <Navigate to="/login" />;
  };

  return (
    <HistoryRouter 
      history={history}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Navbar />
      <Routes>
        <Route path="/" element={<Calendar events={events} />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/create-event" element={<EventForm />} />
        <Route path="/organizers" element={<OrganizersTab />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatBot /> {/* Добавлен чат-бот на все страницы */}
    </HistoryRouter>
  );
}

export default App;