import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';
import axios from 'axios';

const DeviceImageAndVideoDisplay = () => {
  // 设备相关状态
  const [devices, setDevices] = useState([]);
  const [selectedDeviceCode, setSelectedDeviceCode] = useState('');
  const [deviceImages, setDeviceImages] = useState([]);
  const [deviceImagePage, setDeviceImagePage] = useState(1);
  const [totalDeviceImagePages, setTotalDeviceImagePages] = useState(1);
  
  // 设备视频相关状态
  const [deviceVideos, setDeviceVideos] = useState([]);
  const [deviceVideoPage, setDeviceVideoPage] = useState(1);
  const [totalDeviceVideoPages, setTotalDeviceVideoPages] = useState(1);
  
  // 报警图片相关状态
  const [alarmImages, setAlarmImages] = useState([]);
  const [alarmImagePage, setAlarmImagePage] = useState(1);
  const [totalAlarmImagePages, setTotalAlarmImagePages] = useState(1);

  // 设备状态和重启相关状态
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isGettingStatus, setIsGettingStatus] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 预览相关状态
  const [previewMedia, setPreviewMedia] = useState({
    url: '',
    type: ''
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const itemsPerPage = 6;

  // 从token获取用户ID
  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch (error) {
      console.error('解析token获取用户ID失败:', error);
      return null;
    }
  };

  // 获取设备列表
  const loadDevices = async () => {
    try {
      setLoading(true);
      const userId = getUserIdFromToken();
      if (!userId) {
        setError('无法获取用户信息，请重新登录');
        return;
      }

      const res = await fetch(`http://116.62.54.160:5000/api/devices?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取设备列表失败');
      }

      const devicesData = await res.json();
      setDevices(devicesData);
      if (devicesData.length > 0) {
        setSelectedDeviceCode(devicesData[0].device_code);
      }
    } catch (err) {
      console.error('加载设备失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取设备图片
  const loadDeviceImages = async (page = 1) => {
    try {
      if (!selectedDeviceCode) return;

      setLoading(true);
      const size = itemsPerPage;
      const res = await fetch(
        `http://116.62.54.160:5000/api/picture/get-by-device-code?deviceCode=${selectedDeviceCode}&page=${page}&size=${size}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取设备图片失败');
      }

      const responseData = await res.json();
      const pictures = responseData.data?.pictures || [];
      const totalCount = responseData.data?.totalCount || 0;

      setDeviceImages(pictures);
      setTotalDeviceImagePages(Math.ceil(totalCount / size));
      setDeviceImagePage(page);
    } catch (err) {
      console.error('加载设备图片失败:', err);
      setError(err.message);
      setDeviceImages([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取设备视频
  const loadDeviceVideos = async (page = 1) => {
    try {
      if (!selectedDeviceCode) return;

      setLoading(true);
      const size = itemsPerPage;
      const res = await fetch(
        `http://116.62.54.160:5000/api/device-video/get-by-device-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            deviceCode: selectedDeviceCode,
            page: page,
            size: size,
            day: ''
          })
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取设备视频失败');
      }

      const responseData = await res.json();
      const videos = responseData.data?.videos || [];
      const totalCount = responseData.data?.totalCount || 0;

      setDeviceVideos(videos);
      setTotalDeviceVideoPages(Math.ceil(totalCount / size));
      setDeviceVideoPage(page);
    } catch (err) {
      console.error('加载设备视频失败:', err);
      setError(err.message);
      setDeviceVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取报警图片
  const loadAlarmImages = async (page = 1) => {
    try {
      setLoading(true);
      const size = itemsPerPage;
      
      const res = await fetch(
        `http://116.62.54.160:5000/api/alarm/query-early-alarm?page=${page}&size=${size}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取报警图片失败');
      }

      const responseData = await res.json();
      const alarms = responseData.data?.alarms || [];
      const totalCount = responseData.data?.totalCount || 0;

      const formattedAlarms = alarms.map(alarm => ({
        ...alarm,
        url: alarm.alarmImageUrl,
        name: `alarm_${alarm.id}`,
        createdAt: alarm.createdAt || new Date().toISOString()
      }));

      setAlarmImages(formattedAlarms);
      setTotalAlarmImagePages(Math.ceil(totalCount / size));
      setAlarmImagePage(page);
    } catch (err) {
      console.error('加载报警图片失败:', err);
      setError(err.message);
      setAlarmImages([]);
    } finally {
      setLoading(false);
    }
  };

  // 设备抓拍
  const handleDeviceSnap = async () => {
    if (!selectedDeviceCode) {
      setError('请先选择设备');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://116.62.54.160:5000/api/hub/device-snap-by-device-code?deviceCode=${selectedDeviceCode}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '抓拍失败');
      }

      setSuccess('设备抓拍成功');
      setTimeout(() => setSuccess(''), 2000);
      loadDeviceImages(deviceImagePage);
    } catch (err) {
      console.error('抓拍失败:', err);
      setError('抓拍失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取设备状态
  const handleGetDeviceStatus = async () => {
    if (!selectedDeviceCode) {
      setError('请先选择设备');
      return;
    }

    try {
      setIsGettingStatus(true);
      const response = await fetch(
        `http://116.62.54.160:5000/api/device-params/get-by-device-code?code=${selectedDeviceCode}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取设备状态失败');
      }

      const result = await response.json();
      setDeviceStatus(result.data || result);
      setShowStatusModal(true);
    } catch (err) {
      console.error('获取设备状态失败:', err);
      setError('获取设备状态失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGettingStatus(false);
    }
  };

  // 设备重启
  const handleDeviceRestart = async () => {
    if (!selectedDeviceCode) {
      setError('请先选择设备');
      return;
    }

    if (!window.confirm('确定要重启该设备吗？此操作可能导致设备暂时离线。')) {
      return;
    }

    try {
      setIsRestarting(true);
      const response = await fetch(
        `http://116.62.54.160:5000/api/device/restart?deviceCode=${selectedDeviceCode}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '设备重启失败');
      }

      setSuccess('设备重启指令已发送，请等待设备重启');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('设备重启失败:', err);
      setError('设备重启失败: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsRestarting(false);
    }
  };

  // 格式化设备状态
  const formatDeviceStatus = (status) => {
    const translations = {
      firmwareVersion: '固件版本',
      batteryType: '电池类型',
      hasDegradedCapacitance: '电容是否老化',
      currentTime: '当前时间',
      batteryPower: '电池电量',
      batteryVoltage: '电池电压',
      chargingVoltage: '充电电压',
      solarPanelVoltage: '太阳能板电压',
      superCapacitorVoltage: '超级电容电压',
      icharge: '充电电流',
      iload: '负载电流',
      vcharge: '充电电压',
      tempEnv: '环境温度',
      tempCpu: 'CPU温度',
      signal: '信号强度',
      storageAvail: '可用存储',
      controlBoardOperatingMode: '控制板工作模式',
      floatStatus: '浮动状态'
    };

    const formatValue = (key, value) => {
      switch (key) {
        case 'batteryPower':
          return `${value}%`;
        case 'signal':
          return `${value}/5 格`;
        case 'hasDegradedCapacitance':
          return value === '无' ? '否' : value;
        default:
          return value;
      }
    };

    return Object.entries(status).reduce((acc, [key, value]) => {
      const chineseKey = translations[key] || key;
      acc[chineseKey] = formatValue(key, value);
      return acc;
    }, {});
  };

  // 打开媒体预览
  const openMediaPreview = (url, type) => {
    setPreviewMedia({ url, type });
    setIsPreviewOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭媒体预览
  const closeMediaPreview = () => {
    setIsPreviewOpen(false);
    setPreviewMedia({ url: '', type: '' });
    document.body.style.overflow = 'auto';
  };

  // 组件挂载时加载设备列表
  useEffect(() => {
    loadDevices();
  }, []);

  // 当选中设备变化时，重新加载图片和视频
  useEffect(() => {
    if (selectedDeviceCode) {
      loadDeviceImages(1);
      loadDeviceVideos(1);
      loadAlarmImages(1);
    }
  }, [selectedDeviceCode]);

  // 获取当前页的设备图片
  const getCurrentPageDeviceImages = () => {
    if (!Array.isArray(deviceImages)) return [];
    const startIndex = (deviceImagePage - 1) * itemsPerPage;
    return deviceImages.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的设备视频
  const getCurrentPageDeviceVideos = () => {
    if (!Array.isArray(deviceVideos)) return [];
    const startIndex = (deviceVideoPage - 1) * itemsPerPage;
    return deviceVideos.slice(startIndex, startIndex + itemsPerPage);
  };

  // 获取当前页的报警图片
  const getCurrentPageAlarmImages = () => {
    if (!Array.isArray(alarmImages)) return [];
    const startIndex = (alarmImagePage - 1) * itemsPerPage;
    return alarmImages.slice(startIndex, startIndex + itemsPerPage);
  };

  // 渲染设备图片区域
  const renderDeviceImageSection = () => {
    const currentImages = getCurrentPageDeviceImages();
    return (
      <div className="files-section">
        <h2>设备图片</h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center' }}>
          <div className="device-selector">
            <select
              value={selectedDeviceCode}
              onChange={(e) => setSelectedDeviceCode(e.target.value)}
              disabled={loading || devices.length === 0}
            >
              {devices.length === 0 ? (
                <option value="">无可用设备</option>
              ) : (
                devices.map((device) => (
                  <option key={device.device_id} value={device.device_code}>
                    {device.device_name} ({device.device_code})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            className="snap-button"
            onClick={handleDeviceSnap}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
          >
            {loading ? '抓拍中...' : '设备抓拍'}
          </button>

          <button
            className="status-button"
            onClick={handleGetDeviceStatus}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
          >
            {isGettingStatus ? '获取中...' : '设备状态'}
          </button>

          <button
            className="restart-button"
            onClick={handleDeviceRestart}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
          >
            {isRestarting ? '重启中...' : '设备重启'}
          </button>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : currentImages.length === 0 ? (
          <p>没有设备图片</p>
        ) : (
          <div className="files-horizontal">
            {currentImages.map((file, index) => (
              <div key={index} className="file-card image-card">
                <img
                  src={file.url}
                  alt={file.path}
                  style={{
                    width: '200px',
                    height: '150px',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => openMediaPreview(file.url, 'image')}
                />
                <div className="file-info">
                  <div className="file-meta">
                    <span>拍摄时间: {file.createdAt}</span>
                    <span>抓拍类型: {file.snapType === 'manual-snap' ? '手动抓拍' : '自动抓拍'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalDeviceImagePages > 1 && (
          <div className="pagination">
            {[...Array(totalDeviceImagePages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadDeviceImages(i + 1)}
                className={deviceImagePage === i + 1 ? "active-page" : ""}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染设备视频区域
  const renderDeviceVideoSection = () => {
    const currentVideos = getCurrentPageDeviceVideos();
    return (
      <div className="files-section">
        <h2>设备视频</h2>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : currentVideos.length === 0 ? (
          <p>没有设备视频</p>
        ) : (
          <div className="files-horizontal">
            {currentVideos.map((video, index) => (
              <div key={index} className="file-card video-card">
                <video
                  src={video.url}
                  style={{
                    width: '200px',
                    height: '150px',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => openMediaPreview(video.url, 'video')}
                />
                <div className="file-info">
                  <div className="file-meta">
                    <span>录制时间: {video.createdAt}</span>
                    <span>状态: {video.status === '1' ? '正常' : '异常'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalDeviceVideoPages > 1 && (
          <div className="pagination">
            {[...Array(totalDeviceVideoPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadDeviceVideos(i + 1)}
                className={deviceVideoPage === i + 1 ? "active-page" : ""}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染报警图片区域
  const renderAlarmImageSection = () => {
    const currentImages = getCurrentPageAlarmImages();
    return (
      <div className="files-section">
        <h2>报警图片</h2>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : currentImages.length === 0 ? (
          <p>没有报警图片</p>
        ) : (
          <div className="files-horizontal">
            {currentImages.map((file, index) => (
              <div key={index} className="file-card image-card">
                <img
                  src={file.url}
                  alt={file.name || file.id}
                  style={{
                    width: '200px',
                    height: '150px',
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                  onClick={() => openMediaPreview(file.url, 'image')}
                />
                <div className="file-info">
                  <div className="file-meta">
                    <span>报警时间: {file.createdAt}</span>
                    {file.alarmType && <span>报警类型: {file.alarmType}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalAlarmImagePages > 1 && (
          <div className="pagination">
            {[...Array(totalAlarmImagePages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadAlarmImages(i + 1)}
                className={alarmImagePage === i + 1 ? "active-page" : ""}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <div className="main-content">
        <h1>报警分析</h1>
        
        {/* 设备图片区域 */}
        {renderDeviceImageSection()}
        
        {/* 设备视频区域 */}
        {renderDeviceVideoSection()}
        
        {/* 报警图片区域 */}
        {renderAlarmImageSection()}
      </div>

      {/* 媒体预览模态框 */}
      {isPreviewOpen && (
        <div className="media-preview-modal" onClick={closeMediaPreview}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={closeMediaPreview}>×</button>
            
            {previewMedia.type === 'image' && (
              <img
                src={previewMedia.url}
                alt="预览图"
                className="preview-media"
              />
            )}
            
            {previewMedia.type === 'video' && (
              <video
                src={previewMedia.url}
                className="preview-media"
                controls
                autoPlay
                playsInline
              />
            )}
          </div>
        </div>
      )}

      {/* 设备状态弹窗 */}
      {showStatusModal && (
        <div className="media-preview-modal" onClick={() => setShowStatusModal(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview" onClick={() => setShowStatusModal(false)}>×</button>
            
            <h3 className="status-modal-title">设备状态信息</h3>
            
            <div className="status-content">
              {deviceStatus ? (
                <div className="status-grid">
                  {Object.entries(formatDeviceStatus(deviceStatus)).map(([key, value]) => (
                    <div key={key} className="status-item">
                      <span className="status-key">{key}：</span>
                      <span className="status-value">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>未获取到设备状态数据</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceImageAndVideoDisplay;