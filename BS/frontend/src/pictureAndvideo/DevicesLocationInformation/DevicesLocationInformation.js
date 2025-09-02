import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  styled
} from '@mui/material';
import {
  Refresh,
  ErrorOutline
} from '@mui/icons-material';
import Sidebar from '../SidebarVideo/SidebarVideo';
import { useThemeContext } from '../../ThemeContext/ThemeContext';

// 添加样式组件
const MainContent = styled(Box)(({ theme }) => ({
  marginLeft: 20,
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  width: 'calc(70% - 60px)',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  borderRadius: '12px',
  margin: theme.spacing(2),
}));


const MapContainer = styled(Paper)(({ theme }) => ({
  width: '100%',
  height: '65vh',
  position: 'relative',
  overflow: 'hidden',
  // 添加悬浮效果
  boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
}));

const DevicesLocationInformation = () => {
  const { theme } = useThemeContext();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let map;
    let script;
    let retryTimer;
    let isMounted = true;

    const initializeMap = async () => {
      try {
        // 从后端获取地图配置
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/map-config`);
        if (!response.ok) throw new Error('获取地图配置失败');
        const { amapKey, plugins } = await response.json();

        const center = [118.773405, 28.940941];
        if (!isMounted || !document.getElementById('map-container')) return;

        if (!window.AMap?.Map) throw new Error("AMap核心库未就绪");

        map = new window.AMap.Map('map-container', {
          viewMode: '3D',
          center: center,
          zoom: 17,
          pitch: 50,
          rotation: -15
        });

        // 延迟添加插件
        setTimeout(() => {
          if (!isMounted) return;
          try {
            new window.AMap.ControlBar({ position: { right: '10px', top: '10px' } }).addTo(map);
            new window.AMap.ToolBar({ position: { right: '40px', top: '110px' } }).addTo(map);

            // 添加标记
            new window.AMap.Marker({
              position: center,
              map: map,
              icon: new window.AMap.Icon({
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                size: new window.AMap.Size(20, 30)
              })
            });

            setMapLoaded(true);
            setLoading(false);
          } catch (pluginError) {
            console.error('插件加载失败:', pluginError);
            setMapError('地图控件加载异常');
            setLoading(false);
          }
        }, 300);

      } catch (error) {
        console.error('地图初始化异常:', error);
        if (isMounted) {
          setMapError(error.message);
          setLoading(false);
          retryTimer = setTimeout(initializeMap, 1000);
        }
      }
    };

    const loadMapScript = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/map-config`);

        console.log('响应状态:', response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error('响应内容:', text);
          throw new Error(`请求失败: ${response.status}`);
        }

        const data = await response.json();
        console.log('地图配置:', data);

        // 修改这里的检查逻辑
        if (!data.amapKey) {
          throw new Error(data.error || '无效的地图配置');
        }

        // 加载地图脚本
        if (!window.AMap) {
          script = document.createElement('script');
          script.src = `https://webapi.amap.com/maps?v=2.0&key=${data.amapKey}&plugin=${data.plugins}`;
          script.onload = () => setTimeout(initializeMap, 100);
          script.onerror = () => {
            if (isMounted) {
              setMapError('地图脚本加载失败');
              setLoading(false);
            }
          };
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        console.error('获取地图配置失败:', err);
        setMapError('地图服务不可用: ' + err.message);
        setLoading(false);
      }
    };

    loadMapScript();

    return () => {
      isMounted = false;
      clearTimeout(retryTimer);
      if (script) document.head.removeChild(script);
      if (map) {
        try { map.destroy(); } catch (e) { console.warn('地图销毁异常:', e); }
      }
      const container = document.getElementById('map-container');
      if (container) container.innerHTML = '';
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setMapError(null);
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <MainContent component="main">
        {/* 标题部分 - 去除小图标 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 3 // 增加底部间距
          }}>
            设备位置信息
          </Typography>
          
          {/* 位置信息卡片 - 添加悬浮效果 */}
          <Card sx={{ 
            mb: 3,
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body1" sx={{ mr: 2 }}>
                  摄像头所在位置: 
                </Typography>
                <Chip 
                  label="衢州联源电气科技有限公司" 
                  color="primary" 
                  variant="outlined"
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* 地图容器 - 使用新的样式组件 */}
        <MapContainer elevation={3}>
          {mapError ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              p: 3
            }}>
              <ErrorOutline color="error" sx={{ fontSize: 48, mb: 2 }} />
              <Alert 
                severity="error" 
                sx={{ mb: 2, width: '100%', maxWidth: 500 }}
                action={
                  <IconButton
                    aria-label="retry"
                    color="inherit"
                    size="small"
                    onClick={handleRetry}
                  >
                    <Refresh />
                  </IconButton>
                }
              >
                {mapError}
              </Alert>
              <Typography variant="body2" color="text.secondary" align="center">
                请检查网络连接或稍后重试
              </Typography>
            </Box>
          ) : loading ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%' 
            }}>
              <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                地图加载中...
              </Typography>
            </Box>
          ) : null}
          
          <Box 
            id="map-container" 
            sx={{ 
              width: '100%', 
              height: '100%',
              visibility: mapLoaded ? 'visible' : 'hidden',
              borderRadius: '16px' // 添加圆角
            }} 
          />
        </MapContainer>
      </MainContent>
    </Box>
  );
};

export default DevicesLocationInformation;