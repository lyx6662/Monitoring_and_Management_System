import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/all.css';

function Login() {
  // 登录状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);

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
      const response = await axios.get('http://116.62.54.160.140:5000/api/captcha');
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
          const verifyRes = await axios.post('http://116.62.54.160.140:5000/api/verify-captcha', {
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
        'http://116.62.54.160.140:5000/api/auth/login',
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
        const verifyRes = await axios.post('http://116.62.54.160.140:5000/api/verify-captcha', {
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
        'http://116.62.54.160.140:5000/api/auth/register',
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
    <div className="blue-background">
      <div className="login-container">
        <h2 className="login-title">{isRegistering ? '用户注册' : '欢迎登陆'}</h2>

        {error && <div className="error-message">{error}</div>}

        {isRegistering ? (
          <form onSubmit={handleRegister} className="register-form">
            <div className="form-group">
              <input
                type="text"
                name="username"
                className="login-input"
                placeholder="用户名必须3位及以上"
                value={registerData.username}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                name="account"
                className="login-input"
                placeholder="账号必须5位及以上"
                value={registerData.account}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="password"
                className="login-input"
                placeholder="密码必须6位及以上"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                className="login-input"
                placeholder="确认密码"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="tel"
                name="phone"
                className="login-input"
                placeholder="手机号"
                value={registerData.phone}
                onChange={handleRegisterChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                name="email"
                className="login-input"
                placeholder="邮箱 (可选)"
                value={registerData.email}
                onChange={handleRegisterChange}
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                name="address"
                className="login-input"
                placeholder="地址 (可选)"
                value={registerData.address}
                onChange={handleRegisterChange}
              />
            </div>

            {showCaptcha && (
              <div className="captcha-container">
                <div className="captcha-row">
                  <img
                    src={captcha.imgUrl}
                    alt="验证码"
                    onClick={fetchCaptcha}
                    className="captcha-img"
                  />
                  <span
                    className="refresh-text"
                    onClick={fetchCaptcha}
                  >
                    看不清？点击刷新
                  </span>
                </div>
                <div className="form-group">
                  <span className="captcha-text">{captcha.codeText}</span>
                  <input
                    type="text"
                    name="captchaAnswer"
                    className="captcha-input"
                    placeholder="请输入验证码答案"
                    value={registerData.captchaAnswer}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="login-btn register-btn">
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

            {showCaptcha && (
              <div className="captcha-container">
                <div className="captcha-row">
                  <img
                    src={captcha.imgUrl}
                    alt="验证码"
                    onClick={fetchCaptcha}
                    className="captcha-img"
                  />
                  <span
                    className="refresh-text"
                    onClick={fetchCaptcha}
                  >
                    看不清？点击刷新
                  </span>
                </div>
                <div className="captcha-row">
                  <input
                    type="text"
                    className="captcha-input"
                    placeholder="请输入验证码答案"
                    value={captcha.userAnswer}
                    onChange={(e) => setCaptcha({
                      ...captcha,
                      userAnswer: e.target.value
                    })}
                    required
                  />
                </div>
              </div>
            )}

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
            onClick={toggleRegister}
          >
            {isRegistering ? '立即登录' : '立即注册'}
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;