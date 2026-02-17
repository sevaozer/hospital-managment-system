import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Modal, Box, Typography, Button, Grid, TextField,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, List, ListItem, ListItemButton, ListItemText, Divider
} from '@mui/material';

const API_URL = 'http://localhost:3000/api';

// Modal'ın ekran ortasında görünmesi için temel stil
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 600 }, // Form için biraz daha geniş
  maxHeight: '90vh', // Yüksekliği ayarla
  overflowY: 'auto', // Gerekirse kaydırma çubuğu
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

// Randevu saat aralıklarını (Sabah 9 - Akşam 5, 30 dk arayla)
const allTimeSlots = [
  '09:00:00', '09:30:00', '10:00:00', '10:30:00', 
  '11:00:00', '11:30:00', '12:00:00', '12:30:00',
  '13:30:00', '14:00:00', '14:30:00', '15:00:00', 
  '15:30:00', '16:00:00', '16:30:00'
];

function SecretaryNewAppointmentModal({ open, onClose, onSuccess }) {
  
  // Adım yönetimi (1: Hasta Arama, 2: Form Doldurma)
  const [step, setStep] = useState(1);

  // Adım 1: Hasta Arama
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Adım 2: Form
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    PatientID: '',
    DepartmentID: '',
    DoctorID: '',
    AppointmentDate: new Date().toISOString().split('T')[0], // Varsayılan olarak bugün
    AppointmentTime: '',
    Complaint: ''
  });

  // --- FORM SIFIRLAMA ---
  const resetForm = () => {
    setStep(1);
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
    setSearchError('');
    setSelectedPatient(null);
    setDepartments([]);
    setDoctors([]);
    setAvailableSlots([]);
    setIsFetchingSlots(false);
    setIsSaving(false);
    setFormError('');
    setFormData({
      PatientID: '',
      DepartmentID: '',
      DoctorID: '',
      AppointmentDate: new Date().toISOString().split('T')[0],
      AppointmentTime: '',
      Complaint: ''
    });
  };

  // Modal kapandığında tüm state'i sıfırla
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // --- ADIM 1: HASTA ARAMA FONKSİYONLARI ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchTerm.trim().length < 2) {
      setSearchError('Aramak için en az 2 karakter giriniz.');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    try {
      const res = await axios.get(`${API_URL}/patients/search?term=${searchTerm.trim()}`);
      setSearchResults(res.data);
      if (res.data.length === 0) {
        setSearchError('Bu kriterlere uyan hasta bulunamadı.');
      }
    } catch (err) {
      setSearchError('Hasta aranırken bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, PatientID: patient.PatientID }));
    setStep(2); // 2. adıma geç
  };

  // --- ADIM 2: FORM DOLDURMA FONKSİYONLARI ---

  // Adım 2'ye geçildiğinde departmanları yükle
  useEffect(() => {
    if (step === 2 && departments.length === 0) {
      axios.get(`${API_URL}/departments`)
        .then(res => setDepartments(res.data))
        .catch(err => setFormError('Departmanlar yüklenemedi.'));
    }
  }, [step, departments.length]);

  // Form alanlarındaki değişiklikleri state'e yansıt
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Departman değişirse doktor listesini sıfırla ve yenile
    if (name === 'DepartmentID') {
      setFormData(prev => ({ ...prev, DoctorID: '', AppointmentTime: '' }));
      setAvailableSlots([]);
      setDoctors([]);
      axios.get(`${API_URL}/departments/${value}/doctors`)
        .then(res => setDoctors(res.data))
        .catch(err => setFormError('Doktorlar yüklenemedi.'));
    }

    // Doktor değişirse saatleri sıfırla
    if (name === 'DoctorID') {
      setFormData(prev => ({ ...prev, AppointmentTime: '' }));
      setAvailableSlots([]);
      // Tarih zaten seçiliyse saatleri getir
      if (formData.AppointmentDate) {
        fetchAvailableSlots(value, formData.AppointmentDate);
      }
    }

    // Tarih değişirse saatleri sıfırla
    if (name === 'AppointmentDate') {
      setFormData(prev => ({ ...prev, AppointmentTime: '' }));
      setAvailableSlots([]);
      // Doktor zaten seçiliyse saatleri getir
      if (formData.DoctorID) {
        fetchAvailableSlots(formData.DoctorID, value);
      }
    }
  };

  // Müsait saatleri (dolu olanları filtreleyerek) getir
  const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    setIsFetchingSlots(true);
    setFormError('');
    try {
      // API'den SADECE DOLU saatleri al
      const res = await axios.get(`${API_URL}/doctors/${doctorId}/availability?date=${date}`);
      const takenSlots = res.data; // ["10:00:00", "11:30:00"]
      
      // Tüm saatlerden dolu olanları çıkar
      const available = allTimeSlots.filter(slot => !takenSlots.includes(slot));
      setAvailableSlots(available);
      if (available.length === 0) {
        setFormError('Seçilen doktor için bu tarihte müsait randevu saati bulunmamaktadır.');
      }
    } catch (err) {
      setFormError('Müsait saatler getirilemedi.');
    } finally {
      setIsFetchingSlots(false);
    }
  };

  // Formu Kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');

    // Backend'in beklediği format
    const payload = {
      PatientID: formData.PatientID,
      DoctorID: formData.DoctorID,
      AppointmentDate: formData.AppointmentDate,
      AppointmentTime: formData.AppointmentTime,
      Complaint: formData.Complaint || 'Randevu sekreter tarafından oluşturuldu.'
    };

    try {
      await axios.post(`${API_URL}/secretary/appointments`, payload);
      // Başarılı olursa Dashboard'a haber ver (listeyi yenilemesi için)
      onSuccess(); 
    } catch (err) {
      setFormError(err.response?.data?.message || 'Randevu kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" gutterBottom color="primary">
          Yeni Randevu Oluştur
        </Typography>

        {/* --- ADIM 1: HASTA ARAMA --- */}
        {step === 1 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Adım 1: Hasta Seçimi</Typography>
            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, my: 2 }}>
              <TextField
                fullWidth
                label="Hasta Adı, Soyadı veya TC No"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={isSearching}>
                {isSearching ? <CircularProgress size={24} /> : 'Ara'}
              </Button>
            </Box>

            {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}

            {searchResults.length > 0 && (
              <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {searchResults.map(patient => (
                  <ListItemButton key={patient.PatientID} onClick={() => handlePatientSelect(patient)}>
                    <ListItemText 
                      primary={`${patient.FirstName} ${patient.LastName}`} 
                      secondary={`TC: ${patient.TCNo} - Tel: ${patient.PhoneNumber || '-'}`} 
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* --- ADIM 2: RANDEVU FORMU --- */}
        {step === 2 && selectedPatient && (
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Adım 2: Randevu Bilgileri (Hasta: <strong>{selectedPatient.FirstName} {selectedPatient.LastName}</strong>)
              </Typography>
              <Button size="small" onClick={() => setStep(1)}>Hasta Değiştir</Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Departman Seçiniz</InputLabel>
                  <Select name="DepartmentID" value={formData.DepartmentID} label="Departman Seçiniz" onChange={handleFormChange}>
                    {departments.map(dept => (
                      <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={doctors.length === 0}>
                  <InputLabel>Doktor Seçiniz</InputLabel>
                  <Select name="DoctorID" value={formData.DoctorID} label="Doktor Seçiniz" onChange={handleFormChange}>
                    {doctors.map(doc => (
                      <MenuItem key={doc.DoctorID} value={doc.DoctorID}>{doc.FirstName} {doc.LastName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="AppointmentDate"
                  label="Randevu Tarihi"
                  type="date"
                  value={formData.AppointmentDate}
                  onChange={handleFormChange}
                  fullWidth
                  required
                  disabled={!formData.DoctorID}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required disabled={isFetchingSlots || availableSlots.length === 0}>
                  <InputLabel>Müsait Saatler</InputLabel>
                  <Select name="AppointmentTime" value={formData.AppointmentTime} label="Müsait Saatler" onChange={handleFormChange}>
                    {isFetchingSlots ? (
                      <MenuItem disabled><i>Saatler yükleniyor...</i></MenuItem>
                    ) : (
                      availableSlots.map(slot => (
                        <MenuItem key={slot} value={slot}>{slot.substring(0, 5)}</MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="Complaint"
                  label="Şikayet veya Not (İsteğe bağlı)"
                  value={formData.Complaint}
                  onChange={handleFormChange}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>

            {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={handleClose} color="secondary" disabled={isSaving}>
                İptal
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={isSaving || !formData.AppointmentTime}>
                {isSaving ? <CircularProgress size={24} /> : 'Randevu Oluştur'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Sadece Kapat butonu (Adım 1'deyken) */}
        {step === 1 && (
          <Button onClick={handleClose} color="secondary" sx={{ mt: 2, float: 'right' }}>
            İptal
          </Button>
        )}

      </Box>
    </Modal>
  );
}

export default SecretaryNewAppointmentModal;