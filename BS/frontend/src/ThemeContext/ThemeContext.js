// ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

const API_URL = process.env.REACT_APP_API_BASE_URL;


const ThemeContext = createContext();

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // 从服务器加载用户主题设置
  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await fetch(`${API_URL}/user/settings`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.ok) {
            const data = await res.json();
            setThemeMode(data.theme_mode || 'light');
          }
        }
      } catch (error) {
        console.error('加载用户主题设置失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, []);

  // 创建MUI主题
  const theme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: themeMode === 'dark' ? '#121212' : '#f5f5f5',
      },
    },
    typography: {
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
  });

  // 更新主题
  const updateThemeMode = async (newMode) => {
    setThemeMode(newMode);
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_URL}/user/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ theme_mode: newMode })
        });
      }
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  };

  const value = {
    themeMode,
    theme,
    updateThemeMode,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};