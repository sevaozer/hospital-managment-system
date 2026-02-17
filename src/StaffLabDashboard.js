// StaffLabDashboard.js - MINIMALIST PROFESYONEL VERSİYON
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Divider,
  Avatar
} from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import {
  CalendarToday,
  FilterList,
  HourglassEmpty
} from '@mui/icons-material';
import {
  ToggleButton,
  ToggleButtonGroup,
  ButtonGroup,
  TextField
} from '@mui/material';

// Minimalist stiller
const MinimalCard = styled(Card)(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(3),
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  transition: 'border-color 0.2s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main
  }
}));

const MinimalStatusChip = styled(Chip)(({ status, theme }) => ({
  fontWeight: 500,
  fontSize: '0.75rem',
  height: '24px',
  backgroundColor: 
    status === 'Bekliyor' ? theme.palette.warning.light :
    status === 'Sonuçlandı' ? theme.palette.success.light :
    status === 'İptal Edildi' ? theme.palette.error.light : 
    theme.palette.grey[200],
  color: 
    status === 'Bekliyor' ? theme.palette.warning.dark :
    status === 'Sonuçlandı' ? theme.palette.success.dark :
    status === 'İptal Edildi' ? theme.palette.error.dark :
    theme.palette.grey[700],
}));

const MinimalButton = styled(Button)(({ theme }) => ({
  textTransform: 'none',
  borderRadius: '6px',
  fontWeight: 500,
  padding: '6px 12px',
  fontSize: '0.875rem'
}));

const StaffLabDashboard = () => {
  const theme = useTheme();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Bugünün tarihi
  const [filterStatus, setFilterStatus] = useState('Tümü'); // 'Tümü', 'Bekliyor', 'Sonuçlandı'


  // Kullanıcı bilgilerini ayarla
  const setupUserInfo = () => {
    const user = {
      userId: 4,
      firstName: 'Yusuf',
      lastName: 'Demir',
      role: 'Laboratuvar Teknisyeni',
      email: 'yusuf.lab@hospital.com'
    };
    setUserInfo(user);
  };

  // Testleri yükle
 const fetchTests = async () => {
  try {
    setLoading(true);
    const params = {
      technicianId: 4,
      date: filterDate,
      status: filterStatus === 'Tümü' ? null : filterStatus
    };
    
    const response = await axios.get('http://localhost:3000/api/lab/my-tests', { params });
    let allTests = Array.isArray(response.data) ? response.data : [];
    
    // ⭐ HER TEST İÇİN HASTA BİLGİSİNİ EKLE
    allTests = await Promise.all(allTests.map(async (test) => {
      try {
        const detailResponse = await axios.get(
          `http://localhost:3000/api/lab/tests/${test.TestID}/details`
        );
        return { ...test, ...detailResponse.data };
      } catch (err) {
        return test;
      }
    }));
    
    setTests(allTests);
    setError('');
  } catch (err) {
    setError('Testler yüklenirken hata oluştu.');
    setTests([]);
  } finally {
    setLoading(false);
  }
};
  // İstatistikleri hesapla
  const stats = {
    total: tests.length,
    pending: tests.filter(t => t.Status === 'Bekliyor').length,
    completed: tests.filter(t => t.Status === 'Sonuçlandı').length,
    cancelled: tests.filter(t => t.Status === 'İptal Edildi').length
  };

 const handleGenerateResult = async (test) => {
    console.log('🚨 SONUÇ ÜRETİM BAŞLADI - TestID:', test.TestID);
    
    if (!window.confirm(`Test #${test.TestID} için sonuç üretilecek. Devam etmek istiyor musunuz?`)) {
        return;
    }

    try {
        setGenerating(true);
        console.log('📤 POST:', `http://localhost:3000/api/lab/tests/${test.TestID}/generate-result`);
        
        const response = await axios.post(
            `http://localhost:3000/api/lab/tests/${test.TestID}/generate-result`,
            { technicianId: 4 }
        );
        
        console.log('✅ Backend yanıtı:', response.data);
        
        if (response.data.message) {
            await fetchTests();
        }
    } catch (err) {
        console.error('❌ Sonuç üretme hatası:', err.response?.data || err.message);
        setError('Sonuç üretilirken hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
        setGenerating(false);
    }
};
  // Test detaylarını göster
  const handleViewDetails = (test) => {
    setSelectedTest(test);
    setDialogOpen(true);
  };

  // Çıkış yap
  const handleLogout = () => {
    if (window.confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Sayfa yüklendiğinde
  useEffect(() => {
    setupUserInfo();
    fetchTests();
  }, []);

  useEffect(() => {
  if (userInfo) {
    fetchTests();
  }
}, [filterDate, filterStatus]);


  // Yükleme ekranı
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="textSecondary">
          Yükleniyor...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* BAŞLIK BÖLÜMÜ */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Laboratuvar Paneli
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Hastane Laboratuvar Yönetim Sistemi
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <MinimalButton
              startIcon={<RefreshIcon />}
              onClick={fetchTests}
              disabled={loading}
              variant="outlined"
              size="small"
            >
              Yenile
            </MinimalButton>
            <MinimalButton
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              variant="outlined"
              color="error"
              size="small"
            >
              Çıkış
            </MinimalButton>
          </Box>
        </Box>

        {/* KULLANICI BİLGİLERİ */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={500}>
                    {userInfo?.firstName} {userInfo?.lastName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {userInfo?.role}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Kullanıcı ID
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    #{userInfo?.userId}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Email
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {userInfo?.email}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Toplam Test
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {stats.total}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Bekleyen
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {stats.pending}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* HATA MESAJI */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 1 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
        {/* FİLTRE BÖLÜMÜ */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Tarih Seçici */}
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarToday color="primary" fontSize="small" />
              <TextField
                type="date"
                label="Tarih"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                fullWidth
              />
              <ButtonGroup size="small" variant="outlined">
                <Button onClick={() => setFilterDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}>
                  Dün
                </Button>
                <Button 
                  onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
                  variant={filterDate === new Date().toISOString().split('T')[0] ? "contained" : "outlined"}
                >
                  Bugün
                </Button>
                <Button onClick={() => setFilterDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}>
                  Yarın
                </Button>
              </ButtonGroup>
            </Box>
          </Grid>

          {/* Durum Filtresi */}
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList color="primary" fontSize="small" />
              <ToggleButtonGroup
                value={filterStatus}
                exclusive
                onChange={(e, newStatus) => {
                  if (newStatus !== null) setFilterStatus(newStatus);
                }}
                size="small"
                fullWidth
              >
                <ToggleButton value="Tümü">
                  Tümü ({tests.length})
                </ToggleButton>
                <ToggleButton value="Bekliyor">
                  <HourglassEmpty sx={{ mr: 0.5, fontSize: 18 }} />
                  Bekliyor ({stats.pending})
                </ToggleButton>
                <ToggleButton value="Sonuçlandı">
                  <CheckCircleIcon sx={{ mr: 0.5, fontSize: 18 }} />
                  Sonuçlandı ({stats.completed})
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* İSTATİSTİK KARTLARI - MINIMAL */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <MinimalCard>
            <Box display="flex" alignItems="center" gap={2}>
              <AssignmentIcon color="primary" />
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Toplam Test
                </Typography>
              </Box>
            </Box>
          </MinimalCard>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <MinimalCard>
            <Box display="flex" alignItems="center" gap={2}>
              <PendingIcon color="warning" />
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats.pending}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Bekleyen
                </Typography>
              </Box>
            </Box>
          </MinimalCard>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <MinimalCard>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircleIcon color="success" />
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats.completed}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tamamlanan
                </Typography>
              </Box>
            </Box>
          </MinimalCard>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <MinimalCard>
            <Box display="flex" alignItems="center" gap={2}>
              <CancelIcon color="error" />
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stats.cancelled}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  İptal Edilen
                </Typography>
              </Box>
            </Box>
          </MinimalCard>
        </Grid>
      </Grid>

      {/* TESTLER TABLOSU */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={600}>
            Laboratuvar Testleri
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {tests.length} test bulundu
          </Typography>
        </Box>

        {tests.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <ScienceIcon sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Atanmış test bulunamadı
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
              Size atanmış laboratuvar testi bulunmuyor.
            </Typography>
            <MinimalButton
              startIcon={<RefreshIcon />}
              onClick={fetchTests}
              variant="outlined"
            >
              Yeniden Kontrol Et
            </MinimalButton>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: theme.palette.grey[50] }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Test ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Test Adı</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Hasta</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>İstenme Tarihi</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tests.map((test) => (
                  <TableRow 
                    key={test.TestID} 
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        #{test.TestID}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {test.TestName}
                      </Typography>
                      {test.Results && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          {test.Results.substring(0, 40)}...
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {test.PatientName || '-'}
                      </Typography>
                      {test.TCNo && (
                        <Typography variant="caption" color="textSecondary">
                          TC: {test.TCNo}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(test.RequestDate).toLocaleDateString('tr-TR')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {new Date(test.RequestDate).toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <MinimalStatusChip
                        label={test.Status}
                        status={test.Status}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <MinimalButton
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewDetails(test)}
                          variant="outlined"
                          size="small"
                        >
                          Detay
                        </MinimalButton>
                        
                        {test.Status === 'Bekliyor' && (
                          <MinimalButton
                            startIcon={<PlayCircleOutlineIcon />}
                            onClick={() => handleGenerateResult(test)}
                            disabled={generating}
                            variant="contained"
                            size="small"
                          >
                            Sonuç Üret
                          </MinimalButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* DETAY DIALOG */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {selectedTest && (
          <>
            <DialogTitle sx={{ pb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Test #{selectedTest.TestID} - {selectedTest.TestName}
              </Typography>
            </DialogTitle>
            
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Hasta Bilgileri
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Adı Soyadı:</strong> {selectedTest.PatientName}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>TC Kimlik:</strong> {selectedTest.TCNo || '-'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Telefon:</strong> {selectedTest.PhoneNumber || '-'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Test Bilgileri
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Durum:</strong> 
                    <MinimalStatusChip
                      label={selectedTest.Status}
                      status={selectedTest.Status}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>İstenme Tarihi:</strong> {new Date(selectedTest.RequestDate).toLocaleString('tr-TR')}
                  </Typography>
                  {selectedTest.ResultDate && (
                    <Typography variant="body2">
                      <strong>Sonuç Tarihi:</strong> {new Date(selectedTest.ResultDate).toLocaleString('tr-TR')}
                    </Typography>
                  )}
                </Grid>
                
                {selectedTest.Results && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Test Sonuçları
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: theme.palette.grey[50] }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                        {selectedTest.Results}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 2 }}>
              <MinimalButton onClick={() => setDialogOpen(false)}>
                Kapat
              </MinimalButton>
              {selectedTest.Status === 'Bekliyor' && (
                <MinimalButton
                  variant="contained"
                  onClick={() => {
                    setDialogOpen(false);
                    handleGenerateResult(selectedTest.TestID);
                  }}
                >
                  Sonuç Üret
                </MinimalButton>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* FOOTER */}
      <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="body2" color="textSecondary" align="center">
          © Özer Hastane Sistemi {new Date().getFullYear()} • Laboratuvar Modülü
        </Typography>
      </Box>
    </Container>
  );
};

export default StaffLabDashboard;