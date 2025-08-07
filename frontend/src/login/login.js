import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Add validation for registration
    if (isRegistering) {
      if (username.length <= 5) {
        setError('用户名必须大于5位');
        return;
      }
      if (password.length <= 5) {
        setError('密码必须大于5位');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }

    const endpoint = isRegistering 
      ? '/api/auth/register' 
      : '/api/auth/login';



    try {
    const response = await axios.post(
      `http://localhost:5000${endpoint}`, 
      { username, password },
    );
    
    // 存储Token
    localStorage.setItem('token', response.data.token);
    
    // 设置1小时后自动清除token
    setTimeout(() => {
      localStorage.removeItem('token');
      navigate('/login');
    }, 60 * 60 * 1000); // 1小时
    
    // 跳转到首页
    navigate('/');
  } catch (err) {
    setError(err.response?.data?.error || 
      (isRegistering ? '注册失败' : '登录失败'));
  }
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? '用户注册' : '系统登录'}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>用户名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {isRegistering && <small>用户名必须大于5位</small>}
        </div>
        <div className="form-group">
          <label>密码:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {isRegistering && <small>密码必须大于5位</small>}
        </div>
        {isRegistering && (
          <div className="form-group">
            <label>确认密码:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}
        <button type="submit">
          {isRegistering ? '注册' : '登录'}
        </button>
      </form>
      <button 
        type="button" 
        className="toggle-button"
        onClick={() => {
          setIsRegistering(!isRegistering);
          setError('');
          setConfirmPassword('');
        }}
      >
        {isRegistering ? '已有账号？登录' : '没有账号？注册'}
      </button>
    </div>
  );
}

export default Login;