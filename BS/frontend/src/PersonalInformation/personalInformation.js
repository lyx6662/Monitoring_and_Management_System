import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Snackbar, 
  Alert,
  Divider  // 添加这行
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import '../css/all.css';

function PersonalInformation() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://8.149.241.140:5000/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error('获取用户信息失败');
        }

        const data = await response.json();
        setUserData(data);
      } catch (err) {
        console.error('获取用户信息错误:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    // 验证输入
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setSnackbar({
        open: true,
        message: '所有字段都必须填写',
        severity: 'error'
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setSnackbar({
        open: true,
        message: '新密码长度至少为6位',
        severity: 'error'
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({
        open: true,
        message: '新密码和确认密码不匹配',
        severity: 'error'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://8.149.241.140:5000/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '修改密码失败');
      }

      setSnackbar({
        open: true,
        message: '密码修改成功',
        severity: 'success'
      });
      handleCloseDialog();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">加载中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error">错误: {error}</Alert>
      </Box>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content personal-info-page">
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ 
            mb: 3, 
            fontWeight: 'bold',
            color: '#333'
          }}>
            个人信息
          </Typography>
          
          <Paper elevation={0} sx={{ 
            p: 3, 
            maxWidth: 800,
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)'
          }}>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: '150px 1fr',
              gap: '16px 0',
              alignItems: 'center'
            }}>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                用户ID
              </Typography>
              <Typography variant="body1">{userData?.user_id || '-'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                用户名
              </Typography>
              <Typography variant="body1">{userData?.username || '-'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                账号
              </Typography>
              <Typography variant="body1">{userData?.account || '-'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                邮箱
              </Typography>
              <Typography variant="body1">{userData?.email || '未设置'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                手机号
              </Typography>
              <Typography variant="body1">{userData?.phone || '-'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                地址
              </Typography>
              <Typography variant="body1">{userData?.address || '未设置'}</Typography>
              
              <Divider sx={{ gridColumn: '1 / -1', my: 1 }} />
              
              <Typography variant="subtitle1" sx={{ 
                fontWeight: '500',
                color: '#666'
              }}>
                注册时间
              </Typography>
              <Typography variant="body1">
                {userData?.create_time ? new Date(userData.create_time).toLocaleString() : '-'}
              </Typography>
            </Box>
            
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="contained"
                startIcon={<LockIcon />}
                onClick={handleOpenDialog}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: '6px',
                  textTransform: 'none',
                  fontSize: '1rem',
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1565c0'
                  }
                }}
              >
                修改密码
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* 修改密码对话框 */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ 
            fontWeight: 'bold',
            borderBottom: '1px solid #eee',
            pb: 2
          }}>
            修改密码
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              margin="normal"
              label="当前密码"
              type="password"
              fullWidth
              variant="outlined"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              label="新密码"
              type="password"
              fullWidth
              variant="outlined"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              helperText="至少6个字符"
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              label="确认新密码"
              type="password"
              fullWidth
              variant="outlined"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
            />
          </DialogContent>
          <DialogActions sx={{ 
            p: 3,
            borderTop: '1px solid #eee'
          }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{
                color: '#666',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{
                px: 3,
                textTransform: 'none',
                borderRadius: '4px'
              }}
            >
              确认修改
            </Button>
          </DialogActions>
        </Dialog>

        {/* 消息提示 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ 
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
}

export default PersonalInformation;