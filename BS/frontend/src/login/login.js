import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/all.css';

function Login() {
  // 登录状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

  // 注册状态
  const [registerData, setRegisterData] = useState({
    username: '',
    account: '',
    password: '',
    confirmPassword: '',
    email: '',
    address: '',
    phone: ''
  });

  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  // 页面加载时从localStorage读取保存的账号（如果勾选了记住密码）
  useEffect(() => {
    const savedAccount = localStorage.getItem('savedAccount');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedAccount && savedPassword) {
      setAccount(savedAccount);
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!account || !password) {
      setError('账号和密码不能为空');
      return;
    }

    try {
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

      // 跳转到首页
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // 表单验证
    const { username, account, password, confirmPassword, phone } = registerData;

    if (!username || !account || !password || !phone) {
      setError('必填字段不能为空');
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
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        registerData
      );

      // 存储Token和用户信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // 跳转到首页
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败');
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
    // 这里可以添加忘记密码的处理逻辑
    alert('忘记密码功能待实现');
  };

  return (
    <div className="blue-background">
      <div className="login-container">
        <h2 className="login-title">{isRegistering ? '用户注册' : '欢迎登陆'}</h2>

        {error && <div className="error-message">{error}</div>}

        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              name="username"
              className="login-username"
              placeholder="用户名必须3位及以上"
              value={registerData.username}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="text"
              name="account"
              className="login-username"
              placeholder="账号必须5位及以上"
              value={registerData.account}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="password"
              name="password"
              className="login-password"
              placeholder="密码必须6位及以上"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="password"
              name="confirmPassword"
              className="login-password"
              placeholder="确认密码"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="tel"
              name="phone"
              className="login-username"
              placeholder="手机号"
              value={registerData.phone}
              onChange={handleRegisterChange}
              required
            />

            <input
              type="email"
              name="email"
              className="login-username"
              placeholder="邮箱 (可选)"
              value={registerData.email}
              onChange={handleRegisterChange}
            />

            <input
              type="text"
              name="address"
              className="login-username"
              placeholder="地址 (可选)"
              value={registerData.address}
              onChange={handleRegisterChange}
            />

            <button type="submit" className="login-btn">
              立即注册
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              className="login-username"
              placeholder="请输入您的账号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            />

            <input
              type="password"
              className="login-password"
              placeholder="请输入您的密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="login-remember">
              <input
                type="checkbox"
                id="remember"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
              />
              <label htmlFor="remember">记住密码</label>
              <a
                href="#"
                className="login-forget"
                onClick={(e) => {
                  e.preventDefault();
                  handleForgotPassword();
                }}
              >
                忘记密码?
              </a>
            </div>

            <button type="submit" className="login-btn">
              安全登录
            </button>
          </form>
        )}

        <p className="login-register">
          {isRegistering
            ? '已有账号? '
            : '还没有账号? '}
          <a
            href="#"
            className="login-link"
            onClick={(e) => {
              e.preventDefault();
              setIsRegistering(!isRegistering);
              setError('');
            }}
          >
            {isRegistering ? '立即登录' : '立即注册'}
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;