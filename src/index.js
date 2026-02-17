import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
// YENİ: ThemeProvider ve oluşturduğumuz temayı import et
import { ThemeProvider } from '@mui/material/styles'; 
import theme from './theme'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Uygulamayı ThemeProvider ile sarıyoruz */}
    <ThemeProvider theme={theme}> 
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

reportWebVitals();