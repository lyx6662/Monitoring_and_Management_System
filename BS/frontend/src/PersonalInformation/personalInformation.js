import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  Divider,
  IconButton,
  Avatar,
  Grid,
  Card,
  CardContent,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Event as EventIcon,
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useThemeContext } from '../ThemeContext/ThemeContext'; // 导入全局主题上下文
import SidebarAll from '../SidebarAll/SidebarAll';
const API_URL = process.env.REACT_APP_API_BASE_URL;

function PersonalInformation() {
  const navigate = useNavigate();
  const { theme } = useThemeContext(); // 使用全局主题上下文
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
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
        const response = await fetch(`${API_URL}/user/profile`, {
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

  const handleEditClick = (field, value) => {
    setEditField(field);
    setEditValue(value || '');
  };

  const handleEditCancel = () => {
    setEditField(null);
    setEditValue('');
  };

  const handleEditSave = async () => {
    if (!editField || !userData) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/user/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          [editField]: editValue
        })
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      setUserData({
        ...userData,
        [editField]: editValue
      });

      setSnackbar({
        open: true,
        message: '更新成功',
        severity: 'success'
      });

      handleEditCancel();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || '更新失败',
        severity: 'error'
      });
    }
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
      const response = await fetch(`${API_URL}/user/change-password`, {
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
        <CircularProgress />
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

  // 可编辑字段配置
  const editableFields = [
    { key: 'username', label: '用户名', icon: <PersonIcon /> },
    { key: 'email', label: '邮箱', icon: <EmailIcon /> },
    { key: 'phone', label: '手机号', icon: <PhoneIcon /> },
    { key: 'address', label: '地址', icon: <LocationIcon /> }
  ];

  // 不可编辑字段
  const nonEditableFields = [
    { key: 'user_id', label: '用户ID', icon: <VpnKeyIcon /> },
    { key: 'account', label: '账号', icon: <PersonIcon /> },
    {
      key: 'create_time',
      label: '注册时间',
      icon: <EventIcon />,
      value: userData?.create_time ? new Date(userData.create_time).toLocaleString() : '-'
    }
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <SidebarAll />
      <div
        className="main-content personal-info-page"
        style={{
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{
            mb: 4,
            fontWeight: 'bold',
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <PersonIcon /> 个人信息
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                textAlign: 'center',
                p: 3,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary
              }}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem'
                  }}
                >
                  {userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {userData.username || '未设置'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {userData.account}
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={handleOpenDialog}
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  修改密码
                </Button>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                backgroundColor: theme.palette.background.paper
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VpnKeyIcon /> 账户信息
                  </Typography>


                  {/* 可编辑字段 */}
                  {editableFields.map((field) => (
                    <React.Fragment key={field.key}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 2
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          width: 150,
                          color: 'text.secondary',
                          flexShrink: 0
                        }}>
                          {field.icon}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {field.label}
                          </Typography>
                        </Box>

                        {editField === field.key ? (
                          <TextField
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ maxWidth: 300, mr: 2 }}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={handleEditSave}
                                    color="primary"
                                    size="small"
                                  >
                                    <CheckCircleIcon />
                                  </IconButton>
                                  <IconButton
                                    onClick={handleEditCancel}
                                    size="small"
                                  >
                                    <Typography variant="body2">取消</Typography>
                                  </IconButton>
                                </InputAdornment>
                              )
                            }}
                          />
                        ) : (
                          <Typography variant="body1" sx={{ flexGrow: 1 }}>
                            {userData[field.key] || '未设置'}
                          </Typography>
                        )}

                        {editField !== field.key && (
                          <IconButton
                            onClick={() => handleEditClick(field.key, userData[field.key])}
                            sx={{
                              color: 'primary.main',
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'white'
                              }
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </Box>
                      <Divider />
                    </React.Fragment>
                  ))}
                  {/* 不可编辑字段 */}
                  {nonEditableFields.map((field) => (
                    <React.Fragment key={field.key}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 2
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          width: 150,
                          color: 'text.secondary',
                          flexShrink: 0
                        }}>
                          {field.icon}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {field.label}
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ flexGrow: 1 }}>
                          {field.value || userData[field.key] || '-'}
                        </Typography>
                        <Button
                          disabled
                          variant="outlined"
                          size="small"
                          sx={{
                            color: theme.palette.mode === 'dark' ? 'grey.400' : 'text.disabled',
                            borderColor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.300',
                            backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                            borderRadius: 2,
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
                            }
                          }}
                        >
                          不可修改
                        </Button>
                      </Box>
                      <Divider />
                    </React.Fragment>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* 修改密码对话框 */}
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: theme.palette.background.paper
            }
          }}
        >
          <DialogTitle sx={{
            fontWeight: 'bold',
            backgroundColor: 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <LockIcon /> 修改密码
          </DialogTitle>
          <DialogContent sx={{ pt: 3, pb: 2 }}>
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
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none'
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                px: 3,
                borderRadius: 2,
                textTransform: 'none'
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2,
              alignItems: 'center'
            }}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </Box>
  );
}

export default PersonalInformation;