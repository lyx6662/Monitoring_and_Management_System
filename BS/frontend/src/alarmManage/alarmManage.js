import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const AlarmManage = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    // 检查是否已加载AMap脚本
    if (window.AMap) {
      initializeMap();
      return;
    }

    // 动态加载高德地图JS API
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=79a1feef421ba64a154f8d02ace06066&plugin=AMap.ControlBar,AMap.ToolBar`;
    script.async = true;
    
    script.onerror = () => {
      setMapError('高德地图脚本加载失败，请检查网络连接');
      console.error('AMap script load failed');
    };

    script.onload = () => {
      if (!window.AMap) {
        setMapError('地图库初始化失败');
        return;
      }
      initializeMap();
    };

    document.head.appendChild(script);

    return () => {
      // 清理
      document.head.removeChild(script);
      cleanUpMap();
    };
  }, []);

  const cleanUpMap = () => {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.innerHTML = ''; // 清除地图容器
    }
    // 清除地图相关全局变量
    if (window.AMap) {
      delete window.AMap;
    }
  };

  const initializeMap = () => {
    try {
      const map = new window.AMap.Map('map-container', {
        rotateEnable: true,
        pitchEnable: true,
        zoom: 17,
        pitch: 50,
        rotation: -15,
        viewMode: '3D',
        zooms: [2, 20],
        center: [118.773405, 28.940941] // 衢州联源电气科技有限公司坐标
      });

      // 添加控制条
      new window.AMap.ControlBar({
        position: { right: '10px', top: '10px' }
      }).addTo(map);

      // 添加工具栏
      new window.AMap.ToolBar({
        position: { right: '40px', top: '110px' }
      }).addTo(map);

      // 创建标记
      const marker = new window.AMap.Marker({
        position: [118.773405, 28.940941],
        map: map,
        title: '衢州联源电气科技有限公司',
        icon: new window.AMap.Icon({
          image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
          size: new window.AMap.Size(20, 30),
          imageSize: new window.AMap.Size(20, 30)
        })
      });

      // 添加信息窗口
      const infoWindow = new window.AMap.InfoWindow({
        content: '<div style="padding:5px;color:#333;">衢州联源电气科技有限公司</div>',
        offset: new window.AMap.Pixel(0, -30)
      });
      
      marker.on('click', () => {
        infoWindow.open(map, marker.getPosition());
      });

      setMapLoaded(true);
    } catch (error) {
      console.error('地图初始化错误:', error);
      setMapError('地图初始化失败: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* 侧边栏 */}
      <div>
        <Sidebar />
      </div>

      {/* 主内容区 */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>报警管理</h1>
        <p style={{ marginBottom: '20px' }}>摄像头所在位置: 衢州联源电气科技有限公司</p>
        
        {/* 地图容器 */}
        <div style={{ 
          width: '60%', 
          height: '65%',
          margin: '0 auto',
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {mapError ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'red'
            }}>
              {mapError}
            </div>
          ) : !mapLoaded ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div>地图加载中...</div>
            </div>
          ) : null}
          <div id="map-container" style={{ width: '100%', height: '100%' }}></div>
        </div>

        {/* 其他报警管理内容 */}
        <div style={{ marginTop: '20px' }}>
          {/* 这里可以添加报警列表等其他内容 */}
        </div>
      </div>
    </div>
  );
};

export default AlarmManage;