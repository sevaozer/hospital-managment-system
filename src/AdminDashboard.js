// AdminDashboard.js - FINAL COMPLETE VERSION
// ✅ İstatistik kartları (Procedure'den veri alıyor)
// ✅ Doktor ekleme (Departman ile)
// ✅ Düzenleme (Departman değişmez)
// ✅ Silme (Hatasız)
// ✅ Departman gösterimi
// ✅ Backend 33. endpoint uyumlu

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Grid, Card, CardContent, Tabs, Tab, Button, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Alert, CircularProgress, InputAdornment, FormControl,
  InputLabel, Select, TablePagination, Divider
} from '@mui/material';
import {
  People, LocalHospital, Business, Assessment, Add, Edit, Delete,
  Search, Refresh, PersonAdd, Visibility
} from '@mui/icons-material';

const API_URL = 'http://localhost:3000';

const AdminDashboard = ({ currentUser }) => {
  // ===== STATE'LER =====
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Veri State'leri
  const [staff, setStaff] = useState({ doctors: [], secretaries: [], technicians: [] });
  const [patients, setPatients] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalDepartments: 0,
    todayAppointments: 0,
    monthlyAppointments: 0
  });

  // Filtre State'leri
  const [staffFilters, setStaffFilters] = useState({
    search: '',
    role: 'all',
    department: 'all',
    page: 0,
    rowsPerPage: 10
  });

  const [patientFilters, setPatientFilters] = useState({
    search: '',
    page: 0,
    rowsPerPage: 10
  });

  // Modal State'leri
  const [staffDialog, setStaffDialog] = useState({ open: false, mode: 'add', type: 'doctor', data: {} });
  const [departmentDialog, setDepartmentDialog] = useState({ open: false, mode: 'add', data: {} });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', id: null });

  // Form Data
  const [staffForm, setStaffForm] = useState({
    FirstName: '', 
    LastName: '', 
    Username: '', 
    PasswordHash: '', 
    Email: '',
    Gender: 'Erkek',
    DepartmentID: 0,
    DepartmentName: '',
    Title: '', 
    PhoneNumber: '', 
    Role: 'doktor'
  });

  const [departmentForm, setDepartmentForm] = useState({
    DepartmentName: '', 
    Description: ''
  });

  // ===== USEEFFECT =====
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (departments.length > 0) {
      fetchStaff();
    }
  }, [departments]);

  // ===== API CALLS =====
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await fetchDepartments();
      await fetchStats();
      
      await Promise.all([
        fetchPatients(),
        fetchStaff()
      ]);
    } catch (err) {
      setError('Veriler yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📊 Stats çağrılıyor...');
      const response = await axios.get(`${API_URL}/api/admin/reports`);
      
      console.log('✅ Backend Response:', response.data);
      
      let statsData = {
        totalPatients: 0,
        totalDoctors: 0,
        totalDepartments: 0,
        monthlyAppointments: 0
      };

      // Eğer array ise
      if (Array.isArray(response.data)) {
        statsData = {
          totalPatients: response.data[0] || 0,      // 4
          totalDoctors: response.data[1] || 0,       // 5
          monthlyAppointments: response.data[2] || 0, // 33 (aylık)
          todayAppointments: response.data[3] || 0   // 0 (bugünkü)
        };
      }
      // Eğer object ise
      else if (typeof response.data === 'object' && response.data !== null) {
        const values = Object.values(response.data);
        statsData = {
          totalPatients: values[0] || 0,             // 4
          totalDoctors: values[1] || 0,              // 5
          monthlyAppointments: values[2] || 0,       // 33 (aylık)
          todayAppointments: values[3] || 0          // 0 (bugünkü)
        };
      }

      console.log('📊 Stats set ediliyor:', statsData);
      setStats(statsData);
      
    } catch (err) {
      console.error('❌ Stats hatası:', err.message);
      setStats({
        totalPatients: 0,
        totalDoctors: 0,
        totalDepartments: 0,
        monthlyAppointments: 0
      });
    }
  };

  const fetchStaff = async () => {
    try {
      console.log('👥 Personel yükleniyor...');
      const response = await axios.get(`${API_URL}/api/admin/staff`);
      
      console.log('✅ Response:', response.data);
      
      if (response.data.success) {
        const allStaff = response.data.staff || [];
        
        console.log('📊 Personel sayısı:', allStaff.length);
        console.log('🏥 Departmanlar:', departments);
        
        const staffWithDepartmentName = allStaff.map(staff => {
          const department = departments.find(
            d => parseInt(d.DepartmentID) === parseInt(staff.DepartmentID)
          );
          
          const mappedStaff = {
            ...staff,
            DepartmentName: department ? department.DepartmentName : staff.DepartmentName || '-'
          };
          
          if (staff.RoleName === 'Doktor') {
            console.log(`👨‍⚕️ Doktor: ${staff.FirstName} ${staff.LastName}, DeptID: ${staff.DepartmentID}, DeptName: ${mappedStaff.DepartmentName}`);
          }
          
          return mappedStaff;
        });
        
        setStaff({
          doctors: staffWithDepartmentName.filter(s => s.RoleName === 'Doktor'),
          secretaries: staffWithDepartmentName.filter(s => s.RoleName === 'Sekreter'),
          technicians: staffWithDepartmentName.filter(s => s.RoleName === 'Laborant')
        });
        
        console.log('✅ Personel ayarlandı');
      } else {
        console.error('❌ Response başarısız:', response.data);
        setStaff({ doctors: [], secretaries: [], technicians: [] });
      }
    } catch (err) {
      console.error('❌ Personel yüklenemedi:', err);
      setStaff({ doctors: [], secretaries: [], technicians: [] });
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/patients`);
      
      if (response.data.success) {
        setPatients(response.data.patients || []);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error('Hastalar yüklenemedi:', err);
      setPatients([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/departments`);
      
      if (response.data.success) {
        setDepartments(response.data.departments || []);
      } else if (Array.isArray(response.data)) {
        setDepartments(response.data);
      } else {
        setDepartments([]);
      }
    } catch (err) {
      console.error('Departmanlar yüklenemedi:', err);
      setDepartments([]);
    }
  };

  // ===== PERSONEL İŞLEMLERİ =====
  const handleOpenStaffDialog = (mode, type, data = {}) => {
    setStaffDialog({ open: true, mode, type, data });
    
    if (mode === 'edit') {
      setStaffForm({
        FirstName: data.FirstName || '',
        LastName: data.LastName || '',
        Username: data.Username || '',
        PasswordHash: '',
        Email: data.Email || '',
        Gender: data.Gender || 'Erkek',
        DepartmentID: parseInt(data.DepartmentID) || 0,
        DepartmentName: data.DepartmentName || '-',
        Title: data.Title || '',
        PhoneNumber: data.PhoneNumber || '',
        Role: 'doktor'
      });
    } else {
      setStaffForm({
        FirstName: '', 
        LastName: '', 
        Username: '', 
        PasswordHash: '', 
        Email: '',
        Gender: 'Erkek',
        DepartmentID: 0,
        DepartmentName: '',
        Title: '', 
        PhoneNumber: '',
        Role: 'doktor'
      });
    }
  };

  const handleSaveStaff = async () => {
    try {
      setLoading(true);
      setError('');
      
      let endpoint, method, successMessage;
      
      if (staffDialog.mode === 'add') {
        method = 'post';
        successMessage = 'Doktor başarıyla eklendi!';
        endpoint = `${API_URL}/api/admin/doctors`;
        
        const payload = {
          FirstName: staffForm.FirstName.trim(),
          LastName: staffForm.LastName.trim(),
          Email: staffForm.Email.trim(),
          PhoneNumber: staffForm.PhoneNumber || '',
          Gender: staffForm.Gender || 'Erkek',
          DepartmentID: staffForm.DepartmentID ? parseInt(staffForm.DepartmentID) : null,
          Title: staffForm.Title || 'Uzman Doktor',
          Username: staffForm.Username.trim(),
          PasswordHash: staffForm.PasswordHash,
          Role: 'doktor'
        };
        
        const response = await axios[method](endpoint, payload);
        
        if (response.data.success) {
          setSuccessMessage(successMessage);
          setStaffDialog({ open: false, mode: 'add', type: 'doctor', data: {} });
          
          setStaffForm({
            FirstName: '', LastName: '', Username: '', PasswordHash: '', Email: '',
            Gender: 'Erkek', DepartmentID: 0, DepartmentName: '', Title: '', PhoneNumber: '', Role: 'doktor'
          });
          
          await fetchDepartments();
          await fetchStats();
          
        } else {
          setError(response.data.message || 'İşlem başarısız');
        }
        
      } else {
        method = 'put';
        successMessage = 'Personel bilgileri güncellendi!';
        endpoint = `${API_URL}/api/admin/staff/${staffDialog.data.UserID}`;
        
        const payload = {
          FirstName: staffForm.FirstName,
          LastName: staffForm.LastName,
          Email: staffForm.Email,
          PhoneNumber: staffForm.PhoneNumber,
          Title: staffForm.Title
        };
        
        const response = await axios[method](endpoint, payload);
        
        if (response.data.success) {
          setSuccessMessage(successMessage);
          setStaffDialog({ open: false, mode: 'add', type: 'doctor', data: {} });
          
          await fetchDepartments();
          await fetchStats();
          
        } else {
          setError(response.data.message || 'İşlem başarısız');
        }
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Hata:', err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || 'İşlem başarısız');
      setLoading(false);
    }
  };

  const handleSaveDepartment = async () => {
    try {
      setLoading(true);
      setError('');
      
      let endpoint, method;
      
      if (departmentDialog.mode === 'add') {
        endpoint = `${API_URL}/api/admin/departments`;
        method = 'post';
      } else {
        endpoint = `${API_URL}/api/admin/departments/${departmentDialog.data.DepartmentID}`;
        method = 'put';
      }
      
      const response = await axios[method](endpoint, departmentForm);
      
      if (response.data.success) {
        setSuccessMessage(
          departmentDialog.mode === 'add' 
            ? 'Departman eklendi!' 
            : 'Departman güncellendi!'
        );
        setDepartmentDialog({ open: false, mode: 'add', data: {} });
        
        await fetchDepartments();
        await fetchStats();
        
        setDepartmentForm({ DepartmentName: '', Description: '' });
      } else {
        setError(response.data.message || 'İşlem başarısız');
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error('Departman kaydetme hatası:', err.response?.data || err);
      setError(err.response?.data?.message || 'Departman işlemi başarısız');
      setLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    try {
      setLoading(true);
      
      let role = '';
      if (staff.doctors.find(d => d.UserID === deleteDialog.id)) {
        role = 'doktor';
      } else if (staff.secretaries.find(s => s.UserID === deleteDialog.id)) {
        role = 'sekreter';
      } else if (staff.technicians.find(t => t.UserID === deleteDialog.id)) {
        role = 'laborant';
      } else {
        setError('Personel rolü belirlenemedi');
        setLoading(false);
        return;
      }
      
      const endpoint = `${API_URL}/api/admin/staff/${deleteDialog.id}?role=${role}`;
      
      const response = await axios.delete(endpoint);
      
      if (response.data.success) {
        setSuccessMessage('Personel silindi');
        
        await fetchDepartments();
        await fetchStats();
        
        setDeleteDialog({ open: false, type: '', id: null });
        
      } else {
        setError('Silme işlemi başarısız');
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error('❌ Silme hatası:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Silme işlemi başarısız');
      setLoading(false);
    }
  };

  // ===== FİLTRELEME =====
  const getFilteredStaff = () => {
    let allStaff = [];
    
    if (staffFilters.role === 'all' || staffFilters.role === 'doktor') {
      allStaff = [...allStaff, ...staff.doctors.map(d => ({ ...d, RoleName: 'Doktor' }))];
    }
    if (staffFilters.role === 'all' || staffFilters.role === 'sekreter') {
      allStaff = [...allStaff, ...staff.secretaries.map(s => ({ ...s, RoleName: 'Sekreter' }))];
    }
    if (staffFilters.role === 'all' || staffFilters.role === 'laborant') {
      allStaff = [...allStaff, ...staff.technicians.map(t => ({ ...t, RoleName: 'Laborant' }))];
    }

    if (staffFilters.search) {
      const searchLower = staffFilters.search.toLowerCase();
      allStaff = allStaff.filter(s =>
        `${s.FirstName} ${s.LastName}`.toLowerCase().includes(searchLower) ||
        (s.Email || '').toLowerCase().includes(searchLower) ||
        (s.Username || '').toLowerCase().includes(searchLower)
      );
    }

    if (staffFilters.department !== 'all') {
      allStaff = allStaff.filter(s => s.DepartmentID === parseInt(staffFilters.department));
    }

    return allStaff;
  };

  const getFilteredPatients = () => {
    let filtered = [...patients];

    if (patientFilters.search) {
      const searchLower = patientFilters.search.toLowerCase();
      filtered = filtered.filter(p =>
        `${p.FirstName} ${p.LastName}`.toLowerCase().includes(searchLower) ||
        (p.TCNo || '').includes(patientFilters.search) ||
        (p.PhoneNumber || '').includes(patientFilters.search)
      );
    }

    return filtered;
  };

  const filteredStaff = getFilteredStaff();
  const paginatedStaff = filteredStaff.slice(
    staffFilters.page * staffFilters.rowsPerPage,
    (staffFilters.page + 1) * staffFilters.rowsPerPage
  );

  const filteredPatients = getFilteredPatients();
  const paginatedPatients = filteredPatients.slice(
    patientFilters.page * patientFilters.rowsPerPage,
    (patientFilters.page + 1) * patientFilters.rowsPerPage
  );

  // ===== RENDER =====
  return (
    <Box sx={{ p: 2 }}>
      {/* Başlık */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>
          Yönetim Paneli
        </Typography>
        <Button
          startIcon={<Refresh />}
          onClick={fetchAllData}
          variant="outlined"
        >
          Yenile
        </Button>
      </Box>

      {/* Bildirimler */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage('')} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* İSTATİSTİK KARTLARI */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <People color="primary" />
                <Typography variant="h6">Toplam Hasta</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                {stats.totalPatients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocalHospital color="secondary" />
                <Typography variant="h6">Doktor</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#7b1fa2' }}>
                {stats.totalDoctors}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Business color="success" />
                <Typography variant="h6">Departman</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                {departments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Assessment color="warning" />
                <Typography variant="h6">Bu Ay Randevu</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                {stats.monthlyAppointments}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sekmeler */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Personel Yönetimi" icon={<People />} iconPosition="start" />
          <Tab label="Hasta Yönetimi" icon={<LocalHospital />} iconPosition="start" />
          <Tab label="Departmanlar" icon={<Business />} iconPosition="start" />
          <Tab label="Raporlar" icon={<Assessment />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* PERSONEL YÖNETİMİ SEKMESİ */}
      {activeTab === 0 && (
        <Box>
          {/* Filtreler */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ad, email veya kullanıcı adı ara..."
                  value={staffFilters.search}
                  onChange={(e) => setStaffFilters({ ...staffFilters, search: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rol</InputLabel>
                  <Select
                    value={staffFilters.role}
                    onChange={(e) => setStaffFilters({ ...staffFilters, role: e.target.value })}
                    label="Rol"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    <MenuItem value="doktor">Doktor</MenuItem>
                    <MenuItem value="sekreter">Sekreter</MenuItem>
                    <MenuItem value="laborant">Laborant</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Departman</InputLabel>
                  <Select
                    value={staffFilters.department}
                    onChange={(e) => setStaffFilters({ ...staffFilters, department: e.target.value })}
                    label="Departman"
                  >
                    <MenuItem value="all">Tümü</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>
                        {dept.DepartmentName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => handleOpenStaffDialog('add', 'doctor')}
                >
                  Yeni Doktor
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Personel Tablosu */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Personel Listesi ({filteredStaff.length} kayıt)
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Ad Soyad</strong></TableCell>
                  <TableCell><strong>Rol</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Departman</strong></TableCell>
                  <TableCell><strong>Telefon</strong></TableCell>
                  <TableCell><strong>İşlemler</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedStaff.map(person => (
                  <TableRow key={person.UserID} hover>
                    <TableCell>{person.FirstName} {person.LastName}</TableCell>
                    <TableCell>
                      <Chip
                        label={person.RoleName}
                        size="small"
                        color={
                          person.RoleName === 'Doktor' ? 'primary' :
                          person.RoleName === 'Sekreter' ? 'secondary' : 'success'
                        }
                      />
                    </TableCell>
                    <TableCell>{person.Email}</TableCell>
                    <TableCell>
                      <strong>{person.DepartmentName || '-'}</strong>
                    </TableCell>
                    <TableCell>{person.PhoneNumber || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStaffDialog('edit', person.RoleName.toLowerCase(), person)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteDialog({ open: true, type: 'staff', id: person.UserID })}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredStaff.length}
            page={staffFilters.page}
            onPageChange={(e, newPage) => setStaffFilters({ ...staffFilters, page: newPage })}
            rowsPerPage={staffFilters.rowsPerPage}
            onRowsPerPageChange={(e) => setStaffFilters({
              ...staffFilters,
              rowsPerPage: parseInt(e.target.value, 10),
              page: 0
            })}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Sayfa başına:"
          />
        </Box>
      )}

      {/* HASTA YÖNETİMİ SEKMESİ */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Hasta ara (Ad, TC, Telefon)..."
              value={patientFilters.search}
              onChange={(e) => setPatientFilters({ ...patientFilters, search: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
              }}
            />
          </Paper>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Hasta Listesi ({filteredPatients.length} kayıt)
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Ad Soyad</strong></TableCell>
                  <TableCell><strong>TC No</strong></TableCell>
                  <TableCell><strong>Cinsiyet</strong></TableCell>
                  <TableCell><strong>Telefon</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>İşlemler</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPatients.map(patient => (
                  <TableRow key={patient.PatientID} hover>
                    <TableCell>{patient.FirstName} {patient.LastName}</TableCell>
                    <TableCell>{patient.TCNo}</TableCell>
                    <TableCell>{patient.Gender}</TableCell>
                    <TableCell>{patient.PhoneNumber || '-'}</TableCell>
                    <TableCell>{patient.Email || '-'}</TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={filteredPatients.length}
            page={patientFilters.page}
            onPageChange={(e, newPage) => setPatientFilters({ ...patientFilters, page: newPage })}
            rowsPerPage={patientFilters.rowsPerPage}
            onRowsPerPageChange={(e) => setPatientFilters({
              ...patientFilters,
              rowsPerPage: parseInt(e.target.value, 10),
              page: 0
            })}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Sayfa başına:"
          />
        </Box>
      )}

      {/* DEPARTMAN YÖNETİMİ SEKMESİ */}
      {activeTab === 2 && (
        <Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setDepartmentDialog({ open: true, mode: 'add', data: {} });
              setDepartmentForm({ DepartmentName: '', Description: '' });
            }}
            sx={{ mb: 3 }}
          >
            Yeni Departman
          </Button>

          <Grid container spacing={2}>
            {departments.map(dept => (
              <Grid item xs={12} md={6} key={dept.DepartmentID}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{dept.DepartmentName}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {dept.Description || 'Açıklama yok'}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2">
                      Doktor Sayısı: {staff.doctors.filter(d => 
                        d.DepartmentID && 
                        parseInt(d.DepartmentID) === parseInt(dept.DepartmentID)
                        ).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* RAPORLAR SEKMESİ */}
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Bugünkü Randevular</Typography>
                  <Typography variant="h3">{stats.todayAppointments}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Haftalık Randevular</Typography>
                  <Typography variant="h3">0</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Bu Ay Randevular</Typography>
                  <Typography variant="h3">{stats.monthlyAppointments}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* DOKTOR EKLEME/DÜZENLEME DIALOG */}
      <Dialog open={staffDialog.open} onClose={() => setStaffDialog({ ...staffDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {staffDialog.mode === 'add' ? 'Yeni Doktor' : 'Doktor Düzenle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Ad"
              value={staffForm.FirstName}
              onChange={(e) => setStaffForm({ ...staffForm, FirstName: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Soyad"
              value={staffForm.LastName}
              onChange={(e) => setStaffForm({ ...staffForm, LastName: e.target.value })}
              fullWidth
              required
            />
            
            {staffDialog.mode === 'add' && (
              <>
                <TextField
                  label="Kullanıcı Adı"
                  value={staffForm.Username}
                  onChange={(e) => setStaffForm({ ...staffForm, Username: e.target.value })}
                  fullWidth
                  required
                />
                
                <TextField
                  label="Şifre"
                  type="password"
                  value={staffForm.PasswordHash}
                  onChange={(e) => setStaffForm({ ...staffForm, PasswordHash: e.target.value })}
                  fullWidth
                  required
                />
              </>
            )}
            
            <TextField
              label="Email"
              type="email"
              value={staffForm.Email}
              onChange={(e) => setStaffForm({ ...staffForm, Email: e.target.value })}
              fullWidth
              required
            />
            
            {staffDialog.mode === 'add' && (
              <FormControl fullWidth>
                <InputLabel>Cinsiyet</InputLabel>
                <Select
                  value={staffForm.Gender || 'Erkek'}
                  onChange={(e) => setStaffForm({ ...staffForm, Gender: e.target.value })}
                  label="Cinsiyet"
                >
                  <MenuItem value="Erkek">Erkek</MenuItem>
                  <MenuItem value="Kadın">Kadın</MenuItem>
                  <MenuItem value="Diğer">Diğer</MenuItem>
                </Select>
              </FormControl>
            )}
            
            {staffDialog.mode === 'add' && (
              <FormControl fullWidth>
                <InputLabel>Departman</InputLabel>
                <Select
                  value={staffForm.DepartmentID || 0}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStaffForm({ 
                      ...staffForm, 
                      DepartmentID: value === 0 ? null : value
                    });
                  }}
                  label="Departman"
                >
                  <MenuItem value={0}>-- Seçim Yapınız --</MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept.DepartmentID} value={dept.DepartmentID}>
                      {dept.DepartmentName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {staffDialog.mode === 'edit' && (
              <TextField
                label="Departman"
                value={staffForm.DepartmentName || '-'}
                fullWidth
                disabled
              />
            )}
            
            <TextField
              label="Ünvan"
              value={staffForm.Title || ''}
              onChange={(e) => setStaffForm({ ...staffForm, Title: e.target.value })}
              fullWidth
              placeholder="Örn: Uzman Doktor, Prof. Dr., vb."
            />
            
            <TextField
              label="Telefon"
              value={staffForm.PhoneNumber || ''}
              onChange={(e) => setStaffForm({ ...staffForm, PhoneNumber: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStaffDialog({ ...staffDialog, open: false })}>İptal</Button>
          <Button 
            onClick={handleSaveStaff} 
            variant="contained" 
            disabled={loading || !staffForm.FirstName || !staffForm.LastName || !staffForm.Email}
          >
            {loading ? <CircularProgress size={24} /> : staffDialog.mode === 'add' ? 'Ekle' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DEPARTMAN EKLEME/DÜZENLEME DIALOG */}
      <Dialog open={departmentDialog.open} onClose={() => setDepartmentDialog({ open: false, mode: 'add', data: {} })} maxWidth="sm" fullWidth>
        <DialogTitle>{departmentDialog.mode === 'add' ? 'Yeni Departman' : 'Departman Düzenle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Departman Adı"
              value={departmentForm.DepartmentName}
              onChange={(e) => setDepartmentForm({ ...departmentForm, DepartmentName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Açıklama"
              multiline
              rows={3}
              value={departmentForm.Description}
              onChange={(e) => setDepartmentForm({ ...departmentForm, Description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialog({ open: false, mode: 'add', data: {} })}>İptal</Button>
          <Button onClick={handleSaveDepartment} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SİLME ONAY DIALOG */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: '', id: null })}>
        <DialogTitle>Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography>Bu kaydı silmek istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, type: '', id: null })}>İptal</Button>
          <Button onClick={handleDeleteStaff} color="error" variant="contained">
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;