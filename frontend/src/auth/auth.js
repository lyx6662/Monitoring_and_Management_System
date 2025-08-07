// src/auth/auth.js
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [navigate, location]);

  return {
    isAuthenticated: !!localStorage.getItem('token'), // 返回认证状态
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