import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Box,
  Alert,
  Snackbar,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import SidebarAll from '../SidebarAll/SidebarAll';

// 自定义样式组件
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginTop: theme.spacing(4),
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  width: '100%',
  maxWidth: 800
}));

const WideFormControl = styled(FormControl)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  marginBottom: theme.spacing(3)
}));

const Setting = () => {
  const [settings, setSettings] = useState({
    theme_mode: 'light'
  });
  
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 创建动态主题
  const theme = useMemo(() => createTheme({
    palette: {
      mode: settings.theme_mode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease',
          },
        },
      },
    },
  }), [settings.theme_mode]);

  // 加载用户现有设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // 只保留主题模式设置
        setSettings({ theme_mode: res.data.theme_mode || 'light' });
      } catch (error) {
        console.error('获取设置失败:', error);
        setSnackbar({
          open: true,
          message: '获取设置失败',
          severity: 'error'
        });
      }
    };
    fetchSettings();
  }, []);

  // 保存设置
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/user/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSnackbar({
        open: true,
        message: '设置已保存！',
        severity: 'success'
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      setSnackbar({
        open: true,
        message: '保存设置失败，请重试',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleThemeModeChange = (mode) => {
    setSettings({ ...settings, theme_mode: mode });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <SidebarAll />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
          <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                mt: 2, 
                mb: 4,
                fontWeight: 600,
                color: 'primary.main'
              }}>
                个性化设置
              </Typography>
              
              <StyledPaper>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                    界面样式设置
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  {/* 主题模式设置 */}
                  <WideFormControl>
                    <InputLabel>主题模式</InputLabel>
                    <Select
                      value={settings.theme_mode}
                      label="主题模式"
                      onChange={(e) => handleThemeModeChange(e.target.value)}
                    >
                      <MenuItem value="light">浅色模式</MenuItem>
                      <MenuItem value="dark">深色模式</MenuItem>
                    </Select>
                  </WideFormControl>
                </Box>

                {/* 保存按钮 */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button 
                    variant="contained" 
                    onClick={handleSave}
                    size="large"
                    sx={{ 
                      px: 4, 
                      py: 1,
                      fontSize: '1.1rem',
                      borderRadius: '8px'
                    }}
                  >
                    保存设置
                  </Button>
                </Box>
              </StyledPaper>
            </Box>
          </Container>

          {/* 提示消息 */}
          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={4000} 
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity}
              sx={{ width: '100%' }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Setting;