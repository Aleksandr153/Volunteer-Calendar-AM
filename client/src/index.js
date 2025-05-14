import React from 'react';
import ReactDOM from 'react-dom/client';
import { CookiesProvider } from 'react-cookie'; // Добавлено
import App from './App';
process.env.IGNORE_UTIL_EXTEND_DEPRECATION = 'true';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CookiesProvider> {/* Обертка для работы с куки */}
      <App />
    </CookiesProvider>
  </React.StrictMode>
);