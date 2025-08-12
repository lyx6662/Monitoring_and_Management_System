// src/PersonalInformation/personalInformation.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function PersonalInformation() {
  const navigate = useNavigate();

  // 从 token 中获取用户信息
  const getUserInfo = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // 如果没有 token，重定向到登录页
      navigate('/login');
      return null;
    }

    try {
      // 解析 JWT token
      const decoded = JSON.parse(atob(token.split('.')[1]));
      
      // 检查 token 是否过期
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        navigate('/login');
        return null;
      }

      return {
        userId: decoded.userId || decoded.id,
        // username: decoded.username // 注意：需要在后端 JWT 中包含 username
      };
    } catch (e) {
      console.error('解析 token 失败:', e);
      localStorage.removeItem('token');
      navigate('/login');
      return null;
    }
  };

  const userInfo = getUserInfo();

  if (!userInfo) {
    return null; // 正在重定向到登录页
  }

  return (
    <div className="personal-info-container">
      
      <h2>个人信息</h2>
      <div className="info-item">
        <span className="info-label">用户ID:</span>
        <span className="info-value">{userInfo.userId}</span>
      </div>
      {/* <div className="info-item">
        <span className="info-label">账号:</span>
        <span className="info-value">{userInfo.username}</span>
      </div> */}
    </div>
  );
}

export default PersonalInformation;