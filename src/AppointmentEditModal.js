import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Modal, Box, Typography, Button, Divider, 
    CircularProgress, Alert, Grid, TextField, 
    Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';

const API_URL = 'http://localhost:3000/api';

// Modal'ın stil ayarları
const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

function AppointmentEditModal({ open, onClose, appointmentData, onUpdateSuccess }) {
  
  // Form state'leri
  const [formData, setFormData] = useState({
    NewAppointmentDate: '',
    NewAppointmentTime: '',
    NewStatus: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 'appointmentData' değiştiğinde formu doldur
  useEffect(() => {
    if (appointmentData) {
      setFormData({
        NewAppointmentDate: new Date(appointmentData.AppointmentDate).toISOString().split('T')[0],
        NewAppointmentTime: appointmentData.AppointmentTime.substring(11, 19), // 14:00:00 formatı
        NewStatus: appointmentData.Status
      });
      setErrorMessage(''); 
    }
  }, [appointmentData]);

  // Formdaki değişiklikleri state'e yansıt
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Formu Kaydet
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage('');

    const appointmentIdToUpdate = appointmentData.AppointmentID; 

    try {
      await axios.put(`${API_URL}/secretary/appointments/${appointmentIdToUpdate}`, formData);
      
      setIsProcessing(false);
      onUpdateSuccess(); // Dashboard'a listeyi yenilemesini ve Modalı kapatmasını söyle

    } catch (err) {
      console.error("Randevu güncelleme hatası:", err);
      
      let customMessage = "Güncelleme sırasında bilinmeyen bir hata oluştu.";
      if (err.response?.data?.message) {
          customMessage = err.response.data.message;
      } else if (err.message === "Network Error") {
          customMessage = "Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun.";
      }
      
      setErrorMessage(customMessage);
      setIsProcessing(false);
    }
  };


  if (!open || !appointmentData) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style} component="form" onSubmit={handleUpdateSubmit}>
        
        {/* --- DÜZELTME 1: Başlıktan ID kaldırıldı --- */}
        <Typography variant="h6" component="h2" gutterBottom color="primary">
          Randevu Düzenle
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>Hasta:</strong> {appointmentData.PatientName} <br/>
          <strong>Doktor:</strong> {appointmentData.DoctorName}
        </Typography>
        
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          {/* Tarih Seçimi */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Randevu Tarihi"
              type="date"
              name="NewAppointmentDate"
              value={formData.NewAppointmentDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Saat Seçimi */}
          <Grid item xs={12} sm={6}>
             <TextField
              fullWidth
              required
              label="Randevu Saati"
              type="time" 
              name="NewAppointmentTime"
              value={formData.NewAppointmentTime}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                step: 1800, 
              }}
            />
          </Grid>

          {/* Durum Seçimi */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="status-select-label">Randevu Durumu</InputLabel>
              <Select
                labelId="status-select-label"
                label="Randevu Durumu"
                name="NewStatus"
                value={formData.NewStatus}
                onChange={handleChange}
                
                // --- DÜZELTME 2: Menü kaymasını (top) düzelten MenuProps ---
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left"
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left"
                  },
                  getContentAnchorEl: null
                }}
              >
                {/* --- DÜZELTME 3: Menü seçenekleri kısıtlandı --- */}
                <MenuItem value="Beklemede">Beklemede</MenuItem>
                <MenuItem value="Onaylandı">Onaylandı</MenuItem>
                <MenuItem value="İptal Edildi">İptal Edildi</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Hata Mesajı */}
        {errorMessage && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert>}

        {/* Butonlar */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
            <Button onClick={onClose} variant="outlined" color="secondary" disabled={isProcessing}>
                İptal
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={isProcessing}>
                {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Kaydet'}
            </Button>
        </Box>
        
      </Box>
    </Modal>
  );
}

export default AppointmentEditModal;