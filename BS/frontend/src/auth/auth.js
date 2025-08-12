// src/auth/auth.js
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasLoggedNoToken = useRef(false); // 新增：用于跟踪是否已打印无token消息

  // 检查 token 是否有效（包括过期时间）
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (!hasLoggedNoToken.current) {
        console.log('当前没有有效的token');
        hasLoggedNoToken.current = true;
      }
      return false;
    }
    
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      const isExpired = decoded.exp * 1000 < Date.now();
      if (isExpired) {
        if (!hasLoggedNoToken.current) {
          console.log('Token已过期');
          hasLoggedNoToken.current = true;
        }
        localStorage.removeItem('token');
        return false;
      }
      hasLoggedNoToken.current = false; // 重置标志，因为现在有有效token
      return true;
    } catch (e) {
      if (!hasLoggedNoToken.current) {
        console.error('解析token失败:', e);
        hasLoggedNoToken.current = true;
      }
      localStorage.removeItem('token');
      return false;
    }
  };

  useEffect(() => {
    const logTokenRemainingTime = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!hasLoggedNoToken.current) {
          console.log('当前没有有效的token');
          hasLoggedNoToken.current = true;
        }
        return;
      }

      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = decoded.exp * 1000; // 转换为毫秒
        const currentTime = Date.now();
        const remainingTime = expirationTime - currentTime;

        if (remainingTime <= 0) {
          if (!hasLoggedNoToken.current) {
            console.log('Token已过期');
            hasLoggedNoToken.current = true;
          }
          localStorage.removeItem('token');
          return;
        }

        // 将毫秒转换为更易读的格式
        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        console.log(`Token剩余时间: ${minutes}分${seconds}秒`);
        hasLoggedNoToken.current = false; // 重置标志，因为现在有有效token
      } catch (e) {
        if (!hasLoggedNoToken.current) {
          console.error('解析token失败:', e);
          hasLoggedNoToken.current = true;
        }
        localStorage.removeItem('token');
      }
    };

    // 设置定时器，每60秒打印一次token剩余时间
    const timer = setInterval(logTokenRemainingTime, 60000);
    
    const isAuthenticated = checkAuth();
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }

    // 清除定时器
    return () => clearInterval(timer);
  }, [navigate, location]);

  return {
    isAuthenticated: checkAuth(),
  };
};

export const checkTokenExpiration = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return decoded.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};