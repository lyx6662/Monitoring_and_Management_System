import React, { useEffect, useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import '../css/all.css';

const AlarmManage = () => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    let map;
    let script;
    let retryTimer;
    let isMounted = true;

    const initializeMap = async () => {
      try {
        // 从后端获取地图配置
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://116.62.54.160.140:5000';
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
          } catch (pluginError) {
            console.error('插件加载失败:', pluginError);
            setMapError('地图控件加载异常');
          }
        }, 300);

      } catch (error) {
        console.error('地图初始化异常:', error);
        if (isMounted) {
          setMapError(error.message);
          retryTimer = setTimeout(initializeMap, 1000);
        }
      }
    };

    const loadMapScript = async () => {
      try {
        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://116.62.54.160.140:5000';
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
          script.onerror = () => isMounted && setMapError('地图脚本加载失败');
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        console.error('获取地图配置失败:', err);
        setMapError('地图服务不可用: ' + err.message);
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, padding: '20px' }}>
        <h1>报警管理</h1>
        <p>摄像头所在位置: 衢州联源电气科技有限公司</p>

        <div style={{ width: '60%', height: '65%', margin: '0 auto', border: '1px solid #ddd' }}>
          {mapError ? (
            <div style={{ color: 'red', textAlign: 'center', paddingTop: '50%' }}>
              {mapError}
            </div>
          ) : !mapLoaded ? (
            <div style={{ textAlign: 'center', paddingTop: '50%' }}>
              地图加载中...
            </div>
          ) : null}
          <div id="map-container" style={{ width: '100%', height: '100%' }} />
        </div>
      </div>
    </div>
  );
};

export default AlarmManage;