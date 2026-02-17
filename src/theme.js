import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors'; // Kırmızı renk paletini import et



// Özel temamızı oluşturuyoruz
const theme = createTheme({
  palette: {
    primary: {
      // main: red[900], // Eski hali
      main: '#790e3c', // YENİ HALİ: İstediğin özel Hex kodu
      contrastText: '#ffffff', // Bu koyu renk üzerine beyaz yazı iyi gider
    },
    secondary: {
      main: '#f50057', // Bunu da istersen değiştirebilirsin
    },
  },
});

export default theme;