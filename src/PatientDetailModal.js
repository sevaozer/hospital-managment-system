import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Modal, Box, Typography, Button, Divider, 
    CircularProgress, List, ListItem, ListItemText, Alert, 
    Card, CardContent, Grid, Tabs, Tab, TextField, MenuItem, 
    InputLabel, FormControl, Select, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'; 

const API_URL = 'http://localhost:3000/api';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', md: '80%' },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto',
  borderRadius: 2,
};

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
      <div hidden={value !== index} id={`simple-tabpanel-${index}`} {...other}>
        {value === index && (<Box sx={{ pt: 3 }}>{children}</Box>)}
      </div>
    );
};

function PatientDetailModal({ patientData, open, onClose, doctorId }) {
  const [history, setHistory] = useState({ appointments: [], prescriptions: [], labResults: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  
  // LAB İSTEMİ FORM STATE'LERİ
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [labTestName, setLabTestName] = useState('');
  const [labTestType, setLabTestType] = useState('');
  const [labNotes, setLabNotes] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState(null);

  // YENİ İŞLEM FORMU STATE'LERİ
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newPrescription, setNewPrescription] = useState('');
  const [selectedAppointmentIdForDiagnosis, setSelectedAppointmentIdForDiagnosis] = useState('');

  // Veri Çekme Efekti
  useEffect(() => {
    if (open && patientData?.PatientID) {
      setLoading(true);
      setError('');
      
      const fetchPatientHistory = async () => {
        try {
          const [apptsRes, presRes, labRes] = await Promise.all([
            axios.get(`${API_URL}/patients/${patientData.PatientID}/appointments`),
            axios.get(`${API_URL}/patients/${patientData.PatientID}/prescriptions`),
            axios.get(`${API_URL}/patients/${patientData.PatientID}/lab-results`),
          ]);

          setHistory({
            appointments: apptsRes.data,
            prescriptions: presRes.data,
            labResults: labRes.data,
          });

        } catch (err) {
          console.error("Hasta geçmişi yüklenirken hata:", err);
          setError("Hastanın geçmiş tıbbi kayıtları yüklenirken bir sorun oluştu.");
        } finally {
          setLoading(false);
        }
      };
      fetchPatientHistory();
    }
  }, [open, patientData]); 

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
    return age;
  };
  const patientAge = patientData.DateOfBirth ? calculateAge(patientData.DateOfBirth) : 'N/A';
  
  // Teşhis Kaydetme
  const handleNewRecordSubmit = async (recordType) => {
    if (!selectedAppointmentIdForDiagnosis) {
      setProcessMessage({ type: 'error', text: 'Lütfen işlem yapılacak bir randevu seçin.' });
      return;
    }
    
    setIsProcessing(true);
    setProcessMessage(null);
    
    try {
      if (recordType === 'diagnosis' && newDiagnosis.trim()) {
        const data = { AppointmentID: selectedAppointmentIdForDiagnosis, Diagnosis: newDiagnosis };
        await axios.post(`${API_URL}/medical-records`, data);
        setProcessMessage({ type: 'success', text: `Yeni teşhis başarıyla kaydedildi.` });
        setNewDiagnosis('');
      }
      else {
          setProcessMessage({ type: 'warning', text: 'Lütfen formu doldurun.' });
      }

    } catch (err) {
      setProcessMessage({ type: 'error', text: err.response?.data?.message || 'İşlem sırasında bir hata oluştu.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // LAB İSTEMİ GÖNDER
  const handleLabRequestSubmit = async () => {
    if (!selectedAppointmentId || !labTestName.trim()) {
      setProcessMessage({ type: 'error', text: 'Lütfen randevu ve test adını giriniz.' });
      return;
    }

    setIsProcessing(true);
    setProcessMessage(null);

    try {
      const response = await axios.post(`${API_URL}/lab/requests`, {
        appointmentId: parseInt(selectedAppointmentId),
        testName: labTestName,
        testType: labTestType,
        additionalNotes: labNotes
      });

      if (response.data.success) {
        setProcessMessage({ type: 'success', text: 'Laboratuvar test isteği başarıyla oluşturuldu!' });
        
        // Formu sıfırla
        setTimeout(() => {
          setLabDialogOpen(false);
          setLabTestName('');
          setLabTestType('');
          setLabNotes('');
          setSelectedAppointmentId('');
          setProcessMessage(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Lab isteği hatası:', err);
      setProcessMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Lab isteği oluşturulamadı.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Yükleme ve Hata Kontrolü
  if (loading) {
    return (
      <Modal open={open} onClose={onClose}>
        <Box sx={{...style, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Tıbbi geçmiş yükleniyor...</Typography>
        </Box>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal open={open} onClose={onClose}>
        <Box sx={style}>
          <Alert severity="error">{error}</Alert>
          <Button onClick={onClose} sx={{ mt: 2 }} variant="contained">Kapat</Button>
        </Box>
      </Modal>
    );
  }

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box sx={style}>
          {/* BAŞLIK VE KAPAT BUTONU */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2" color="primary">
                  {patientData.FirstName} {patientData.LastName} Detaylı Hasta Kaydı
              </Typography>
              <Button onClick={onClose} variant="outlined" color="primary">
                  Kapat
              </Button>
          </Box>

          {/* TEMEL BİLGİLER */}
          <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                  <Grid container spacing={1}>
                      <Grid item xs={6}><Typography variant="body2"><strong>TC No:</strong> {patientData.TCNo}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2"><strong>Yaş:</strong> {patientAge}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2"><strong>Cinsiyet:</strong> {patientData.Gender}</Typography></Grid>
                      <Grid item xs={6}><Typography variant="body2"><strong>Telefon:</strong> {patientData.PhoneNumber || '-'}</Typography></Grid>
                  </Grid>
              </CardContent>
          </Card>

          {/* SEKME NAVİGASYONU */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                  value={selectedTab} 
                  onChange={(e, newValue) => setSelectedTab(newValue)} 
                  aria-label="hasta detay sekmeleri"
                  variant="scrollable"
              >
                  <Tab label={`Randevu (${history.appointments.length})`} />
                  <Tab label={`Reçete (${history.prescriptions.length})`} />
                  <Tab label={`Lab Sonuçları (${history.labResults.length})`} />
                  <Tab label="Yeni İşlem" /> 
              </Tabs>
          </Box>

          {/* SEKME İÇERİKLERİ */}
          <Box> 
              <TabPanel value={selectedTab} index={0}>
                {/* 1. Randevu Geçmişi */}
                {history.appointments.length > 0 ? (
                      <List dense>
                          {history.appointments.map(app => (
                              <ListItem key={app.AppointmentID} divider>
                                  <ListItemText
                                      primary={`[${new Date(app.AppointmentDate).toLocaleDateString('tr-TR')}] Saat: ${app.AppointmentTime.substring(11, 16)} - Dr. ${app.DoctorName}`}
                                      secondary={`Durum: ${app.Status} - Şikayet: ${app.Complaint || 'Yok'}`}
                                  />
                              </ListItem>
                          ))}
                      </List>
                  ) : (<Typography variant="body2" color="text.secondary">Geçmiş randevu kaydı bulunmamaktadır.</Typography>)}
              </TabPanel>

              <TabPanel value={selectedTab} index={1}>
                {/* 2. Reçete Geçmişi */}
                 {history.prescriptions.length > 0 ? (
                      <List dense>
                          {history.prescriptions.map(pres => (
                               <ListItem key={pres.PrescriptionID} divider>
                                  <ListItemText
                                      primary={`[${new Date(pres.PrescriptionDate).toLocaleDateString('tr-TR')}] Dr. ${pres.DoctorName}`}
                                      secondary={<pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize:'0.85rem' }}>{pres.Details}</pre>}
                                  />
                              </ListItem>
                          ))}
                      </List>
                  ) : (<Typography variant="body2" color="text.secondary">Kayıtlı reçete geçmişi bulunmamaktadır.</Typography>)}
              </TabPanel>

              <TabPanel value={selectedTab} index={2}>
                {/* 3. Lab Sonuçları */}
                {history.labResults.length > 0 ? (
                      <List dense>
                          {history.labResults.map(lab => (
                              <ListItem key={lab.TestID} divider>
                                   <ListItemText
                                      primary={`${lab.TestName} - Durum: ${lab.Status}`}
                                      secondary={`İstek T: ${new Date(lab.RequestDate).toLocaleDateString('tr-TR')}, Sonuç: ${lab.ResultDate ? new Date(lab.ResultDate).toLocaleDateString('tr-TR') : 'Bekleniyor'}`}
                                  />
                                  {lab.Results && <Alert severity="info" variant="outlined" sx={{mt:1}}>{lab.Results}</Alert>}
                              </ListItem>
                          ))}
                      </List>
                  ) : (<Typography variant="body2" color="text.secondary">Kayıtlı laboratuvar sonucu bulunmamaktadır.</Typography>)}
              </TabPanel>

              <TabPanel value={selectedTab} index={3}>
                {/* YENİ İŞLEM FORMLARI */}
                <Typography variant="h6" gutterBottom>Yeni Tıbbi İşlemler</Typography>
                {processMessage && <Alert severity={processMessage.type} sx={{mb:1}}>{processMessage.text}</Alert>}

                {/* Randevu Seçimi */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{mb:1}}>İşlem Yapılacak Randevu Seçimi:</Typography>
                    <TextField 
                        select
                        fullWidth
                        label="Muayene Edilecek Randevu"
                        value={selectedAppointmentIdForDiagnosis}
                        onChange={(e) => {
                            setSelectedAppointmentIdForDiagnosis(e.target.value); 
                            setProcessMessage(null);
                          }}
                        variant="outlined"
                        size="small"
                    >
                        {history.appointments
                            .filter(app => app.Status !== 'Tamamlandı' && new Date(app.AppointmentDate) <= new Date()) 
                            .map((app) => (
                                <MenuItem key={app.AppointmentID} value={app.AppointmentID}>
                                    {new Date(app.AppointmentDate).toLocaleDateString('tr-TR')} - {app.AppointmentTime.substring(11, 16)} - Durum: {app.Status}
                                </MenuItem>
                            ))}
                    </TextField>
                </Box>

                <Divider sx={{ my: 2 }} />
                
                {/* Teşhis Formu */}
                <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>Yeni Teşhis ve Muayene Notu</Typography>
                <TextField
                    fullWidth
                    label="Teşhis ve Muayene Notu"
                    multiline
                    rows={4}
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 1 }}
                    disabled={!selectedAppointmentIdForDiagnosis || isProcessing}
                />
                <Button 
                    variant="contained" 
                    onClick={() => handleNewRecordSubmit('diagnosis')} 
                    disabled={!newDiagnosis.trim() || isProcessing || !selectedAppointmentIdForDiagnosis}
                    sx={{ mr: 1 }}
                >
                    {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Teşhis Kaydet'}
                </Button>

                <Divider sx={{ my: 3 }} />

                {/* Lab İstemi Butonu */}
                <Typography variant="h6" component="h3" sx={{ mb: 1 }}>Laboratuvar Test İsteği</Typography>
                <Button 
                    variant="contained" 
                    color="warning"
                    onClick={() => {
                        setLabDialogOpen(true);
                        setSelectedAppointmentId(selectedAppointmentIdForDiagnosis);
                    }}
                    disabled={!selectedAppointmentIdForDiagnosis}
                >
                    Lab İsteği Oluştur
                </Button>

              </TabPanel>
          </Box>
        </Box>
      </Modal>

      {/* LAB İSTEMİ DİYALOG */}
      <Dialog 
        open={labDialogOpen} 
        onClose={() => {
          setLabDialogOpen(false);
          setProcessMessage(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Laboratuvar Test İsteği Oluştur</DialogTitle>
        <DialogContent>
          {processMessage && <Alert severity={processMessage.type} sx={{mb:2}}>{processMessage.text}</Alert>}
          
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Test Adı *"
              placeholder="Örn: Biyokimya Testi, Tam Kan Sayımı"
              value={labTestName}
              onChange={(e) => setLabTestName(e.target.value)}
              disabled={isProcessing}
            />
            
            <TextField
              fullWidth
              label="Test Türü"
              placeholder="Örn: Genel, Spesifik"
              value={labTestType}
              onChange={(e) => setLabTestType(e.target.value)}
              disabled={isProcessing}
            />
            
            <TextField
              fullWidth
              label="Ek Notlar"
              multiline
              rows={3}
              placeholder="Laboratuvar teknisyeni için ek bilgiler..."
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              disabled={isProcessing}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setLabDialogOpen(false);
              setProcessMessage(null);
            }}
            disabled={isProcessing}
          >
            İptal
          </Button>
          <Button 
            onClick={handleLabRequestSubmit}
            variant="contained"
            disabled={!labTestName.trim() || isProcessing}
          >
            {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'İsteği Gönder'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default PatientDetailModal;