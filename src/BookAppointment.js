import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; 
import { 
    Box, Typography, Button, CircularProgress, Alert, 
    TextField, MenuItem, InputLabel, FormControl, Select 
} from '@mui/material';

const API_URL = 'http://localhost:3000/api';

// Günlük çalışma saatleri (09:00 - 17:00 arası, 30'ar dakika arayla)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour <= 17; hour++) {
    slots.push(
      `${hour.toString().padStart(2, '0')}:00:00`,
      `${hour.toString().padStart(2, '0')}:30:00`
    );
  }
  return slots;
};
const allTimeSlots = generateTimeSlots();

function BookAppointment({ currentUser }) {
  const navigate = useNavigate(); 

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [complaint, setComplaint] = useState('');

  const [loading, setLoading] = useState({ dept: false, doc: false, slots: false, submit: false });
  const [message, setMessage] = useState({ type: '', text: '' });

  const [bookedSlotsFromAPI, setBookedSlotsFromAPI] = useState([]);

  // 1. Bileşen yüklendiğinde Departmanları çek
  useEffect(() => {
    setLoading(prev => ({ ...prev, dept: true }));
    axios.get(`${API_URL}/departments`)
      .then(res => {
        console.log('✅ Departmanlar yüklendi:', res.data);
        setDepartments(res.data);
      })
      .catch(err => {
        console.error("Departmanlar yüklenirken hata:", err);
        setMessage({ type: 'error', text: 'Departmanlar yüklenemedi.' });
      })
      .finally(() => setLoading(prev => ({ ...prev, dept: false })));
  }, []);

  // 2. Departman seçildiğinde Doktorları çek - DÜZELTILDI
  useEffect(() => {
    if (selectedDept) {
      setLoading(prev => ({ ...prev, doc: true }));
      setDoctors([]); 
      setSelectedDoctor(''); 
      
      console.log(`👨‍⚕️ Doktorlar yükleniyor... DeptID: ${selectedDept}`);
      
      axios.get(`${API_URL}/departments/${selectedDept}/doctors`)
        .then(res => {
          console.log("📥 BACKEND DOKTOR YANITI:", res.data);
          setDoctors(res.data);
        })
        .catch(err => {
          console.error("Doktorlar yüklenirken hata:", err);
          setMessage({ type: 'error', text: 'Doktorlar yüklenemedi.' });
        })
        .finally(() => setLoading(prev => ({ ...prev, doc: false })));
    }
  }, [selectedDept]);

  // 3. Doktor VEYA Tarih seçildiğinde Dolu Saatleri çek
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoading(prev => ({ ...prev, slots: true }));
      setAvailableSlots([]); 
      setBookedSlotsFromAPI([]);
      setSelectedTime(''); 

      console.log(`📞 BOOK APPOINTMENT - availability endpoint:`, 
                 `${API_URL}/doctors/${selectedDoctor}/availability?date=${selectedDate}`);
      
      axios.get(`${API_URL}/doctors/${selectedDoctor}/availability?date=${selectedDate}`)
        .then(res => {
          const takenSlotsFromAPI = res.data || [];
          
          console.log("🔴 BOOK APPOINTMENT - Backend'den gelen DOLU saatler:", takenSlotsFromAPI);
          setBookedSlotsFromAPI(takenSlotsFromAPI);
          
          console.log("📋 BOOK APPOINTMENT - Kontrol edilecek saatler:", allTimeSlots);
          
          const available = allTimeSlots.filter(slot => {
            const timeOnly = slot.substring(0, 5);
            const isBooked = takenSlotsFromAPI.some(backendSlot => {
              if (!backendSlot) return false;
              
              const slotStr = String(backendSlot).trim();
              
              const convertToTurkishTime = (backendTime) => {
                if (!backendTime || typeof backendTime !== 'string') return '';
                
                const match = backendTime.match(/(\d{1,2}):(\d{2})/);
                if (!match) return backendTime;
                
                let hour = parseInt(match[1], 10);
                const minute = match[2];
                
                let turkishHour = hour - 2;
                
                if (turkishHour < 0) turkishHour += 24;
                if (turkishHour >= 24) turkishHour -= 24;
                
                return `${String(turkishHour).padStart(2, '0')}:${minute}`;
              };
              
              const turkishBackendTime = convertToTurkishTime(slotStr);
              console.log(`🔄 BOOK - Backend ${slotStr} → Turkish ${turkishBackendTime}`);
              console.log(`✅ BOOK - Karşılaştırma: ${timeOnly} vs ${turkishBackendTime}`);
              
              return timeOnly === turkishBackendTime;
            });
            
            if (isBooked) {
              console.log(`❌ BOOK - ${timeOnly} DOLU olarak işaretlendi`);
            } else {
              console.log(`✅ BOOK - ${timeOnly} MÜSAİT`);
            }
            
            return !isBooked;
          });
          
          console.log("🎯 BOOK APPOINTMENT - SONUÇ MÜSAİT SAATLER:", available);
          setAvailableSlots(available);
        })
        .catch(err => {
          console.error("❌ BOOK APPOINTMENT - Availability API hatası:", err);
          setMessage({ type: 'error', text: 'Müsait saatler yüklenemedi.' });
        })
        .finally(() => {
          setLoading(prev => ({ ...prev, slots: false }));
        });
    }
  }, [selectedDoctor, selectedDate]);

  // 4. Formu Gönder (Randevu Al)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 FORM SUBMIT ÇAĞRILDI!');
    console.log('Seçimler:', { 
        selectedDept, 
        selectedDoctor, 
        selectedDate, 
        selectedTime,
        currentUserID: currentUser?.UserID
    });
    
    if (!selectedDept || !selectedDoctor || !selectedDate || !selectedTime || !currentUser?.UserID) {
      console.error('❌ EKSİK ALAN!');
      setMessage({ type: 'error', text: 'Lütfen tüm alanları doldurun.' });
      return;
    }
    
    setLoading(prev => ({ ...prev, submit: true }));
    setMessage({ type: '', text: '' });

    try {
      let [hours, minutes] = selectedTime.split(':');
      let hourNum = parseInt(hours, 10);
      
      hourNum = hourNum + 2;
      
      if (hourNum >= 24) hourNum -= 24;
      
      const backendTime = `${String(hourNum).padStart(2, '0')}:${minutes}:00`;
      
      console.log(`🔄 BOOK APPOINTMENT - Saat dönüşümü (Gönderim):`);
      console.log(`   Frontend seçimi (Turkish): ${selectedTime}`);
      console.log(`   Backend'e gönderilecek (UTC): ${backendTime}`);

      const appointmentData = {
        PatientID: currentUser.UserID,
        DoctorID: selectedDoctor,
        AppointmentDate: selectedDate,
        AppointmentTime: backendTime,
        Complaint: complaint || 'Muayene Talebi'
      };
      
      console.log("📤 BOOK APPOINTMENT - Gönderilen randevu verisi:", appointmentData);
      
      const response = await axios.post(`${API_URL}/appointments`, appointmentData);
      
      setMessage({ type: 'success', text: response.data.message + " Randevunuz sekreter onayına gönderilmiştir." });
      
      setSelectedDept(''); setSelectedDoctor(''); setSelectedDate(''); setSelectedTime(''); setComplaint('');
      setDoctors([]); setAvailableSlots([]);
      setBookedSlotsFromAPI([]);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      console.error("Randevu alma hatası:", err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Randevu alınırken bir hata oluştu.' });
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h5" component="h2" gutterBottom>
        Yeni Randevu Al
      </Typography>
      
      {/* Adım 1: Departman Seçimi */}
      <FormControl fullWidth margin="normal" disabled={loading.dept}>
        <InputLabel id="dept-label">Departman Seçiniz *</InputLabel>
        <Select
          labelId="dept-label"
          value={selectedDept}
          label="Departman Seçiniz *"
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          {loading.dept ? <MenuItem disabled>Yükleniyor...</MenuItem> 
            : departments.map(dept => (
                <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentName}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Adım 2: Doktor Seçimi */}
      {selectedDept && (
        <FormControl fullWidth margin="normal" disabled={loading.doc}>
          <InputLabel id="doc-label">Doktor Seçiniz *</InputLabel>
          <Select
            labelId="doc-label"
            value={selectedDoctor}
            label="Doktor Seçiniz *"
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {console.log('DEBUG DOCTORS:', doctors, 'LOADING:', loading.doc)}
            {loading.doc ? <MenuItem disabled>Doktorlar yükleniyor...</MenuItem> 
              : doctors.length > 0 ? (
                  doctors.map(doc => (
                      <MenuItem key={doc.DoctorID} value={doc.DoctorID}>
                          {doc.DoctorName}
                      </MenuItem>
                  ))
              ) : (
                  <MenuItem disabled>Doktor bulunamadı!</MenuItem>
              )}
          </Select>
        </FormControl>
      )}

      {/* Adım 3: Tarih Seçimi */}
      {selectedDoctor && (
        <TextField
          margin="normal"
          required
          fullWidth
          label="Randevu Tarihi"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: new Date().toISOString().split('T')[0] }}
        />
      )}
      
      {/* Adım 4: Saat Seçimi */}
      {selectedDate && (
        <>
          <FormControl fullWidth margin="normal" disabled={loading.slots}>
            <InputLabel id="time-label">Randevu Saati *</InputLabel>
            <Select
              labelId="time-label"
              value={selectedTime}
              label="Randevu Saati *"
              onChange={(e) => setSelectedTime(e.target.value)}
            >
              {loading.slots ? (
                <MenuItem key="loading" disabled>Müsait saatler yükleniyor...</MenuItem>
              ) : (
                [
                  <MenuItem key="empty" value="">Saat Seçin</MenuItem>,
                  ...allTimeSlots.map(time => {
                    const timeOnly = time.substring(0, 5);
                    
                    const isBooked = bookedSlotsFromAPI.some(backendSlot => {
                      if (!backendSlot) return false;
                      
                      const slotStr = String(backendSlot).trim();
                      
                      const convertToTurkishTime = (backendTime) => {
                        if (!backendTime || typeof backendTime !== 'string') return '';
                        
                        const match = backendTime.match(/(\d{1,2}):(\d{2})/);
                        if (!match) return backendTime;
                        
                        let hour = parseInt(match[1], 10);
                        const minute = match[2];
                        
                        let turkishHour = hour - 2;
                        
                        if (turkishHour < 0) turkishHour += 24;
                        if (turkishHour >= 24) turkishHour -= 24;
                        
                        return `${String(turkishHour).padStart(2, '0')}:${minute}`;
                      };
                      
                      const turkishBackendTime = convertToTurkishTime(slotStr);
                      return timeOnly === turkishBackendTime;
                    });
                    
                    return (
                      <MenuItem 
                        key={time} 
                        value={time}
                        disabled={isBooked}
                        sx={{
                          backgroundColor: isBooked ? '#ffebee' : 'transparent',
                          color: isBooked ? '#d32f2f' : 'inherit',
                          '&:hover': {
                            backgroundColor: isBooked ? '#ffcdd2' : '#f5f5f5'
                          },
                          '&.Mui-disabled': {
                            opacity: 0.7,
                            color: '#d32f2f !important',
                            fontWeight: 'bold'
                          }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          width: '100%',
                          alignItems: 'center'
                        }}>
                          <span>{timeOnly}</span>
                          {isBooked ? (
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: 0.5
                            }}>
                              <span style={{ 
                                color: '#d32f2f',
                                fontWeight: 'bold',
                                fontSize: '0.75rem'
                              }}>
                                DOLU
                              </span>
                              <Box sx={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#d32f2f'
                              }} />
                            </Box>
                          ) : (
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: 0.5
                            }}>
                              <span style={{ 
                                color: '#4caf50',
                                fontSize: '0.75rem'
                              }}>
                                Müsait
                              </span>
                              <Box sx={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: '#4caf50'
                              }} />
                            </Box>
                          )}
                        </Box>
                      </MenuItem>
                    );
                  })
                ]
              )}
            </Select>
          </FormControl>
          
          {/* Dolu saatler için bilgilendirme */}
          <Box sx={{ mt: 1, mb: 2 }}>
            {(() => {
              const takenSlots = allTimeSlots.filter(slot => {
                const timeOnly = slot.substring(0, 5);
                return bookedSlotsFromAPI.some(backendSlot => {
                  if (!backendSlot) return false;
                  const slotStr = String(backendSlot).trim();
                  
                  const convertToTurkishTime = (backendTime) => {
                    if (!backendTime || typeof backendTime !== 'string') return '';
                    const match = backendTime.match(/(\d{1,2}):(\d{2})/);
                    if (!match) return backendTime;
                    let hour = parseInt(match[1], 10);
                    const minute = match[2];
                    let turkishHour = hour - 2;
                    if (turkishHour < 0) turkishHour += 24;
                    if (turkishHour >= 24) turkishHour -= 24;
                    return `${String(turkishHour).padStart(2, '0')}:${minute}`;
                  };
                  
                  const turkishBackendTime = convertToTurkishTime(slotStr);
                  return timeOnly === turkishBackendTime;
                });
              }).map(slot => slot.substring(0, 5));
              
              console.log("📊 BOOK UI - Dolu saatler:", takenSlots);
              
              if (takenSlots.length > 0) {
                return (
                  <Alert severity="info" sx={{ fontSize: '0.85rem', py: 0.5 }}>
                    <strong>Not:</strong> Kırmızı renkli ve "DOLU" yazan saatler seçilemez.
                  </Alert>
                );
              } else if (!loading.slots && availableSlots.length > 0) {
                return (
                  <Alert severity="success" sx={{ fontSize: '0.85rem', py: 0.5 }}>
                    ✅ Tüm saatler müsait
                  </Alert>
                );
              }
              return null;
            })()}
          </Box>
        </>
      )}

      {/* Adım 5: Şikayet ve Gönder Butonu */}
      {selectedTime && (
        <>
          <TextField
            margin="normal"
            fullWidth
            label="Şikayetiniz (Opsiyonel)"
            multiline
            rows={3}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
          
          {message.text && (
            <Alert severity={message.type || 'info'} sx={{ mt: 2 }}>
              {message.text}
            </Alert>
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading.submit}
          >
            {loading.submit ? <CircularProgress size={24} /> : 'Randevu Oluştur'}
          </Button>
        </>
      )}
    </Box>
  );
}

export default BookAppointment;