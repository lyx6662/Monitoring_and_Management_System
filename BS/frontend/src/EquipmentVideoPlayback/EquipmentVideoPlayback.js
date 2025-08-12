import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const EquipmentVideoPlayback = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [hlsSupported, setHlsSupported] = useState(false);
  const [hlsPlayer, setHlsPlayer] = useState(null);
  const [username, setUsername] = useState('');
  const videoRef = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 从token获取用户信息
  useEffect(() => {
    const getUsernameFromToken = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          return;
        }
        setUsername(decoded.username || decoded.userId || '用户');
      } catch (e) {
        console.error('解析token失败:', e);
      }
    };

    getUsernameFromToken();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('http://3.85.80.40:5000/api/devices');
        if (!response.ok) {
          throw new Error('获取设备列表失败');
        }
        const data = await response.json();
        setDevices(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // 加载 hls.js
    const loadHlsJs = () => {
      if (window.Hls) {
        setHlsSupported(window.Hls.isSupported());
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      script.async = true;
      script.onload = () => {
        setHlsSupported(window.Hls.isSupported());
      };
      script.onerror = () => {
        console.error('Failed to load HLS.js');
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    };

    loadHlsJs();

    return () => {
      if (hlsPlayer) {
        hlsPlayer.destroy();
        setHlsPlayer(null);
      }
    };
  }, []);

  useEffect(() => {
    if (currentStream && videoRef.current) {
      setIsVideoReady(true);
    } else {
      setIsVideoReady(false);
    }
  }, [currentStream]);

  const playStream = (url, device) => {
    setCurrentStream(url);
    setCurrentDevice(device);
  };

  // 初始化 HLS 播放器
  useEffect(() => {
    if (!isVideoReady || !currentStream || !hlsSupported) return;

    if (hlsPlayer) {
      hlsPlayer.destroy();
      setHlsPlayer(null);
    }

    const hls = new window.Hls();
    setHlsPlayer(hls);

    hls.loadSource(currentStream);
    hls.attachMedia(videoRef.current);
    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      videoRef.current.play().catch(e => {
        console.error('自动播放失败:', e);
      });
    });

    hls.on(window.Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('HLS播放错误:', data.type, data.details);
        switch (data.type) {
          case window.Hls.ErrorTypes.NETWORK_ERROR:
            console.error('网络错误，请检查流地址或网络连接');
            break;
          case window.Hls.ErrorTypes.MEDIA_ERROR:
            console.error('媒体错误，尝试恢复...');
            hls.recoverMediaError();
            break;
          default:
            console.error('无法恢复的错误');
            hls.destroy();
            break;
        }
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [isVideoReady, currentStream, hlsSupported]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">错误: {error}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <h1>设备视频播放</h1>

        <div className="video-container" style={{ display: currentStream ? 'block' : 'none' }}>
          <h2>
            当前播放: {username && `${username} - `}
            {currentDevice ? currentDevice.device_name : '无设备'}
          </h2>
          <video
            ref={videoRef}
            controls
            width="800"
            style={{ maxWidth: '100%' }}
            key={currentStream}
          ></video>
          {!hlsSupported && (
            <div className="hls-warning">
              当前浏览器不支持HLS播放，请使用Chrome/Firefox/Edge等现代浏览器
            </div>
          )}
        </div>

        {!currentStream && (
          <div className="no-stream">请从下方列表中选择一个流进行播放</div>
        )}

        <div className="device-streams">
          <h2>设备流地址列表</h2>

          <table className="stream-table">
            <thead>
              <tr>
                <th>设备ID</th>
                <th>设备名称</th>
                <th>推流地址</th>
                <th>播流地址</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <tr key={device.device_id}>
                  <td>{device.device_id}</td>
                  <td>{device.device_name}</td>
                  {/* 修改：将推流地址的a标签改为普通span标签 */}
                  <td className="url-cell">
                    <span className="disabled-link">{device.push_url}</span>
                  </td>
                  {/* 修改：将播流地址的a标签改为普通span标签 */}
                  <td className="url-cell">
                    <span className="disabled-link">{device.pull_url}</span>
                  </td>
                  <td className={device.status ? 'online' : 'offline'}>
                    {device.status ? '在线' : '离线'}
                  </td>
                  <td>
                    <button
                      onClick={() => playStream(device.pull_url, device)}
                      disabled={!device.status || !hlsSupported || device.pull_url === "播流地址还没开放"}
                    >
                      播放
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EquipmentVideoPlayback;
