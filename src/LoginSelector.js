import React from 'react';
// MUI Bileşenleri
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
// İkonlar
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

function LoginSelector({ onSelectPatient, onSelectStaff }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(80vh - 64px)',
      }}
    >
      <Card sx={{ 
          minWidth: 300, 
          maxWidth: 400, 
          padding: 2, 
          boxShadow: 3,
          borderRadius: 2,
          border: '1px solid #e0e0e0' 
        }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div" gutterBottom>
            Giriş Yönteminizi Seçiniz
          </Typography>
          
          <Button 
            variant="contained"
            color="primary"
            onClick={onSelectPatient} 
            size="large"
            fullWidth 
            startIcon={<PersonIcon />}
            sx={{ 
              color: 'white',
            }}
          >
            Hasta Girişi
          </Button>

          <Button 
            variant="outlined"
            color="primary"
            onClick={onSelectStaff} 
            size="large"
            fullWidth
            startIcon={<MedicalServicesIcon />}
          >
            Personel Girişi
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LoginSelector;