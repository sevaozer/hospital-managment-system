import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
// MUI AppBar ve Düzen bileşenlerini import et
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box'; 
import StaffLabDashboard from './StaffLabDashboard'
import Container from '@mui/material/Container'; 
import BookAppointment from './BookAppointment';
import './App.css';
import Register from './Register';
import LoginSelector from './LoginSelector';
import PatientLogin from './PatientLogin';
import StaffLogin from './StaffLogin';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard'; // ⬅️ BU SATIRI EKLEYİN

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authViewMode, setAuthViewMode] = useState('selection'); 
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => { 
    setCurrentUser(userData);
    setAuthViewMode('selection'); 
    
    console.log('Giriş yapan kullanıcı rolü:', userData.RoleID, userData.RoleName);
    
    if (userData.RoleID === 1 || userData.RoleName === 'Admin') {
        navigate('/admin-dashboard'); // Admin'leri doğrudan admin dashboard'a
        console.log('✅ Admin kullanıcı admin-dashboard\'a yönlendirildi');
    } else {
        navigate('/dashboard'); // Diğer kullanıcıları normal dashboard'a
        console.log('✅ Normal kullanıcı dashboard\'a yönlendirildi');
    }
};
  
  const handleLogout = () => { 
    setCurrentUser(null);
    setAuthViewMode('selection'); 
    navigate('/login');
  };
  
  const showPatientLogin = () => setAuthViewMode('patientLogin');
  const showStaffLogin = () => setAuthViewMode('staffLogin');
  const showSelection = () => setAuthViewMode('selection');
  const showRegister = () => setAuthViewMode('register'); 

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static"> 
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Özer Hastane Sistemi
          </Typography>
          {currentUser && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Admin dashboard linki */}
              {currentUser.RoleName === 'Admin' && (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/admin-dashboard"
                >
                  Admin Panel
                </Button>
              )}
              <Button color="inherit" onClick={handleLogout}>
                Çıkış Yap ({currentUser.FirstName})
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}> 
        <Routes>
          <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
          
          <Route
            path="/login"
            element={
              !currentUser ? (
                <>
                  {authViewMode === 'selection' && <LoginSelector onSelectPatient={showPatientLogin} onSelectStaff={showStaffLogin} />}
                  {authViewMode === 'patientLogin' && <PatientLogin onLoginSuccess={handleLoginSuccess} onBack={showSelection} onSwitchToRegister={showRegister} />}
                  {authViewMode === 'staffLogin' && <StaffLogin onLoginSuccess={handleLoginSuccess} onBack={showSelection} />}
                  {authViewMode === 'register' && <Register onBack={showPatientLogin} />}
                </>
              ) : ( <Navigate to="/dashboard" replace /> )
            }
          />
          
          <Route 
            path="/dashboard" 
            element={
              currentUser ? 
              <Dashboard currentUser={currentUser} onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
            } 
          />
          
          {/* === YENİ EKLENEN: ADMIN DASHBOARD === */}
          <Route 
            path="/admin-dashboard"
            element={
              currentUser && (currentUser.RoleName === 'Admin' || currentUser.RoleID === 1) ? 
              <AdminDashboard currentUser={currentUser} /> : 
              <Navigate to="/dashboard" replace />
            }
          />
          {/* ======================================== */}
          
          <Route 
            path="/lab-dashboard"
            element={
              currentUser ? 
              <StaffLabDashboard /> : 
              <Navigate to="/login" replace />
            }
          />
          
          <Route 
            path="/randevu-al"
            element={
              currentUser && currentUser.RoleID === 3 ? 
              <BookAppointment currentUser={currentUser} /> : 
              <Navigate to="/login" replace />
            }
          />
          
          <Route path="*" element={<div>Sayfa Bulunamadı (404)</div>} />
        </Routes>
      </Container>

      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[200] }}>
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '} Özer Hastane Sistemi {new Date().getFullYear()} {'.'}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default App;