import React, { useState } from 'react';
import axios from 'axios';
// MUI Bileşenleri
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';

const API_URL = 'http://localhost:3000/api';

// Artık sadece onBack prop'unu alıyor
function Register({ onBack }) {
  const [formData, setFormData] = useState({
    FirstName: '', LastName: '', TCNo: '', Gender: 'Kadın', DateOfBirth: '',
    Username: '', Password: '', Email: '', PhoneNumber: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); setError(''); setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/register`, formData);
      setMessage(response.data.message);
      setFormData({ // Formu temizle
        FirstName: '', LastName: '', TCNo: '', Gender: 'Kadın', DateOfBirth: '',
        Username: '', Password: '', Email: '', PhoneNumber: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
      console.error('Kayıt hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Hasta Kayıt Formu
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
          {/* Form Alanları (MUI TextField ve Select) */}
          <TextField margin="normal" required fullWidth id="firstName" label="Ad" name="FirstName" value={formData.FirstName} onChange={handleChange} autoFocus />
          <TextField margin="normal" required fullWidth id="lastName" label="Soyad" name="LastName" value={formData.LastName} onChange={handleChange} />
          <TextField margin="normal" required fullWidth id="tcno" label="TC Kimlik No" name="TCNo" value={formData.TCNo} onChange={handleChange} inputProps={{ maxLength: 11 }} />
          <FormControl fullWidth margin="normal">
            <InputLabel id="gender-select-label">Cinsiyet</InputLabel>
            <Select labelId="gender-select-label" id="gender" name="Gender" value={formData.Gender} label="Cinsiyet" onChange={handleChange}>
              <MenuItem value="Kadın">Kadın</MenuItem>
              <MenuItem value="Erkek">Erkek</MenuItem>
              <MenuItem value="Belirtilmedi">Belirtmek İstemiyorum</MenuItem>
            </Select>
          </FormControl>
          <TextField margin="normal" required fullWidth id="dob" label="Doğum Tarihi" name="DateOfBirth" type="date" value={formData.DateOfBirth} onChange={handleChange} InputLabelProps={{ shrink: true }} />
          <TextField margin="normal" required fullWidth id="username" label="Kullanıcı Adı" name="Username" value={formData.Username} onChange={handleChange} />
          <TextField margin="normal" required fullWidth name="Password" label="Şifre" type="password" id="password" value={formData.Password} onChange={handleChange} />
          <TextField margin="normal" required fullWidth id="email" label="E-posta Adresi" name="Email" type="email" value={formData.Email} onChange={handleChange} />
          <TextField margin="normal" fullWidth id="phone" label="Telefon Numarası (Opsiyonel)" name="PhoneNumber" type="tel" value={formData.PhoneNumber} onChange={handleChange} />

          {/* Mesajlar */}
          {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ width: '100%', mt: 2 }}>{message}</Alert>}

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydol'}
          </Button>

          {/* Geri Butonu (Login linki yerine - Metni güncellendi) */}
          <Button
            variant="text"
            onClick={onBack} // App.js'den gelen fonksiyonu çağırarak seçim ekranına dön
            sx={{ display:'block', margin:'auto' }} // Ortalamak için
          >
            &lt; Hasta Girişine Geri Dön {/* <-- METİN GÜNCELLENDİ */}
          </Button>

        </Box>
      </Box>
    </Container>
  );
}

export default Register;