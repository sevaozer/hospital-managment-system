import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    List, ListItem, ListItemText, Typography, Divider, 
    CircularProgress, Alert, Box, Button, Container, 
    TextField, Grid, Card, CardContent,
    MenuItem, InputLabel, FormControl, Select, Modal,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Stepper, Step, StepLabel, Snackbar,
    // === YENİ IMPORT'LAR ===
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    InputAdornment,
    IconButton,
    Paper,
    Badge,
    Tabs,
    Tab
} from '@mui/material'; 
import { Link as RouterLink } from 'react-router-dom';
import {
    Search,
    FilterList,
    DateRange,
    CalendarToday,
    Download,
    Visibility,
    ArrowUpward,
    ArrowDownward,
    Today,
    CalendarMonth,
    FormatListBulleted
} from '@mui/icons-material';
import PatientDetailModal from './PatientDetailModal'; 
import AppointmentEditModal from './AppointmentEditModal';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material'; 
import { Link } from '@mui/material'; 


const API_URL = 'http://localhost:3000/api';

function Dashboard({ currentUser, onLogout }) {
      const navigate = useNavigate();

    useEffect(() => {
        if (currentUser?.RoleID === 1) {
            console.log('🎯 Admin tespit edildi, yönlendiriliyor...');
            navigate('/admin-dashboard');
        }
    }, [currentUser, navigate]);
    // --- STATE DEĞİŞKENLERİ ---
    // Hasta
    const [appointments, setAppointments] = useState([]); 
    const [prescriptions, setPrescriptions] = useState([]); 
    const [labResults, setLabResults] = useState([]); 
    const [filteredAppointments, setFilteredAppointments] = useState([]);    
    // Doktor
    const [doctorAppointments, setDoctorAppointments] = useState([]);
    const [doctorSelectedDate, setDoctorSelectedDate] = useState('');
    // Sekreter
    const [dailyAppointments, setDailyAppointments] = useState([]); 
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Laborant 
     const [labTests, setLabTests] = useState([]);
     const [loadingLabTests, setLoadingLabTests] = useState(false);
     const [errorLabTests, setErrorLabTests] = useState('');
     const [selectedTest, setSelectedTest] = useState(null);
     const [isLabTestModalOpen, setIsLabTestModalOpen] = useState(false);

     const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
     const [selectedPatientForPrescription, setSelectedPatientForPrescription] = useState(null);
     const [prescriptionData, setPrescriptionData] = useState({
         medication: '',
         dosage: '',
         frequency: '',
         duration: '',
         notes: ''
});
    // Yükleme State'leri
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
    const [loadingLabResults, setLoadingLabResults] = useState(false);
    const [loadingDoctorAppointments, setLoadingDoctorAppointments] = useState(false);
    const [loadingDaily, setLoadingDaily] = useState(false);
    
    // Hata State'leri
    const [errorAppointments, setErrorAppointments] = useState('');
    const [errorPrescriptions, setErrorPrescriptions] = useState('');
    const [errorLabResults, setErrorLabResults] = useState('');
    const [errorDoctorAppointments, setErrorDoctorAppointments] = useState('');
    const [errorDaily, setErrorDaily] = useState('');

    // Hasta Arama (Doktor)
    const [searchTerm, setSearchTerm] = useState(''); 
    const [searchResults, setSearchResults] = useState([]); 
    const [searching, setSearching] = useState(false); 
    const [searchError, setSearchError] = useState(''); 

    // --- MODAL STATE'LERİ ---
    // Doktor - Hasta Detay Modalı
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);     
    const [selectedPatient, setSelectedPatient] = useState(null); 
    
    // Sekreter - Randevu Düzenleme Modalı
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);

    // YENİ: İptal/Yenileme Tetikleyici State'i
    const [refreshAppointments, setRefreshAppointments] = useState(0); 

    // YENİ: Sekreter için yeni randevu formu state'leri
    const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState({
        PatientID: '',
        DepartmentID: '',
        DoctorID: '',
        AppointmentDate: new Date().toISOString().split('T')[0],
        AppointmentTime: '',
        Complaint: ''
    });
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [activeStep, setActiveStep] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
     // Doktor için Yeni Laboratuvar İstemi
    const [isLabRequestModalOpen, setIsLabRequestModalOpen] = useState(false);
    const [selectedPatientForLab, setSelectedPatientForLab] = useState(null);
    const [labRequestData, setLabRequestData] = useState({
    testName: '',
    testType: '',
    additionalNotes: ''
    });
    const [commonTests, setCommonTests] = useState([
    'Tam Kan Sayımı (Hemogram)',
    'Biyokimya',
    'Hormon Testleri',
    'Enfeksiyon Markerları',
    'İdrar Tahlili',
    'Dışkı Tahlili',
    'Kan Grubu Testi',
    'Vitamin Düzeyleri',
    'Tiroid Fonksiyon Testleri',
    'Karaciğer Fonksiyon Testleri',
    'Böbrek Fonksiyon Testleri'
     ]);
      // === HASTA PANELİ FİLTRE STATE'LERİ ===
    const [activePatientSection, setActivePatientSection] = useState('appointments');
    const [appointmentFilters, setAppointmentFilters] = useState({
      dateRange: 'all',
      customStartDate: null,
      customEndDate: null,
      status: 'all',
      search: '',
      sortBy: 'date_desc',
      page: 0,
      rowsPerPage: 10
    });

    const [prescriptionFilters, setPrescriptionFilters] = useState({
      dateRange: 'all',
      status: 'all',
      search: '',
      sortBy: 'date_desc',
      page: 0,
      rowsPerPage: 10
    });

    const [labFilters, setLabFilters] = useState({
      dateRange: 'all',
      status: 'all',
      search: '',
      sortBy: 'date_desc',
      page: 0,
      rowsPerPage: 10
    });

    // İstatistikler için state
    const [stats, setStats] = useState({
      totalAppointments: 0,
      upcomingAppointments: 0,
      pendingPrescriptions: 0,
      recentLabResults: 0
    });

    // --- VERİ ÇEKME FONKSİYONLARI ---

    const fetchPatientAppointments = () => {
    if (!currentUser || currentUser.RoleID !== 3) return;
    setLoadingAppointments(true);
    setErrorAppointments('');
    axios.get(`${API_URL}/patients/${currentUser.UserID}/appointments`)
        .then(res => { 
            console.log("Hasta randevuları (RAW):", res.data);
            
            // ✅ Doktor adını düzelt
            const fixedAppointments = res.data.map(app => {
                // "Prof. Dr. System Admin" → "Prof. Dr. Fatih ÖZER" gibi
                // SP'den yanlış JOIN geliyorsa, manuel doktor adı bul
                
                // Eğer doktor adında "System Admin" varsa, database'den çek
                let doctorName = app.DoctorName;
                
                // Doktor adında "System" varsa → yanlış (SP JOIN hatası)
                if (doctorName && doctorName.includes('System')) {
                    // Backend'den doktor bilgisini çek
                    doctorName = 'Doktor Bilgisi Yükleniyor...';
                }
                
                return {
                    ...app,
                    DoctorName: doctorName
                };
            });
            
            console.log("Düzeltilmiş randevular:", fixedAppointments);
            setAppointments(fixedAppointments); 
        })
        .catch(err => { 
            console.error('Randevu hatası:', err); 
            setErrorAppointments('Randevular getirilemedi.'); 
        })
        .finally(() => setLoadingAppointments(false));
};
    const fetchDoctorAppointments = async (date = null) => {
  try {
    console.log('👨‍⚕️ DOKTOR PANELİ - Randevular çekiliyor...');
    setLoadingDoctorAppointments(true); // ✅ YÜKLEMEYİ BAŞLAT
    setErrorDoctorAppointments('');
    
    let doctorId = null;
    
    if (currentUser.doctorId || currentUser.DoctorID) {
      doctorId = currentUser.doctorId || currentUser.DoctorID;
    } else if (currentUser.UserID) {
      const doctorResponse = await axios.get(`http://localhost:3000/api/doctors/user/${currentUser.UserID}`);
      doctorId = doctorResponse.data?.doctor?.DoctorID;
    }
    
    if (!doctorId) {
      doctorId = currentUser.UserID;
    }
    
    let url = `http://localhost:3000/api/doctors/${doctorId}/appointments`;
    
    if (date) {
      url += `?date=${date}`;
      console.log(`📅 Tarih filtresi: ${date}`);
    }
    
    console.log(`📞 API çağrısı: ${url}`);
    
    const response = await axios.get(url);
    
    console.log('✅ Doktor randevuları API yanıtı:', response.data);
    console.log(`📊 ${response.data.length} randevu bulundu`);
    
    // DOĞRU STATE'İ GÜNCELLEYİN
    setDoctorAppointments(response.data);
    
  } catch (err) {
    console.error('❌ Doktor randevuları yüklenemedi:', err);
    setErrorDoctorAppointments(err.response?.data?.message || 'Randevular yüklenemedi');
  } finally {
    setLoadingDoctorAppointments(false); // ✅ YÜKLEMEYİ BİTİR
  }
};
    // Sekreter için günlük randevuları çeken fonksiyon
    const fetchDailyAppointments = (date) => {
        setLoadingDaily(true);
        setErrorDaily('');
        axios.get(`${API_URL}/appointments?date=${date}`)
            .then(res => { 
                setDailyAppointments(res.data);
            })
            .catch(err => { 
                console.error('Günlük randevu hatası:', err); 
                setErrorDaily('Randevular getirilemedi.'); 
            })
            .finally(() => setLoadingDaily(false));
    };
    // YENİ: Laborant testlerini getir - BUNU BURAYA EKLE
    const fetchLabTests = () => {
    if (!currentUser || currentUser.RoleID !== 5) return;
    
    setLoadingLabTests(true);
    setErrorLabTests('');
    
    axios.get(`${API_URL}/lab/tests?technicianId=${currentUser.UserID}`)
        .then(res => {
            console.log("Laborant testleri:", res.data);
            setLabTests(res.data);
        })
        .catch(err => {
            console.error('Laborant test hatası:', err);
            setErrorLabTests('Testler getirilemedi.');
        })
        .finally(() => setLoadingLabTests(false));
};

// YENİ: Otomatik sonuç üret - BUNU DA BURAYA EKLE
    const handleGenerateResult = (testId) => {
    if (!window.confirm('Bu test için otomatik sonuç üretmek istiyor musunuz?')) {
        return;
    }
    
    axios.post(`${API_URL}/lab/tests/${testId}/generate-result`, {
        technicianId: currentUser.UserID
    })
    .then(res => {
        alert(res.data.message);
        fetchLabTests();
    })
    .catch(err => {
        console.error('Sonuç üretme hatası:', err);
        alert('Sonuç üretilemedi: ' + (err.response?.data?.message || 'Sunucu hatası'));
    });
};

// YENİ: Test detay modalını aç
    const handleOpenTestDetail = (test) => {
    setSelectedTest(test);
    setIsLabTestModalOpen(true);
};

// YENİ: Modal'ı kapat
    const handleCloseTestDetail = () => {
    setIsLabTestModalOpen(false);
    setSelectedTest(null);
};

        // Veri Çekme Efekti (Tüm Roller)
    useEffect(() => {
        if (currentUser) {
            if (currentUser.RoleID === 3) { // RoleID 3: Hasta
                setAppointments([]); 
                setPrescriptions([]); 
                setLabResults([]);
                setErrorAppointments(''); 
                setErrorPrescriptions(''); 
                setErrorLabResults('');
                
                fetchPatientAppointments();
                
                setLoadingPrescriptions(true);
                axios.get(`${API_URL}/patients/${currentUser.UserID}/prescriptions`)
                    .then(res => { setPrescriptions(res.data); })
                    .catch(err => { 
                        console.error('Reçete hatası:', err); 
                        setErrorPrescriptions('Reçeteler getirilemedi.'); 
                    })
                    .finally(() => setLoadingPrescriptions(false));
                
                setLoadingLabResults(true);
                axios.get(`${API_URL}/patients/${currentUser.UserID}/lab-results`)
                    .then(res => { setLabResults(res.data); })
                    .catch(err => { 
                        console.error('Lab sonucu hatası:', err); 
                        setErrorLabResults('Laboratuvar sonuçları getirilemedi.'); 
                    })
                    .finally(() => setLoadingLabResults(false));

            } else if (currentUser.RoleID === 2) { // RoleID 2: Doktor
                console.log('🎯 Doktor giriş yaptı, tüm randevular yükleniyor...');
                
                // Doktor giriş yaptığında TÜM randevuları yükle
                setDoctorAppointments([]);
                setErrorDoctorAppointments('');
                setLoadingDoctorAppointments(true);
                fetchDoctorAppointments(); // Tarih parametresi OLMADAN çağır
                
            } else if (currentUser.RoleID === 4) { // RoleID 4: Sekreter
                setDailyAppointments([]);
                setErrorDaily('');
                fetchDailyAppointments(selectedDate);
            } else if (currentUser.RoleID === 5) { // RoleID 5: Laborant
                setLabTests([]);
                setErrorLabTests('');
                fetchLabTests();
            }
        }
    }, [currentUser, selectedDate, refreshAppointments]);
     // === İSTATİSTİKLERİ HESAPLA (HASTA PANELİ İÇİN) ===
    useEffect(() => {
      if (currentUser && currentUser.RoleID === 3) {
        // Randevu istatistikleri
        const today = new Date();
        const upcomingAppointments = appointments.filter(app => {
          const appDate = new Date(app.AppointmentDate);
          return appDate >= today && app.Status !== 'İptal Edildi';
        });
        
        // Reçete istatistikleri
        const activePrescriptions = prescriptions.filter(pres => {
          const presDate = new Date(pres.PrescriptionDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return presDate >= thirtyDaysAgo;
        });
        
        // Lab sonuçları istatistikleri
        const recentLabResults = labResults.filter(lab => {
          const resultDate = new Date(lab.ResultDate || lab.RequestDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return resultDate >= thirtyDaysAgo;
        });
        
        setStats({
          totalAppointments: appointments.length,
          upcomingAppointments: upcomingAppointments.length,
          pendingPrescriptions: activePrescriptions.length,
          recentLabResults: recentLabResults.length
        });
      }
    }, [appointments, prescriptions, labResults, currentUser]);

    // --- HASTA RANDEVU İPTALİ ---
    const handleCancelAppointment = async (appointmentId) => {
        if (!window.confirm('Bu randevuyu iptal etmek istediğinize emin misiniz?')) {
            return;
        }
        const patientId = currentUser.UserID;
        try {
            await axios.put(`${API_URL}/patients/${patientId}/appointments/${appointmentId}`, {
                NewStatus: 'İptal Edildi'
            });
            alert('Randevu başarıyla iptal edildi!');
            setRefreshAppointments(prev => prev + 1);
        } catch (error) {
            console.error('İptal hatası:', error);
            alert(`İptal başarısız oldu: ${error.response?.data?.message || 'Sunucu Hatası'}`);
        }
    };

    // --- DOKTOR MODAL FONKSİYONLARI ---
    const handleSearch = async (e) => {
        if (e) e.preventDefault(); 
        
        if (searchTerm.trim().length < 2) { 
            setSearchError('Arama yapmak için en az 2 karakter giriniz.'); 
            setSearchResults([]); 
            return; 
        }
        
        setSearching(true); 
        setSearchError(''); 
        setSearchResults([]);
        
        try {
            const response = await axios.get(`${API_URL}/patients/search?term=${searchTerm.trim()}`);
            console.log("Hasta arama sonuçları:", response.data);
            setSearchResults(response.data);
            
            if (response.data.length === 0) {
                setSearchError('Arama kriterlerine uygun hasta bulunamadı.');
            }
        } catch (error) { 
            console.error('Hasta arama hatası:', error); 
            setSearchError(error.response?.data?.message || 'Arama sırasında bir hata oluştu.');
        } finally { 
            setSearching(false); 
        }
    };

    // Doktor için hasta seçme fonksiyonu
    const handleDoctorPatientSelect = (patient) => {
        setSelectedPatient(patient); 
        setIsPatientModalOpen(true);      
    };

    // Laboratuvar istemi modalını aç
const handleOpenLabRequestModal = (patient) => {
    setSelectedPatientForLab(patient);
    setLabRequestData({
        testName: '',
        testType: '',
        additionalNotes: ''
    });
    setIsLabRequestModalOpen(true);
};

// Laboratuvar istemi modalını kapat
const handleCloseLabRequestModal = () => {
    setIsLabRequestModalOpen(false);
    setSelectedPatientForLab(null);
    setLabRequestData({
        testName: '',
        testType: '',
        additionalNotes: ''
    });
};

const handleSubmitLabRequest = async () => {
    if (!selectedPatientForLab || !labRequestData.testName) {
        showSnackbar('Lütfen hasta ve test adını seçiniz', 'warning');
        return;
    }

    try {
        let appointmentId = null;

        // Hastanın son randevusunu al
        console.log('⚠️ Hastanın son randevusu aranıyor...');
        const patientId = selectedPatientForLab.PatientID || selectedPatientForLab.UserID;
        const appointmentsResponse = await axios.get(
            `${API_URL}/patients/${patientId}/appointments`
        );
        
        // ⭐ 'Onaylandı' VEYA 'Tamamlandı' statüsünde olanları al
        const validAppointments = appointmentsResponse.data.filter(
            apt => apt.Status === 'Onaylandı' || apt.Status === 'Tamamlandı'
        );
        
        if (validAppointments.length === 0) {
            showSnackbar('Hastanın geçerli randevusu bulunamadı', 'error');
            return;
        }
        
        // En son randevuyu al
        appointmentId = validAppointments[0].AppointmentID;
        console.log('✅ Bulunan randevu ID:', appointmentId);

        const labRequest = {
            appointmentId: appointmentId,
            testName: labRequestData.testName,
            testType: labRequestData.testType || 'Genel',
            additionalNotes: labRequestData.additionalNotes
        };

        console.log('📤 Gönderilen lab isteği:', labRequest);

        const response = await axios.post(`${API_URL}/lab/requests`, labRequest);
        
        console.log('✅ Backend yanıtı:', response.data);
        
        showSnackbar('Laboratuvar isteği başarıyla oluşturuldu!', 'success');
        handleCloseLabRequestModal();

    } catch (error) {
        console.error('❌ Laboratuvar isteği hatası:', error);
        console.error('Hata detayı:', error.response?.data);
        
        const errorMessage = error.response?.data?.message || 'Sunucu hatası';
        showSnackbar(`İstek oluşturulamadı: ${errorMessage}`, 'error');
    }
};
const handleOpenPrescriptionModal = (patient) => {
    setSelectedPatientForPrescription(patient);
    setPrescriptionData({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        notes: ''
    });
    setIsPrescriptionModalOpen(true);
};

// Reçete Modal'ını kapat
const handleClosePrescriptionModal = () => {
    setIsPrescriptionModalOpen(false);
    setSelectedPatientForPrescription(null);
};

const handleCreatePrescription = async () => {
    if (!prescriptionData.medication || !prescriptionData.dosage) {
        showSnackbar('İlaç adı ve doz zorunludur', 'warning');
        return;
    }

    try {
        // ⭐ DoctorID'yi doğru şekilde al
        let doctorId = currentUser.DoctorID;
        
        // Eğer DoctorID yoksa UserID'den çek
        if (!doctorId) {
            try {
                const doctorResponse = await axios.get(`${API_URL}/doctors/user/${currentUser.UserID}`);
                doctorId = doctorResponse.data?.doctor?.DoctorID;
            } catch (err) {
                console.error('DoctorID çekilemedi');
                showSnackbar('Doktor ID bulunamadı!', 'error');
                return;
            }
        }
        
        const patientTC = selectedPatientForPrescription?.HastaTC;
        
        console.log('🔍 Debug:', {
            doctorId,
            DoctorID: currentUser.DoctorID,
            UserID: currentUser.UserID,
            patientTC,
            medication: prescriptionData.medication
        });

        if (!patientTC) {
            showSnackbar('Hasta TC bulunamadı!', 'error');
            return;
        }
        
        await axios.post(`${API_URL}/doctors/${doctorId}/prescriptions`, {
            patientTC: patientTC,
            medication: prescriptionData.medication,
            dosage: prescriptionData.dosage,
            frequency: prescriptionData.frequency,
            duration: prescriptionData.duration,
            notes: prescriptionData.notes
        });
        
        showSnackbar('Reçete başarıyla oluşturuldu!', 'success');
        handleClosePrescriptionModal();
    } catch (error) {
        console.error('Reçete oluşturma hatası:', error);
        showSnackbar(`Reçete oluşturulamadı: ${error.response?.data?.message || 'Sunucu hatası'}`, 'error');
    }
};
// === RANDEVULARI FİLTRELE ===
const filterAppointments = () => {
    console.log("🔍 FİLTRELEME ÇAĞRILDI");
  console.log("📊 appointments:", appointments);
  console.log("⚙️ appointmentFilters:", appointmentFilters);
  let filtered = [...appointments];
  
  // Tarih filtresi
  if (appointmentFilters.dateRange !== 'all') {
    const today = new Date();
    
    switch (appointmentFilters.dateRange) {
      case 'today':
        filtered = filtered.filter(app => 
          new Date(app.AppointmentDate).toDateString() === today.toDateString()
        );
        break;
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        filtered = filtered.filter(app => {
          const appDate = new Date(app.AppointmentDate);
          return appDate >= weekStart && appDate <= weekEnd;
        });
        break;
      case 'thisMonth':
        filtered = filtered.filter(app => 
          new Date(app.AppointmentDate).getMonth() === today.getMonth() &&
          new Date(app.AppointmentDate).getFullYear() === today.getFullYear()
        );
        break;
      case 'past':
        filtered = filtered.filter(app => new Date(app.AppointmentDate) < today);
        break;
      case 'future':
        filtered = filtered.filter(app => new Date(app.AppointmentDate) >= today);
        break;
    }
  }
  
  // Durum filtresi
  if (appointmentFilters.status !== 'all') {
    filtered = filtered.filter(app => app.Status === appointmentFilters.status);
  }
  
  // Arama filtresi
  if (appointmentFilters.search) {
    const searchLower = appointmentFilters.search.toLowerCase();
    filtered = filtered.filter(app => 
      (app.DoktorAdi || app.DoctorName || '').toLowerCase().includes(searchLower) ||
      (app.DepartmanAdi || app.DepartmentName || '').toLowerCase().includes(searchLower) ||
      (app.AppointmentTime || '').toLowerCase().includes(searchLower)
    );
  }
  
  // Sıralama
  filtered.sort((a, b) => {
    const dateA = new Date(a.AppointmentDate);
    const dateB = new Date(b.AppointmentDate);
    
    switch (appointmentFilters.sortBy) {
      case 'date_asc':
        return dateA - dateB;
      case 'date_desc':
        return dateB - dateA;
      case 'doctor_asc':
        return (a.DoktorAdi || a.DoctorName || '').localeCompare(b.DoktorAdi || b.DoctorName || '');
      case 'doctor_desc':
        return (b.DoktorAdi || b.DoctorName || '').localeCompare(a.DoktorAdi || a.DoctorName || '');
      default:
        return dateB - dateA;
    }
  });
  
  return filtered;
};

// Laboratuvar istemi için form değişikliği
const handleLabRequestChange = (e) => {
    const { name, value } = e.target;
    setLabRequestData(prev => ({
        ...prev,
        [name]: value
    }));
}; 

    const handlePatientModalClose = () => {
        setIsPatientModalOpen(false);
        setSelectedPatient(null);
    };

    // --- SEKRETER MODAL FONKSİYONLARI ---
    const handleOpenEditModal = (appointment) => {
        setSelectedAppointment(appointment);
        setIsEditModalOpen(true);
    };
    
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedAppointment(null);
    };

    const handleUpdateSuccess = () => {
        handleCloseEditModal();
        fetchDailyAppointments(selectedDate);
    };

    // --- YENİ RANDEVU FORM FONKSİYONLARI ---

    // Departmanları getir
    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${API_URL}/departments`);
            setDepartments(response.data);
        } catch (error) {
            console.error('Departmanlar getirilemedi:', error);
            showSnackbar('Departmanlar getirilemedi', 'error');
        }
    };

    // Departman seçildiğinde doktorları getir
const fetchDoctorsByDepartment = async (departmentId) => {
    if (!departmentId) return;
    try {
        const response = await axios.get(`${API_URL}/departments/${departmentId}/doctors`);
        console.log('📥 API Doktor Yanıtı:', response.data);
        
        // ⭐ API'den gelen veriyi olduğu gibi kullan
        setDoctors(response.data);
        
        console.log('✅ Doktorlar yüklendi:', response.data);
    } catch (error) {
        console.error('Doktorlar getirilemedi:', error);
        showSnackbar('Doktorlar getirilemedi', 'error');
        setDoctors([]);
    }
};
    // Hasta arama (yeni randevu formu için)
    const searchPatientsForNewAppointment = async (term) => {
        if (term.length < 2) {
            setPatients([]);
            return;
        }
        try {
            const response = await axios.get(`${API_URL}/patients/search?term=${term}`);
            setPatients(response.data);
        } catch (error) {
            console.error('Hastalar aranamadı:', error);
            setPatients([]);
        }
    };

    
   
   // Dashboard.js'teki fetchAvailableSlots fonksiyonu
// Dashboard.js'de YENİ fetchAvailableSlots fonksiyonu:
const fetchAvailableSlots = async (doctorId, date) => {
    if (!doctorId || !date) {
        setAvailableSlots([]);
        return;
    }
    
    try {
        console.log(`📞 SEKRETER FORM - availability endpoint:`, 
                   `${API_URL}/doctors/${doctorId}/availability?date=${date}`);
        
        const response = await axios.get(`${API_URL}/doctors/${doctorId}/availability?date=${date}`);
        
        console.log("🎯 SEKRETER FORM - Dolu saatler:", response.data);
        
        // Bu saatler ZATEN dolu (Onaylandı/Beklemede randevular)
        // Sekreter de bunları DOLU görmeli!
        setAvailableSlots(response.data || []);
        
    } catch (error) {
        console.error('❌ Sekreter form saat hatası:', error);
        setAvailableSlots([]);
        showSnackbar('Müsait saatler getirilemedi', 'error');
    }
};
    // Yeni randevu oluştur
    const handleCreateAppointment = async () => {
        try {
            const appointmentToSend = {
                PatientID: newAppointmentData.PatientID,
                DoctorID: newAppointmentData.DoctorID,
                AppointmentDate: newAppointmentData.AppointmentDate,
                AppointmentTime: newAppointmentData.AppointmentTime,
                Complaint: newAppointmentData.Complaint
            };
            
            await axios.post(`${API_URL}/secretary/appointments`, appointmentToSend);
            showSnackbar('Randevu başarıyla oluşturuldu!', 'success');
            handleCloseNewAppointmentModal();
            fetchDailyAppointments(selectedDate);
        } catch (error) {
            console.error('Randevu oluşturulamadı:', error);
            showSnackbar(`Randevu oluşturulamadı: ${error.response?.data?.message || 'Sunucu hatası'}`, 'error');
        }
    };

    // Modal'ı aç
    const handleOpenNewAppointmentModal = () => {
        setIsNewAppointmentModalOpen(true);
        fetchDepartments();
        setActiveStep(0);
    };

    // Modal'ı kapat
    const handleCloseNewAppointmentModal = () => {
        setIsNewAppointmentModalOpen(false);
        setNewAppointmentData({
            PatientID: '',
            DepartmentID: '',
            DoctorID: '',
            AppointmentDate: new Date().toISOString().split('T')[0],
            AppointmentTime: '',
            Complaint: ''
        });
        setDoctors([]);
        setPatients([]);
        setAvailableSlots([]);
        setActiveStep(0);
    };

    // Snackbar göster
    const showSnackbar = (message, severity = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // Form adımları
    const steps = ['Hasta Seçimi', 'Doktor ve Tarih', 'Saat ve Şikayet'];

    // Adım ilerle
    const handleNext = () => {
        if (activeStep === 0 && !newAppointmentData.PatientID) {
            showSnackbar('Lütfen bir hasta seçin', 'warning');
            return;
        }
        if (activeStep === 1 && !newAppointmentData.DoctorID) {
            showSnackbar('Lütfen bir doktor seçin', 'warning');
            return;
        }
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    // Form değişiklikleri
    const handleNewAppointmentChange = (e) => {
        const { name, value } = e.target;
        setNewAppointmentData(prev => ({
            ...prev,
            [name]: value
        }));

        // Departman seçildiğinde doktorları getir
        if (name === 'DepartmentID') {
            fetchDoctorsByDepartment(value);
            setNewAppointmentData(prev => ({ ...prev, DoctorID: '' }));
        }

        // Doktor seçildiğinde müsait saatleri getir
        if (name === 'DoctorID') {
            fetchAvailableSlots(value, newAppointmentData.AppointmentDate);
        }

        // Tarih değiştiğinde müsait saatleri güncelle
        if (name === 'AppointmentDate' && newAppointmentData.DoctorID) {
            fetchAvailableSlots(newAppointmentData.DoctorID, value);
        }
    };

    // Yeni randevu formu için hasta seç
    const handleNewAppointmentPatientSelect = (patient) => {
        setNewAppointmentData(prev => ({
            ...prev,
            PatientID: patient.PatientID || patient.UserID
        }));
        setActiveStep(1);
    };

    // Adım içeriği
    const getStepContent = (step) => {
        switch (step) {
            case 0: // Hasta Seçimi
                return (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" gutterBottom>Hasta Seçimi</Typography>
                        <TextField
                            fullWidth
                            label="Hasta Ara (Ad, Soyad veya TC)"
                            variant="outlined"
                            size="small"
                            onChange={(e) => searchPatientsForNewAppointment(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        {patients.length > 0 ? (
    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
        {patients.map(patient => (
            <ListItem
                key={patient.PatientID || patient.UserID}
                component="li"
                onClick={() => handleNewAppointmentPatientSelect(patient)}
                sx={{ 
                    cursor: 'pointer', 
                    bgcolor: newAppointmentData.PatientID === (patient.PatientID || patient.UserID) ? '#e3f2fd' : 'transparent',
                    '&:hover': { bgcolor: '#f5f5f5' }
                }}
            >
                                        <ListItemText
                                            primary={`${patient.HastaAdi || patient.FirstName} ${patient.HastaSoyadi || patient.LastName}`}
                                            secondary={`TC: ${patient.HastaTC || patient.TCNo} - Tel: ${patient.PhoneNumber || patient.HastaTelefon || '-'}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Hasta aramak için en az 2 karakter girin
                            </Typography>
                        )}
                        {newAppointmentData.PatientID && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                Hasta seçildi - Bir sonraki adıma geçebilirsiniz
                            </Alert>
                        )}
                    </Box>
                );

           case 1: // Doktor ve Tarih
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Doktor ve Tarih Seçimi</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ fontSize: '1.1rem' }}>Departman</InputLabel>
                        <Select
                            name="DepartmentID"
                            value={newAppointmentData.DepartmentID || ''}
                            onChange={handleNewAppointmentChange}
                            label="Departman"
                            sx={{ 
                                fontSize: '1.1rem',
                                height: '56px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderWidth: '2px'
                                }
                            }}
                        >
                            <MenuItem value="">-- Departman Seçin --</MenuItem>
                            {departments.map(dept => (
                                <MenuItem key={dept.DepartmentID} value={dept.DepartmentID} sx={{ fontSize: '1rem' }}>
                                    {dept.DepartmentName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <InputLabel sx={{ fontSize: '1.1rem' }}>Doktor</InputLabel>
                        <Select
                            name="DoctorID"
                            value={newAppointmentData.DoctorID || ''}
                            onChange={handleNewAppointmentChange}
                            label="Doktor"
                            disabled={!newAppointmentData.DepartmentID}
                            sx={{ 
                                fontSize: '1.1rem',
                                height: '56px',
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderWidth: '2px'
                                }
                            }}
                        >
                            <MenuItem value="">-- Doktor Seçin --</MenuItem>
                            {doctors.length > 0 ? (
    doctors.map(doctor => (
        <MenuItem key={doctor.DoctorID} value={doctor.DoctorID} sx={{ fontSize: '1rem' }}>
            {/* CRITICAL FIX: Önce DoctorName, sonra Title kontrol et */}
            {doctor.DoctorName || doctor.Title || `Doktor ${doctor.DoctorID}`}
        </MenuItem>
    ))
) : (
    <MenuItem disabled>Doktor bulunamadı</MenuItem>
)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        label="Randevu Tarihi"
                        type="date"
                        name="AppointmentDate"
                        value={newAppointmentData.AppointmentDate}
                        onChange={handleNewAppointmentChange}
                        InputLabelProps={{ shrink: true }}
                        sx={{ 
                            '& input': { fontSize: '1.1rem', height: '40px' },
                            '& label': { fontSize: '1.1rem' }
                        }}
                    />
                </Grid>
            </Grid>
            {newAppointmentData.DoctorID && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    Doktor seçildi. Bir sonraki adımda müsait saatleri görebilirsiniz.
                </Alert>
            )}
        </Box>
    );
         case 2: // Saat ve Şikayet
    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>Saat ve Şikayet</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Randevu Saati</InputLabel>
                        <Select
                            name="AppointmentTime"
                            value={newAppointmentData.AppointmentTime || ''}
                            onChange={handleNewAppointmentChange}
                            label="Randevu Saati"
                            disabled={!newAppointmentData.DoctorID || !newAppointmentData.AppointmentDate}
                        >
                            <MenuItem value="">Saat Seçin</MenuItem>
                            
                            {/* TÜM SAATLERİ OLUŞTURALIM (09:00 - 17:00) */}
                            {(() => {
                                // 1. TÜM SAATLERİ OLUŞTUR
                                const allTimes = [];
                                for (let hour = 9; hour <= 17; hour++) {
                                    allTimes.push(
                                        `${hour.toString().padStart(2, '0')}:00`,
                                        `${hour.toString().padStart(2, '0')}:30`
                                    );
                                }
                                
                                console.log("🔍 Backend'den gelen DOLU saatler:", availableSlots);
                                console.log("📋 Kontrol edilecek saatler:", allTimes);
                                
                                // 3. HER SAAT İÇİN KONTROL ET
                                return allTimes.map(time => {
                                    // Backend'den gelen saat formatını kontrol et
                                    // Backend ["17:00","17:30","16:30"] formatında döndürüyor
                                                                   // YENİ: Saat farkını düzelt (UTC+3)
const isBooked = availableSlots.some(slot => {
    if (!slot) return false;
    
    const slotStr = String(slot).trim();
    console.log(`🔍 Karşılaştırma: Frontend ${time} vs Backend ${slotStr}`);
    
    // Backend'den gelen saati Türkiye saatine çevir (+3 saat)
    const convertToTurkishTime = (backendTime) => {
        if (!backendTime || typeof backendTime !== 'string') return '';
        
        // "16:30:00" formatını al
        const match = backendTime.match(/(\d{1,2}):(\d{2})/);
        if (!match) return backendTime;
        
        let hour = parseInt(match[1], 10);
        const minute = match[2];
        
        // CRITICAL FIX: Backend UTC saatini gönderiyor, biz +3 ekleyeceğiz
        // Ama önce test edelim: Eğer backend 16:30 gönderiyorsa
        // ve aslında 14:30 doluysa, o zaman 2 saat çıkaracağız
        let turkishHour = hour - 2; // 16:30 → 14:30
        
        // Saati normalize et
        if (turkishHour < 0) turkishHour += 24;
        if (turkishHour >= 24) turkishHour -= 24;
        
        return `${String(turkishHour).padStart(2, '0')}:${minute}`;
    };
    
    const turkishBackendTime = convertToTurkishTime(slotStr);
    console.log(`🔄 Backend ${slotStr} → Turkish ${turkishBackendTime}`);
    console.log(`✅ Karşılaştırma: ${time} vs ${turkishBackendTime}`);
    
    return time === turkishBackendTime;
});    
        
                                    console.log(`⏰ ${time} - Dolu mu? ${isBooked} (Backend: ${availableSlots})`);
                                    
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
                                                <span>{time}</span>
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
                                });
                            })()}
                        </Select>
                    </FormControl>
                    
                    {/* BİLGİLENDİRME MESAJI - SADECE "NOT:" MESAJI KALACAK */}
                    <Box sx={{ mt: 1 }}>
                        {availableSlots.length > 0 ? (
                            // "Dolu saatler" mesajını kaldırdık, sadece "Not:" mesajı kaldı
                            <Alert severity="info" sx={{ fontSize: '0.85rem', py: 0.5 }}>
                                <strong>Not:</strong> Kırmızı renkli ve "DOLU" yazan saatler seçilemez.
                            </Alert>
                        ) : (
                            <Alert severity="success" sx={{ fontSize: '0.85rem', py: 0.5 }}>
                                ✅ Tüm saatler müsait
                            </Alert>
                        )}
                    </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Şikayet (Opsiyonel)"
                        name="Complaint"
                        value={newAppointmentData.Complaint || ''}
                        onChange={handleNewAppointmentChange}
                        size="small"
                        multiline
                        rows={3}
                        placeholder="Hastanın şikayetini giriniz..."
                    />
                </Grid>
            </Grid>
            
            
        </Box>
    );
default:
    return 'Bilinmeyen adım';
}
    };

    if (!currentUser) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    // --- YARDIMCI RENDER FONKSİYONU ---
    const renderLoadingError = (loading, error, data, emptyMessage) => {
        if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress size={24} /></Box>;
        if (error) return <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>;
        if (!loading && data.length === 0) return <Typography variant="body2" sx={{ my: 1 }}>{emptyMessage}</Typography>;
        return null;
    };
    // --- LABORANT PANELİ RENDER FONKSİYONU ---
const renderLaborantPanel = () => {
    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>
                Laboratuvar Paneli
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                Hoş geldiniz, <strong>{currentUser.FirstName} {currentUser.LastName}</strong>.<br />
                Size atanan testleri buradan yönetebilirsiniz.
            </Alert>
            
            <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                Laboratuvar Testleri
            </Typography>
            
            {renderLoadingError(loadingLabTests, errorLabTests, labTests, "Henüz atanmış laboratuvar testiniz bulunmamaktadır.")}
            
            {!loadingLabTests && !errorLabTests && labTests.length > 0 && (
                <List dense>
                    {labTests.map(test => (
                        <ListItem key={test.TestID} divider sx={{ py: 2 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                <Box flex={1}>
                                    <Typography variant="body1" fontWeight="medium">
                                        {test.TestName || test.TestAdi}
                                    </Typography>
                                    <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                                        <Typography variant="body2" color="text.secondary">
                                            Hasta: {test.HastaAdi || test.PatientName} {test.HastaSoyadi || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Doktor: Dr. {test.DoktorAdi || test.DoctorName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Departman: {test.DepartmanAdi || test.DepartmentName}
                                        </Typography>
                                        {test.OrderDate && (
                                            <Typography variant="body2" color="text.secondary">
                                                İstek Tarihi: {new Date(test.OrderDate).toLocaleDateString('tr-TR')}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1} ml={2}>
                                    <Box display="flex" gap={1}>
                                        {test.Status === 'Bekliyor' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                onClick={() => handleGenerateResult(test.TestID)}
                                            >
                                                Sonuç Üret
                                            </Button>
                                        )}
                                        {test.Status === 'Tamamlandı' && (
                                            <Button
                                                variant="outlined"
                                                color="success"
                                                size="small"
                                                onClick={() => handleOpenTestDetail(test)}
                                            >
                                                Sonucu Gör
                                            </Button>
                                        )}
                                        {test.Status === 'İptal Edildi' && (
                                            <Typography variant="body2" color="error">
                                                İptal Edildi
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: 'bold',
                                            color: test.Status === 'Tamamlandı' ? 'success.main' : 
                                                   test.Status === 'Bekliyor' ? 'warning.main' : 
                                                   'error.main'
                                        }}
                                    >
                                        Durum: {test.Status}
                                    </Typography>
                                </Box>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
};

    // --- ROL BAZLI PANEL İÇERİĞİ ---
    const renderDashboardContent = () => {
        switch (currentUser.RoleID) {
            case 1: // RoleID 1: Admin Paneli
return (
    <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '60vh',
        textAlign: 'center' 
    }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
            Admin paneline yönlendiriliyorsunuz...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Eğer yönlendirilmezseniz, <Link component={RouterLink} to="/admin-dashboard">buraya tıklayın</Link>
        </Typography>
    </Box>
);
            
           case 3: // RoleID 3: Hasta Paneli
  const filteredAppointments = filterAppointments();
   const startIndex = appointmentFilters.page * appointmentFilters.rowsPerPage;
  const endIndex = startIndex + appointmentFilters.rowsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);
  
  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        Hasta Paneli
      </Typography>
      
      
      {/* Ana Aksiyon Butonları */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Button 
          component={RouterLink} 
          to="/randevu-al"
          variant="contained" 
          color="primary"
          startIcon={<CalendarToday />}
        >
          Yeni Randevu Al
        </Button>
        
        <Button 
          variant="outlined"
          onClick={() => window.print()}
          startIcon={<Download />}
        >
          Özet Rapor Al
        </Button>
      </Box>
      
      {/* Sekmeler */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activePatientSection} 
          onChange={(e, newValue) => setActivePatientSection(newValue)}
        >
          <Tab 
            label={
              <Badge badgeContent={appointments.length} color="primary" sx={{ mr: 1 }}>
                Randevular
              </Badge>
            } 
            value="appointments" 
          />
          <Tab 
            label={
              <Badge badgeContent={prescriptions.length} color="secondary" sx={{ mr: 1 }}>
                Reçeteler
              </Badge>
            } 
            value="prescriptions" 
          />
          <Tab 
            label={
              <Badge badgeContent={labResults.length} color="success" sx={{ mr: 1 }}>
                Lab Sonuçları
              </Badge>
            } 
            value="labResults" 
          />
        </Tabs>
      </Box>
      
      {/* RANDEVULAR SEKME İÇERİĞİ */}
      {activePatientSection === 'appointments' && (
        <Box>
          {/* Filtreleme Bölümü */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#fafafa' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tarih Aralığı</InputLabel>
                  <Select
                    value={appointmentFilters.dateRange}
                    onChange={(e) => setAppointmentFilters({...appointmentFilters, dateRange: e.target.value})}
                    label="Tarih Aralığı"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="today">Bugün</MenuItem>
                    <MenuItem value="thisWeek">Bu Hafta</MenuItem>
                    <MenuItem value="thisMonth">Bu Ay</MenuItem>
                    <MenuItem value="past">Geçmiş</MenuItem>
                    <MenuItem value="future">Gelecek</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={appointmentFilters.status}
                    onChange={(e) => setAppointmentFilters({...appointmentFilters, status: e.target.value})}
                    label="Durum"
                  >
                    <MenuItem value="all">Tüm Durumlar</MenuItem>
                    <MenuItem value="Beklemede">Beklemede</MenuItem>
                    <MenuItem value="Onaylandı">Onaylandı</MenuItem>
                    <MenuItem value="Tamamlandı">Tamamlandı</MenuItem>
                    <MenuItem value="İptal Edildi">İptal Edildi</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sırala</InputLabel>
                  <Select
                    value={appointmentFilters.sortBy}
                    onChange={(e) => setAppointmentFilters({...appointmentFilters, sortBy: e.target.value})}
                    label="Sırala"
                  >
                    <MenuItem value="date_desc">Tarihe Göre (Yeniden Eskiye)</MenuItem>
                    <MenuItem value="date_asc">Tarihe Göre (Eskiden Yeniye)</MenuItem>
                    <MenuItem value="doctor_asc">Doktora Göre (A-Z)</MenuItem>
                    <MenuItem value="doctor_desc">Doktora Göre (Z-A)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Doktor, departman veya saat ara..."
                  value={appointmentFilters.search}
                  onChange={(e) => setAppointmentFilters({...appointmentFilters, search: e.target.value})}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            {/* Aktif Filtre Chips */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {appointmentFilters.dateRange !== 'all' && (
                <Chip 
                  label={`Tarih: ${appointmentFilters.dateRange === 'today' ? 'Bugün' : 
                    appointmentFilters.dateRange === 'thisWeek' ? 'Bu Hafta' :
                    appointmentFilters.dateRange === 'thisMonth' ? 'Bu Ay' :
                    appointmentFilters.dateRange === 'past' ? 'Geçmiş' : 'Gelecek'}`}
                  size="small"
                  onDelete={() => setAppointmentFilters({...appointmentFilters, dateRange: 'all'})}
                />
              )}
              
              {appointmentFilters.status !== 'all' && (
                <Chip 
                  label={`Durum: ${appointmentFilters.status}`}
                  size="small"
                  onDelete={() => setAppointmentFilters({...appointmentFilters, status: 'all'})}
                />
              )}
              
              {appointmentFilters.search && (
                <Chip 
                  label={`Arama: ${appointmentFilters.search}`}
                  size="small"
                  onDelete={() => setAppointmentFilters({...appointmentFilters, search: ''})}
                />
              )}
            </Box>
          </Paper>
          
          {/* Randevu Listesi */}
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Randevularınız ({filteredAppointments.length} kayıt)
          </Typography>
          
          {renderLoadingError(loadingAppointments, errorAppointments, appointments, "Henüz planlanmış bir randevunuz bulunmamaktadır.")}
          
          {!loadingAppointments && !errorAppointments && filteredAppointments.length > 0 && (
            <>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell><strong>Tarih</strong></TableCell>
                      <TableCell><strong>Saat</strong></TableCell>
                      <TableCell><strong>Doktor</strong></TableCell>
                      <TableCell><strong>Departman</strong></TableCell>
                      <TableCell><strong>Durum</strong></TableCell>
                      <TableCell><strong>İşlemler</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAppointments.map(app => (
                      <TableRow key={app.AppointmentID} hover>
                        <TableCell>
                          {new Date(app.AppointmentDate).toLocaleDateString('tr-TR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {app.AppointmentTime?.substring(11, 16) || app.AppointmentTime}
                        </TableCell>
                        <TableCell>
                          Dr. {app.DoktorAdi || app.DoctorName}
                        </TableCell>
                        <TableCell>
                          {app.DepartmanAdi || app.DepartmentName}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={app.Status}
                            size="small"
                            color={
                              app.Status === 'Tamamlandı' ? 'success' :
                              app.Status === 'Onaylandı' ? 'primary' :
                              app.Status === 'Beklemede' ? 'warning' : 'error'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => handleCancelAppointment(app.AppointmentID)}
                            disabled={app.Status === 'İptal Edildi' || app.Status === 'Tamamlandı'}
                            sx={{ mr: 1 }}
                          >
                            İptal
                          </Button>
                          <IconButton size="small">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Sayfalama */}
              <TablePagination
                component="div"
                count={filteredAppointments.length}
                page={appointmentFilters.page}
                onPageChange={(e, newPage) => setAppointmentFilters({...appointmentFilters, page: newPage})}
                rowsPerPage={appointmentFilters.rowsPerPage}
                onRowsPerPageChange={(e) => setAppointmentFilters({
                  ...appointmentFilters,
                  rowsPerPage: parseInt(e.target.value, 10),
                  page: 0
                })}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Sayfa başına:"
              />
            </>
          )}
        </Box>
      )}
      
      {/* REÇETELER SEKME İÇERİĞİ */}
      {activePatientSection === 'prescriptions' && (
    <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
            Reçeteleriniz ({prescriptions.length} kayıt)
        </Typography>
        
        {renderLoadingError(loadingPrescriptions, errorPrescriptions, prescriptions, "Henüz kayıtlı bir reçeteniz bulunmamaktadır.")}
        
        {!loadingPrescriptions && !errorPrescriptions && prescriptions.length > 0 && (
            <Grid container spacing={2}>
                {prescriptions.map(pres => (
                    <Grid item xs={12} md={6} key={pres.RecordID}>  {/* ← RecordID kullan */}
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="h6" component="div">
                                        {new Date(pres.PrescriptionDate).toLocaleDateString('tr-TR')}
                                    </Typography>
                                    <Chip 
                                        label={pres.DepartmentName}
                                        size="small"
                                        color="primary"
                                    />
                                </Box>
                                
                                <Typography color="text.secondary" gutterBottom>
                                    Dr. {pres.DoctorName}
                                </Typography>
                                
                                <Typography variant="body2" sx={{ 
                                    mt: 2,
                                    p: 1.5,
                                    bgcolor: '#f9f9f9',
                                    borderRadius: 1,
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem'
                                }}>
                                    {pres.Details}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<Download />}
                                        onClick={() => window.print()}
                                    >
                                        PDF İndir
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )}
    </Box>
)}
      
      {/* LAB SONUÇLARI SEKME İÇERİĞİ */}
      {activePatientSection === 'labResults' && (
        <Box>
          <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
            Laboratuvar Sonuçlarınız ({labResults.length} kayıt)
          </Typography>
          
          {renderLoadingError(loadingLabResults, errorLabResults, labResults, "Henüz laboratuvar sonucunuz bulunmamaktadır.")}
          
          {!loadingLabResults && !errorLabResults && labResults.length > 0 && (
            <List dense>
              {labResults.map(lab => (
                <ListItem 
                  key={lab.TestID} 
                  divider
                    >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1" component="span">
                          {lab.TestName}
                        </Typography>
                        <Chip 
                          label={lab.Status}
                          size="small"
                          color={lab.Status === 'Tamamlandı' ? 'success' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" display="block">
                          İstek: {new Date(lab.RequestDate).toLocaleDateString('tr-TR')} 
                          {lab.ResultDate && ` • Sonuç: ${new Date(lab.ResultDate).toLocaleDateString('tr-TR')}`}
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          İsteyen: Dr. {lab.RequestingDoctor}
                        </Typography>
                        {lab.Results && (
                          <Typography component="span" variant="body2" display="block" sx={{ 
                            mt: 1,
                            fontStyle: 'italic',
                            color: '#666'
                          }}>
                            {lab.Results.length > 100 ? `${lab.Results.substring(0, 100)}...` : lab.Results}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
            case 2: // RoleID 2: Doktor Paneli
    // Debug için state'leri kontrol et
    console.log("🔄 DOKTOR PANEL RENDER:");
    console.log("📅 Seçili tarih:", doctorSelectedDate);
    console.log("📋 Randevu sayısı:", doctorAppointments.length);
    console.log("📊 Randevular:", doctorAppointments);
    console.log("⏳ Yükleniyor mu?", loadingDoctorAppointments);
    console.log("❌ Hata var mı?", errorDoctorAppointments);

    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>Doktor Paneli</Typography>
            
            <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>Randevu Tarihini Seçiniz</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
                Hasta araması yapmadan önce lütfen bir tarih seçiniz.
            </Alert>
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <TextField
                    id="doctor-date"
                    label="Randevu Tarihi Seçiniz"
                    type="date"
                    size="small"
                    value={doctorSelectedDate}
                    onChange={(e) => {
                        const selectedDate = e.target.value;
                        console.log('📅 Tarih değişti:', selectedDate);
                        setDoctorSelectedDate(selectedDate);
                        if (selectedDate) {
                            fetchDoctorAppointments(selectedDate);
                        } else {
                            fetchDoctorAppointments(); // Tüm randevular
                        }
                    }}
                    sx={{ minWidth: 240, mr: 2 }}
                    InputLabelProps={{ shrink: true }}
                />
                <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        console.log('🔄 Bugün butonu:', today);
                        setDoctorSelectedDate(today);
                        //fetchDoctorAppointments(today);
                    }}
                >
                    Bugün
                </Button>
                {doctorSelectedDate && (
                    <Button 
                        variant="outlined" 
                        size="small"
                        color="error"
                        onClick={() => {
                            console.log('🗑️ Tarih temizlendi');
                            setDoctorSelectedDate('');
                            fetchDoctorAppointments(); // Tüm randevular
                        }}
                        sx={{ ml: 1 }}
                    >
                        Temizle
                    </Button>
                )}
            </Box>
            
            <Typography variant="h6" component="h3" sx={{ mt: 3, mb: 1 }}>Hasta Arama</Typography>
            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <TextField 
                    label="Hasta Adı, Soyadı veya TC No" 
                    variant="outlined" 
                    size="small" 
                    fullWidth 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(e); }} 
                />
                <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={searching || searchTerm.trim().length < 2}
                > 
                    {searching ? <CircularProgress size={24} /> : 'Ara'} 
                </Button>
            </Box>
            {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
            {searching && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress size={24} /></Box>}
            {searchResults.length > 0 && (
                <List dense>
                    <Typography variant="subtitle2">Bulunan Hastalar ({searchResults.length} hasta):</Typography>
                    {searchResults.map((patient) => (
                        <ListItem key={patient.PatientID} divider sx={{ py: 1 }}>
                            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" fontWeight="medium">
                                        {patient.HastaAdi || patient.FirstName} {patient.HastaSoyadi || patient.LastName} 
                                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                            (TC: {patient.HastaTC || patient.TCNo})
                                        </Typography>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Doğum T: {new Date(patient.DateOfBirth || patient.HastaDogumTarihi).toLocaleDateString('tr-TR')} - Tel: {patient.PhoneNumber || patient.HastaTelefon || '-'}
                                    </Typography>
                                </Box>
                               <Box sx={{ display: 'flex', gap: 1 }}>
    <Button 
        variant="outlined" 
        size="small" 
        onClick={() => handleDoctorPatientSelect(patient)}
    >
        Hasta Detayı
    </Button>
    <Button 
        variant="contained" 
        size="small" 
        color="secondary"
        onClick={() => handleOpenLabRequestModal(patient)}
    >
        Lab İste
    </Button>
    <Button 
        variant="contained" 
        size="small" 
        color="success"
        onClick={() => handleOpenPrescriptionModal(patient)}
    >
        Reçete Yaz
    </Button>
</Box>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            )}
            
            {!searching && searchResults.length === 0 && searchTerm.trim().length >= 2 && !searchError && (
                <Typography variant="body2" sx={{ my: 1 }}>Arama kriterlerine uygun hasta bulunamadı.</Typography>
            )}
            <Divider sx={{ my: 3 }} /> 
            
            <Typography variant="h6" component="h3">Randevu Takviminiz</Typography>
            
            {/* TARİH SEÇİLDİYSE */}
            {doctorSelectedDate ? (
                <>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {new Date(doctorSelectedDate).toLocaleDateString('tr-TR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })} Günü Randevularınız
                    </Typography>
                    
                    {/* YÜKLEME DURUMU */}
                    {loadingDoctorAppointments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : errorDoctorAppointments ? (
                        <Alert severity="error" sx={{ my: 1 }}>{errorDoctorAppointments}</Alert>
                    ) : doctorAppointments.length === 0 ? (
                        <Alert severity="info" sx={{ my: 1 }}>
                            Seçilen tarih için planlanmış bir randevunuz bulunmamaktadır.
                        </Alert>
                    ) : (
                        <List dense sx={{ mt: 2 }}>
                            {doctorAppointments.map(app => {
                                // Console'a yazdır (debug için)
                                console.log("🎯 Randevu:", app);
                                
                                // API'den gelen verinin yapısını kontrol et
                                const appointmentDate = app.Date || app.AppointmentDate;
                                const appointmentTime = app.Time || app.AppointmentTime;
                                const patientName = app.Patient || app.HastaAdi;
                                const patientSurname = app.HastaSoyadi || '';
                                const tcNo = app.HastaTC || app.TCNo;
                                const status = app.Status;
                                
                                return (
                                    <ListItem key={app.AppointmentID || app.ID} divider sx={{ py: 1.5 }}>
                                        <ListItemText 
                                            primary={
                                                <Typography variant="body1" fontWeight="medium">
                                                    {appointmentTime 
                                                        ? `${appointmentTime.substring(11, 16)}`
                                                        : appointmentTime
                                                            ? `${appointmentTime.substring(11, 16)}`
                                                            : 'Saat belirtilmemiş'
                                                    } - {patientName} {patientSurname}
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>Tarih:</strong> {new Date(appointmentDate).toLocaleDateString('tr-TR')}
                                                    </Typography>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>TC:</strong> {tcNo || 'Belirtilmemiş'}
                                                    </Typography>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>Durum:</strong> 
                                                        <Chip 
                                                            label={status} 
                                                            size="small" 
                                                            color={
                                                                status === 'Onaylandı' ? 'success' :
                                                                status === 'Beklemede' ? 'warning' :
                                                                status === 'Tamamlandı' ? 'primary' :
                                                                status === 'İptal Edildi' ? 'error' : 'default'
                                                            }
                                                            sx={{ ml: 1, height: 20 }}
                                                        />
                                                    </Typography>
                                                    {app.Complaint && (
                                                        <Typography component="span" variant="body2" display="block" sx={{ mt: 0.5 }}>
                                                            <strong>Şikayet:</strong> {app.Complaint.substring(0, 100)}...
                                                        </Typography>
                                                    )}
                                                </>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </>
            ) : (
                /* TARİH SEÇİLMEDİYSE - TÜM RANDEVULAR */
                <>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Tüm Randevularınız
                    </Typography>
                    
                    {/* YÜKLEME DURUMU */}
                    {loadingDoctorAppointments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : errorDoctorAppointments ? (
                        <Alert severity="error" sx={{ my: 1 }}>{errorDoctorAppointments}</Alert>
                    ) : doctorAppointments.length === 0 ? (
                        <Alert severity="info" sx={{ my: 1 }}>
                            Henüz planlanmış bir randevunuz bulunmamaktadır.
                        </Alert>
                    ) : (
                        <List dense sx={{ mt: 2 }}>
                            {doctorAppointments.map(app => {
                                // API'den gelen verinin yapısını kontrol et
                                const appointmentDate = app.Date || app.AppointmentDate;
                                const appointmentTime = app.Time || app.AppointmentTime;
                                const patientName = app.Patient || app.HastaAdi;
                                const patientSurname = app.HastaSoyadi || '';
                                const tcNo = app.HastaTC || app.TCNo;
                                const status = app.Status;
                                
                                return (
                                    <ListItem key={app.AppointmentID || app.ID} divider sx={{ py: 1.5 }}>
                                        <ListItemText 
                                            primary={
                                                <Typography variant="body1" fontWeight="medium">
                                                    {new Date(appointmentDate).toLocaleDateString('tr-TR')} - 
                                                    {appointmentTime 
                                                        ? ` ${appointmentTime.substring(11, 16)}`
                                                        : appointmentTime
                                                            ? ` ${appointmentTime.substring(11, 16)}`
                                                            : ' Saat belirtilmemiş'
                                                    }
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>Hasta:</strong> {patientName} {patientSurname}
                                                    </Typography>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>TC:</strong> {tcNo || 'Belirtilmemiş'}
                                                    </Typography>
                                                    <Typography component="span" variant="body2" display="block">
                                                        <strong>Durum:</strong> 
                                                        <Chip 
                                                            label={status} 
                                                            size="small" 
                                                            color={
                                                                status === 'Onaylandı' ? 'success' :
                                                                status === 'Beklemede' ? 'warning' :
                                                                status === 'Tamamlandı' ? 'primary' :
                                                                status === 'İptal Edildi' ? 'error' : 'default'
                                                            }
                                                            sx={{ ml: 1, height: 20 }}
                                                        />
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </>
            )}
        </Box>
    );
            case 4: // RoleID 4: Sekreter Paneli
                return (
                    <Box>
                        <Typography variant="h5" component="h2" gutterBottom>Sekreter Paneli</Typography>
                        
                        <Box sx={{mb: 2}}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                onClick={handleOpenNewAppointmentModal}
                                sx={{mr: 1}}
                            >
                                Yeni Randevu Oluştur
                            </Button>
                        </Box>

                        <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                            Günlük Randevu Akışı
                        </Typography>
                        <TextField
                            id="date"
                            label="Randevu Tarihi Seçiniz"
                            type="date"
                            size="small"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            sx={{ mb: 2, minWidth: 240 }}
                            InputLabelProps={{ shrink: true }}
                        />
                        
                        <Typography variant="subtitle1">
                            {new Date(selectedDate).toLocaleDateString('tr-TR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })} Günü Randevuları
                        </Typography>
                        
                        {renderLoadingError(loadingDaily, errorDaily, dailyAppointments, "Seçilen tarih için randevu bulunmamaktadır.")}
                        {!loadingDaily && !errorDaily && dailyAppointments.length > 0 && (
                            <List dense>
                                {dailyAppointments.map(app => (
                                    <ListItem key={app.AppointmentID} divider>
                                        <ListItemText 
                                            primary={`${app.AppointmentTime?.substring(11, 16) || app.AppointmentTime} - Dr. ${app.DoktorAdi || app.DoctorName} (${app.DepartmanAdi || app.DepartmentName})`} 
                                            secondary={`Hasta: ${app.HastaAdi || app.PatientName} ${app.HastaSoyadi || ''} - Durum: ${app.Status}`}
                                        />
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            onClick={() => handleOpenEditModal(app)}
                                            sx={{ ml: 1 }}
                                        >
                                            Düzenle/Onayla
                                        </Button>
                                    </ListItem> 
                                ))}
                            </List>
                        )}
                    </Box>
                );
              case 5: // RoleID 5: Laborant Paneli
    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>
                Laboratuvar Paneli
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                Hoş geldiniz, <strong>{currentUser.FirstName} {currentUser.LastName}</strong>.<br />
                Size atanan testleri buradan yönetebilirsiniz.
            </Alert>
            
            <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
                Laboratuvar Testleri
            </Typography>
            
            {renderLoadingError(loadingLabTests, errorLabTests, labTests, "Henüz atanmış laboratuvar testiniz bulunmamaktadır.")}
            
            {!loadingLabTests && !errorLabTests && labTests.length > 0 && (
                <List dense>
                    {labTests.map(test => (
                        <ListItem key={test.TestID} divider sx={{ py: 2 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                <Box flex={1}>
                                    <Typography variant="body1" fontWeight="medium">
                                        {test.TestName || test.TestAdi}
                                    </Typography>
                                    <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                                        <Typography variant="body2" color="text.secondary">
                                            Hasta: {test.HastaAdi || test.PatientName} {test.HastaSoyadi || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Doktor: Dr. {test.DoktorAdi || test.DoctorName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Departman: {test.DepartmanAdi || test.DepartmentName}
                                        </Typography>
                                        {test.OrderDate && (
                                            <Typography variant="body2" color="text.secondary">
                                                İstek Tarihi: {new Date(test.OrderDate).toLocaleDateString('tr-TR')}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1} ml={2}>
                                    <Box display="flex" gap={1}>
                                        {test.Status === 'Bekliyor' && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                onClick={() => handleGenerateResult(test.TestID)}
                                            >
                                                Sonuç Üret
                                            </Button>
                                        )}
                                        {test.Status === 'Tamamlandı' && (
                                            <Button
                                                variant="outlined"
                                                color="success"
                                                size="small"
                                                onClick={() => handleOpenTestDetail(test)}
                                            >
                                                Sonucu Gör
                                            </Button>
                                        )}
                                        {test.Status === 'İptal Edildi' && (
                                            <Typography variant="body2" color="error">
                                                İptal Edildi
                                            </Typography>
                                        )}
                                    </Box>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            fontWeight: 'bold',
                                            color: test.Status === 'Tamamlandı' ? 'success.main' : 
                                                   test.Status === 'Bekliyor' ? 'warning.main' : 
                                                   'error.main'
                                        }}
                                    >
                                        Durum: {test.Status}
                                    </Typography>
                                </Box>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            )}

            {/* Laboratuvar Test Detay Modal'ı */}
            <Dialog 
                open={isLabTestModalOpen} 
                onClose={handleCloseTestDetail}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Test Detayları</DialogTitle>
                <DialogContent>
                    {selectedTest && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                {selectedTest.TestName || selectedTest.TestAdi}
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Hasta:
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedTest.HastaAdi || selectedTest.PatientName} {selectedTest.HastaSoyadi || ''}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Doktor:
                                    </Typography>
                                    <Typography variant="body1">
                                        Dr. {selectedTest.DoktorAdi || selectedTest.DoctorName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        İstek Tarihi:
                                    </Typography>
                                    <Typography variant="body1">
                                        {new Date(selectedTest.OrderDate).toLocaleDateString('tr-TR')}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        Sonuç Tarihi:
                                    </Typography>
                                    <Typography variant="body1">
                                        {selectedTest.ResultDate ? 
                                            new Date(selectedTest.ResultDate).toLocaleDateString('tr-TR') : 
                                            'Henüz tamamlanmadı'}
                                    </Typography>
                                </Grid>
                                {selectedTest.Results && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Test Sonuçları:
                                        </Typography>
                                        <Box sx={{ 
                                            p: 2, 
                                            bgcolor: '#f5f5f5', 
                                            borderRadius: 1,
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {selectedTest.Results}
                                        </Box>
                                    </Grid>
                                )}
                                {selectedTest.LaborantNot && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            Laborant Notu:
                                        </Typography>
                                        <Box sx={{ 
                                            p: 2, 
                                            bgcolor: '#e8f5e9', 
                                            borderRadius: 1,
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {selectedTest.LaborantNot}
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseTestDetail}>Kapat</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );




            default:
                return <Typography variant="body1">Paneliniz için içerik henüz hazırlanmadı.</Typography>;
        }
    };
                          
    // --- ANA RENDER ---
    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Ana Sayfa
            </Typography>
            <Divider sx={{ my: 2 }} />

            {renderDashboardContent()}

            {/* ÇIKIŞ YAP BUTONU */}
            <Button
                variant="outlined"
                color="error"
                onClick={onLogout}
                sx={{ marginTop: '30px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
            >
                Çıkış Yap
            </Button>

            {/* YENİ RANDEVU OLUŞTURMA MODAL'I */}
            <Dialog 
                open={isNewAppointmentModalOpen} 
                onClose={handleCloseNewAppointmentModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Yeni Randevu Oluştur</DialogTitle>
                <DialogContent>
                    <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    
                    {getStepContent(activeStep)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleBack} disabled={activeStep === 0}>
                        Geri
                    </Button>
                    <Button onClick={handleNext} disabled={activeStep === steps.length - 1}>
                        İleri
                    </Button>
                    {activeStep === steps.length - 1 && (
                        <Button 
                            variant="contained" 
                            onClick={handleCreateAppointment}
                            disabled={!newAppointmentData.AppointmentTime}
                        >
                            Randevuyu Oluştur
                        </Button>
                    )}
                    <Button onClick={handleCloseNewAppointmentModal}>
                        İptal
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbarOpen(false)} 
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {/* HASTA DETAY MODAL'I (Doktor) */}
            {selectedPatient && (
                <PatientDetailModal 
                    open={isPatientModalOpen} 
                    onClose={handlePatientModalClose} 
                    patientData={selectedPatient} 
                    doctorId={currentUser?.UserID}
                />
            )}

            {/* SEKRETER DÜZENLEME MODAL'I */}
            {selectedAppointment && (
                <AppointmentEditModal
                    open={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    appointmentData={selectedAppointment}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            )}
{/* LABORATUVAR İSTEMİ MODAL'I (DOKTOR İÇİN) */}
            <Dialog 
                open={isLabRequestModalOpen} 
                onClose={handleCloseLabRequestModal}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Laboratuvar İsteği
                    {selectedPatientForLab && (
                        <Typography variant="body2" color="text.secondary">
                            Hasta: {selectedPatientForLab.HastaAdi || selectedPatientForLab.FirstName} {selectedPatientForLab.HastaSoyadi || selectedPatientForLab.LastName}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Test Adı *</InputLabel>
                            <Select
                                name="testName"
                                value={labRequestData.testName}
                                onChange={handleLabRequestChange}
                                label="Test Adı *"
                            >
                                <MenuItem value="">
                                    <em>Test seçin veya özel test yazın</em>
                                </MenuItem>
                                {commonTests.map((test, index) => (
                                    <MenuItem key={index} value={test}>
                                        {test}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        
                        <TextField
                            fullWidth
                            label="Özel Test (Yukarıdaki listede yoksa)"
                            name="testName"
                            value={labRequestData.testName}
                            onChange={handleLabRequestChange}
                            sx={{ mb: 3 }}
                            placeholder="Özel test adı yazın..."
                        />
                        
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Test Türü</InputLabel>
                            <Select
                                name="testType"
                                value={labRequestData.testType}
                                onChange={handleLabRequestChange}
                                label="Test Türü"
                            >
                                <MenuItem value="Genel">Genel</MenuItem>
                                <MenuItem value="Kan">Kan Testi</MenuItem>
                                <MenuItem value="İdrar">İdrar Testi</MenuItem>
                                <MenuItem value="Radyoloji">Radyoloji</MenuItem>
                                <MenuItem value="Diğer">Diğer</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            fullWidth
                            label="Ek Notlar (Opsiyonel)"
                            name="additionalNotes"
                            value={labRequestData.additionalNotes}
                            onChange={handleLabRequestChange}
                            multiline
                            rows={3}
                            placeholder="Test için özel notlarınızı buraya yazın..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLabRequestModal}>İptal</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSubmitLabRequest}
                        disabled={!labRequestData.testName}
                    >
                        Laboratuvar İsteği Oluştur
                    </Button>
                </DialogActions>
            </Dialog>
            
        {/* REÇETE YAZMA MODAL'I (DOKTOR İÇİN) */}
<Dialog 
    open={isPrescriptionModalOpen} 
    onClose={handleClosePrescriptionModal}
    maxWidth="sm"
    fullWidth
>
    <DialogTitle>
        Reçete Yaz
        {selectedPatientForPrescription && (
            <Typography variant="body2" color="text.secondary">
                Hasta: {selectedPatientForPrescription.HastaAdi || selectedPatientForPrescription.FirstName} {selectedPatientForPrescription.HastaSoyadi || selectedPatientForPrescription.LastName}
            </Typography>
        )}
    </DialogTitle>
    <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ⭐ TC YAZMA ALANI */}
            <TextField
                fullWidth
                label="Hasta TC Numarası"
                value={selectedPatientForPrescription?.HastaTC || ''}
                onChange={(e) => {
                    if (selectedPatientForPrescription) {
                        setSelectedPatientForPrescription({
                            ...selectedPatientForPrescription,
                            HastaTC: e.target.value
                        });
                    }
                }}
                size="small"
                disabled={false}
            />
            
            <TextField
                fullWidth
                label="İlaç Adı *"
                value={prescriptionData.medication}
                onChange={(e) => setPrescriptionData({...prescriptionData, medication: e.target.value})}
                size="small"
            />
            <TextField
                fullWidth
                label="Doz *"
                value={prescriptionData.dosage}
                onChange={(e) => setPrescriptionData({...prescriptionData, dosage: e.target.value})}
                placeholder="örn: 500mg"
                size="small"
            />
            <TextField
                fullWidth
                label="Kullanım Sıklığı"
                value={prescriptionData.frequency}
                onChange={(e) => setPrescriptionData({...prescriptionData, frequency: e.target.value})}
                placeholder="örn: Günde 3 defa"
                size="small"
            />
            <TextField
                fullWidth
                label="Süre"
                value={prescriptionData.duration}
                onChange={(e) => setPrescriptionData({...prescriptionData, duration: e.target.value})}
                placeholder="örn: 10 gün"
                size="small"
            />
            <TextField
                fullWidth
                label="Notlar"
                value={prescriptionData.notes}
                onChange={(e) => setPrescriptionData({...prescriptionData, notes: e.target.value})}
                multiline
                rows={3}
                size="small"
            />
        </Box>
    </DialogContent>
    <DialogActions>
        <Button onClick={handleClosePrescriptionModal}>İptal</Button>
        <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreatePrescription}
        >
            Reçete Oluştur
        </Button>
    </DialogActions>
</Dialog>

        {/* YENİ: Laborant Test Detay Modal'ı  */}
{selectedTest && (
    <Dialog 
        open={isLabTestModalOpen} 
        onClose={handleCloseTestDetail}
        maxWidth="md"
        fullWidth
    >
        
        <DialogTitle>Test Detayı: {selectedTest.TestName || selectedTest.TestAdi}</DialogTitle>
        <DialogContent>
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Hasta Bilgileri</Typography>
                <Typography><strong>Ad Soyad:</strong> {selectedTest.HastaAdi || selectedTest.PatientName} {selectedTest.HastaSoyadi || ''}</Typography>
                <Typography><strong>TC No:</strong> {selectedTest.HastaTC || selectedTest.TCNo || 'Belirtilmemiş'}</Typography>
                <Typography><strong>Doktor:</strong> Dr. {selectedTest.DoktorAdi || selectedTest.DoctorName}</Typography>
                <Typography><strong>Departman:</strong> {selectedTest.DepartmanAdi || selectedTest.DepartmentName}</Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>Test Bilgileri</Typography>
                <Typography><strong>Test Adı:</strong> {selectedTest.TestName || selectedTest.TestAdi}</Typography>
                <Typography><strong>Durum:</strong> {selectedTest.Status}</Typography>
                <Typography><strong>İstek Tarihi:</strong> {new Date(selectedTest.RequestDate || selectedTest.OrderDate).toLocaleDateString('tr-TR')}</Typography>
                {selectedTest.ResultDate && (
                    <Typography><strong>Sonuç Tarihi:</strong> {new Date(selectedTest.ResultDate).toLocaleDateString('tr-TR')}</Typography>
                )}
                
                {selectedTest.Results && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Test Sonucu</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                            {selectedTest.Results}
                        </Typography>
                    </>
                )}
                
                {selectedTest.LaborantNot && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>Laborant Notu</Typography>
                        <Typography sx={{ whiteSpace: 'pre-wrap', bgcolor: '#e8f5e9', p: 2, borderRadius: 1 }}>
                            {selectedTest.LaborantNot}
                        </Typography>
                    </>
                )}
            </Box>
        </DialogContent>
        <DialogActions>
            {selectedTest.Status === 'Bekliyor' && (
                <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => {
                        handleGenerateResult(selectedTest.TestID);
                        handleCloseTestDetail();
                    }}
                >
                    Otomatik Sonuç Üret
                </Button>
            )}
            <Button onClick={handleCloseTestDetail}>Kapat</Button>
        </DialogActions>
    </Dialog>
)}
        
        </Container>
    
);

}

export default Dashboard;