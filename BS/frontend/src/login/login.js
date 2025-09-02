import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Alert,
  Link,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Refresh,
  AccountCircle,
  Lock,
  Email,
  Phone,
  LocationOn
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
  },
});

function Login() {
  // 登录状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 验证码状态
  const [captcha, setCaptcha] = useState({
    imgUrl: '',
    userAnswer: ''
  });
  const [showCaptcha, setShowCaptcha] = useState(false);
  
  // 注册状态
  const [registerData, setRegisterData] = useState({
    username: '',
    account: '',
    password: '',
    confirmPassword: '',
    email: '',
    address: '',
    phone: '',
    captchaAnswer: ''
  });

  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  // 页面加载时从localStorage读取保存的账号
  useEffect(() => {
    document.title = "登录 - 联源电气智能监控系统";
    const savedAccount = localStorage.getItem('savedAccount');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedAccount && savedPassword) {
      setAccount(savedAccount);
      setPassword(savedPassword);
      setRememberPassword(true);
    }

    // 注册页面默认显示验证码
    if (isRegistering) {
      fetchCaptcha();
    }
  }, [isRegistering]);

  // 获取验证码
  const fetchCaptcha = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/captcha');
      setCaptcha({
        imgUrl: response.data.imgUrl,
        userAnswer: ''
      });
      setShowCaptcha(true);

      // 清空注册表单中的验证码答案
      if (isRegistering) {
        setRegisterData(prev => ({
          ...prev,
          captchaAnswer: ''
        }));
      }
    } catch (error) {
      setError('获取验证码失败，请重试');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!account || !password) {
      setError('账号和密码不能为空');
      return;
    }

    if (showCaptcha && !captcha.userAnswer) {
      setError('请输入验证码');
      return;
    }

    try {
      // 验证验证码
      if (showCaptcha) {
        try {
          const verifyRes = await axios.post('http://localhost:5000/api/verify-captcha', {
            imgUrl: captcha.imgUrl,
            userAnswer: captcha.userAnswer
          });

          if (!verifyRes.data.success) {
            setError('验证码错误，已自动刷新');
            await fetchCaptcha();
            return;
          }
        } catch (verifyError) {
          setError('验证码验证失败，已自动刷新');
          await fetchCaptcha();
          return;
        }
      }

      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        { account, password }
      );

      // 存储Token和用户信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // 记住密码处理
      if (rememberPassword) {
        localStorage.setItem('savedAccount', account);
        localStorage.setItem('savedPassword', password);
      } else {
        localStorage.removeItem('savedAccount');
        localStorage.removeItem('savedPassword');
      }

      navigate('/');
    } catch (err) {
      // 账号密码错误或登录失败时刷新验证码
      if (err.response?.status === 401) {
        await fetchCaptcha();
        setError('账号或密码错误，验证码已刷新');
      } else {
        setError(err.response?.data?.error || '登录失败');
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const { username, account, password, confirmPassword, phone, captchaAnswer } = registerData;

    if (!username || !account || !password || !phone || !captchaAnswer) {
      setError('所有必填字段不能为空');
      return;
    }

    if (username.length <= 3) {
      setError('用户名必须大于3位');
      return;
    }

    if (account.length <= 4) {
      setError('账号必须大于5位');
      return;
    }

    if (password.length <= 5) {
      setError('密码必须6位及以上');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号码');
      return;
    }

    try {
      // 验证验证码
      try {
        const verifyRes = await axios.post('http://localhost:5000/api/verify-captcha', {
          imgUrl: captcha.imgUrl,
          userAnswer: captchaAnswer
        });

        if (!verifyRes.data.success) {
          setError('验证码错误，已自动刷新');
          await fetchCaptcha();
          return;
        }
      } catch (verifyError) {
        setError('验证码验证失败，已自动刷新');
        await fetchCaptcha();
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        {
          username,
          account,
          password,
          email: registerData.email,
          address: registerData.address,
          phone
        }
      );

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
    } catch (err) {
      if (err.response?.status === 400) {
        await fetchCaptcha();
        setError(err.response?.data?.error || '注册失败，验证码已刷新');
      } else {
        setError(err.response?.data?.error || '注册失败');
      }
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleForgotPassword = () => {
    alert('忘记密码功能待实现');
  };

  const toggleRegister = (e) => {
    e.preventDefault();
    setIsRegistering(!isRegistering);
    setError('');
    if (!isRegistering) {
      fetchCaptcha();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={8}
            sx={{
              padding: 4,
              borderRadius: 2,
              background: 'white'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
              {isRegistering ? '用户注册' : '欢迎登陆'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {isRegistering ? (
              <Box component="form" onSubmit={handleRegister}>
                <TextField
                  fullWidth
                  label="用户名"
                  name="username"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  helperText="用户名必须3位及以上"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="账号"
                  name="account"
                  value={registerData.account}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  helperText="账号必须5位及以上"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="密码"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  helperText="密码必须6位及以上"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="确认密码"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="手机号"
                  name="phone"
                  value={registerData.phone}
                  onChange={handleRegisterChange}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="邮箱"
                  name="email"
                  type="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="地址"
                  name="address"
                  value={registerData.address}
                  onChange={handleRegisterChange}
                  margin="normal"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn />
                      </InputAdornment>
                    ),
                  }}
                />

                {showCaptcha && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        component="img"
                        src={captcha.imgUrl}
                        alt="验证码"
                        onClick={fetchCaptcha}
                        sx={{
                          height: 40,
                          cursor: 'pointer',
                          border: '1px solid #ddd',
                          borderRadius: 1
                        }}
                      />
                      <IconButton onClick={fetchCaptcha} sx={{ ml: 1 }}>
                        <Refresh />
                      </IconButton>
                      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                        看不清？点击刷新
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="验证码"
                      name="captchaAnswer"
                      value={registerData.captchaAnswer}
                      onChange={handleRegisterChange}
                      required
                    />
                  </Box>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                >
                  立即注册
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="账号"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="密码"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {showCaptcha && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box
                        component="img"
                        src={captcha.imgUrl}
                        alt="验证码"
                        onClick={fetchCaptcha}
                        sx={{
                          height: 40,
                          cursor: 'pointer',
                          border: '1px solid #ddd',
                          borderRadius: 1
                        }}
                      />
                      <IconButton onClick={fetchCaptcha} sx={{ ml: 1 }}>
                        <Refresh />
                      </IconButton>
                      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                        看不清？点击刷新
                      </Typography>
                    </Box>
                    <TextField
                      fullWidth
                      label="验证码"
                      value={captcha.userAnswer}
                      onChange={(e) => setCaptcha({
                        ...captcha,
                        userAnswer: e.target.value
                      })}
                      required
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberPassword}
                        onChange={(e) => setRememberPassword(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="记住密码"
                  />
                  <Link
                    href="#"
                    onClick={handleForgotPassword}
                    sx={{ cursor: 'pointer' }}
                  >
                    忘记密码?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{ mt: 3, mb: 2 }}
                >
                  安全登录
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" align="center">
              {isRegistering ? '已有账号? ' : '还没有账号? '}
              <Link
                href="#"
                onClick={toggleRegister}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isRegistering ? '立即登录' : '立即注册'}
              </Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Login;