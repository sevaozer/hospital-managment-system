import React, { useState } from 'react';
import axios from 'axios';
// Link yerine Button kullanacağımız için onu kaldırdık veya Button'u MUI'den alıyoruz.
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

const API_URL = 'http://localhost:3000/api';

// Propları alıyoruz: onLoginSuccess, onBack, onSwitchToRegister
function PatientLogin({ onLoginSuccess, onBack, onSwitchToRegister }) {
  const [tcno, setTcno] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/login`, {
        TCNo: tcno,
        Password: password
      });
      setMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
      onLoginSuccess(response.data); // Başarılı girişi App.js'e bildir
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş sırasında bir hata oluştu.');
      console.error('Giriş hatası:', err);
      setLoading(false); // Sadece hata durumunda yüklemeyi bitir
    }
    // Başarılı olursa yönlendirme olacağı için setLoading(false) demeye gerek yok
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Hasta Girişi
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="tcno"
            label="TC Kimlik No"
            name="tcno"
            autoComplete="off"
            autoFocus
            value={tcno}
            onChange={(e) => setTcno(e.target.value)}
            inputProps={{ maxLength: 11 }}
            error={!!error}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!error}
          />
          {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ width: '100%', mt: 1 }}>{message}</Alert>}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </Button>

          {/* Kayıt formuna geçiş butonu */}
          <Typography variant="body2" align="center" sx={{ mb: 1 }}> {/* Altına biraz boşluk */}
            Kullanıcı değil misiniz?{' '}
            <Button
              variant="text"
              size="small" // Daha küçük buton
              onClick={onSwitchToRegister} // Register'ı göster
            >
              Kaydolun
            </Button>
          </Typography>

          {/* Geri Butonu */}
          <Button
            variant="text"
            onClick={onBack} // Seçim ekranına geri dön
            sx={{ display:'block', margin:'auto' }} // Ortalamak için
          >
            &lt; Giriş Yöntemi Seçimine Geri Dön
          </Button>

        </Box>
      </Box>
    </Container>
  );
}

export default PatientLogin;