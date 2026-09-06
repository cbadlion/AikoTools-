import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <NotificationToastContainer />
        <App />
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>
);
