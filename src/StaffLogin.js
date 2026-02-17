import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // BUNU EKLE
// MUI Bileşenleri
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

const API_URL = 'http://localhost:3000/api';

// onLoginSuccess ve onBack proplarını alıyor
function StaffLogin({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // BUNU EKLE

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);

    try {
      // Backend'e istek gönderirken Username gönderiyoruz
      const response = await axios.post(`${API_URL}/login`, { 
        Username: username, // Username gönder
        Password: password,
      });
      
      console.log('Giriş başarılı, kullanıcı:', response.data);
      
      setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
      onLoginSuccess(response.data);
      
      // ✅ YÖNLENDİRME EKLENDİ
      // Laborant (RoleID=5) ise lab-dashboard'a, değilse dashboard'a yönlendir
      setTimeout(() => {
        if (response.data.RoleID === 5) {
          navigate('/lab-dashboard'); // Laboratuvar Paneli
        } else {
          navigate('/dashboard'); // Normal Dashboard
        }
      }, 1000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş sırasında bir hata oluştu.');
      console.error('Personel giriş hatası:', err);
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Personel Girişi 
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal" required fullWidth id="username" label="Kullanıcı Adı"
            name="username" autoComplete="username" autoFocus
            value={username} onChange={(e) => setUsername(e.target.value)}
            error={!!error}
          />
          <TextField
            margin="normal" required fullWidth name="password" label="Şifre" type="password"
            id="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            error={!!error}
          />
          {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ width: '100%', mt: 1 }}>{message}</Alert>}
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>
           {/* Geri Butonu */}
           <Button variant="text" onClick={onBack} sx={{ mt: 1, display:'block', margin:'auto' }}>
             &lt; Geri
           </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default StaffLogin;