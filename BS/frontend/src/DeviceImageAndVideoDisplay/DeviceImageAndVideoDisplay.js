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
  const [deviceImageDate, setDeviceImageDate] = useState(''); // 设备图片日期筛选

  // 设备视频相关状态
  const [deviceVideos, setDeviceVideos] = useState([]);
  const [deviceVideoPage, setDeviceVideoPage] = useState(1);
  const [totalDeviceVideoPages, setTotalDeviceVideoPages] = useState(1);
  const [deviceVideoDate, setDeviceVideoDate] = useState(''); // 设备视频日期筛选

  // 报警图片相关状态
  const [alarmImages, setAlarmImages] = useState([]);
  const [alarmImagePage, setAlarmImagePage] = useState(1);
  const [totalAlarmImagePages, setTotalAlarmImagePages] = useState(1);

  // 报警相关状态
  const [selectedImageForAlarm, setSelectedImageForAlarm] = useState(null);
  const [alarmCause, setAlarmCause] = useState('');
  const [alarmLevel, setAlarmLevel] = useState('');
  const [isCreatingAlarm, setIsCreatingAlarm] = useState(false);

  // 引发原因映射表
  const CAUSES_MAPPING = {
    '1': '声爆',
    '2': '烟火',
    '3': '异物入侵',
    '4': '飞鸟入侵',
    '5': '树木生长',
    '6': '异常放电',
    '7': '雷电侦测',
    '8': '大型车辆',
    '9': '杆塔倾斜',
    '10': '人员入侵',
    '11': '鸟巢',
    '12': '吊车',
    '13': '塔吊',
    '14': '翻斗车',
    '15': '推土机',
    '16': '水泥泵车',
    '17': '山火',
    '18': '烟雾',
    '19': '挖掘机',
    '20': '打桩机'
  };

  // 设备状态和重启相关状态
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isGettingStatus, setIsGettingStatus] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  // AI检测相关状态
  const [selectedAlarmImages, setSelectedAlarmImages] = useState([]);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiResults, setAiResults] = useState([]);

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

      const res = await fetch(`http://localhost:5000/api/devices?user_id=${userId}`, {
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
        `http://localhost:5000/api/picture/get-by-device-code?deviceCode=${selectedDeviceCode}&page=${page}&size=${size}&day=${deviceImageDate}`,
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
        `http://localhost:5000/api/device-video/get-by-device-code`,
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
            day: deviceVideoDate
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
        `http://localhost:5000/api/alarm/query-early-alarm?page=${page}&size=${size}`,
        {
          method: 'POST',
          headers: {
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
        `http://localhost:5000/api/hub/device-snap-by-device-code?deviceCode=${selectedDeviceCode}`,
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
        `http://localhost:5000/api/device-params/get-by-device-code?code=${selectedDeviceCode}`,
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
        `http://localhost:5000/api/device/restart?deviceCode=${selectedDeviceCode}`,
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

  // 创建报警
  const handleCreateAlarm = async (image) => {
    if (!alarmCause || !alarmLevel) {
      setError('请选择报警原因和紧急程度');
      return;
    }

    try {
      setIsCreatingAlarm(true);
      setError('');

      const response = await fetch('http://localhost:5000/api/alarm/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          causes: alarmCause,
          level: parseInt(alarmLevel),
          alarmImagePath: image.path,
          deviceCode: selectedDeviceCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建报警失败');
      }

      const result = await response.json();
      setSuccess('报警创建成功');
      setTimeout(() => setSuccess(''), 3000);

      // 重置选择
      setSelectedImageForAlarm(null);
      setAlarmCause('');
      setAlarmLevel('');

    } catch (err) {
      console.error('创建报警失败:', err);
      setError('创建报警失败: ' + err.message);
    } finally {
      setIsCreatingAlarm(false);
    }
  };

  // AI视觉检查函数
  const handleAiVisionCheck = async () => {
    if (selectedAlarmImages.length === 0) {
      setError('请先选择要检测的报警图片');
      return;
    }

    try {
      setIsAiChecking(true);
      setError('');

      // 准备请求数据
      const requestData = {
        images: selectedAlarmImages.map(image => ({
          imageUrl: image.url,
          cause: image.causes // 使用报警图片中的causes字段
        }))
      };

      const response = await fetch('http://localhost:5000/api/ai-vision-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI检测失败');
      }

      const resultData = await response.json();
      setAiResults(resultData.results);
      setSuccess(`AI检测完成，共处理 ${resultData.results.length} 张图片`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('AI检测失败:', err);
      setError('AI检测失败: ' + err.message);
    } finally {
      setIsAiChecking(false);
    }
  };

  // 选择/取消选择报警图片
  const toggleAlarmImageSelection = (image) => {
    setSelectedAlarmImages(prev => {
      const isSelected = prev.some(img => img.id === image.id);
      if (isSelected) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  // 全选/取消全选当前页报警图片
  const toggleSelectAllAlarmImages = () => {
    const currentImages = getCurrentPageAlarmImages();
    if (selectedAlarmImages.length === currentImages.length) {
      setSelectedAlarmImages([]);
    } else {
      setSelectedAlarmImages(currentImages);
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

  // 当日期变化时，重新加载数据（保留当前页码）
  useEffect(() => {
    if (selectedDeviceCode) {
      loadDeviceImages(deviceImagePage);
    }
  }, [deviceImageDate]);

  useEffect(() => {
    if (selectedDeviceCode) {
      loadDeviceVideos(deviceVideoPage);
    }
  }, [deviceVideoDate]);

  // 获取当前页的设备图片 - 修复版本
  const getCurrentPageDeviceImages = () => {
    // 直接返回从 API 获取的当前页数据，不需要再次切片
    return Array.isArray(deviceImages) ? deviceImages : [];
  };

  // 获取当前页的设备视频 - 修复版本
  const getCurrentPageDeviceVideos = () => {
    // 直接返回从 API 获取的当前页数据，不需要再次切片
    return Array.isArray(deviceVideos) ? deviceVideos : [];
  };

  // 获取当前页的报警图片 - 修复版本
  const getCurrentPageAlarmImages = () => {
    // 直接返回从 API 获取的当前页数据，不需要再次切片
    return Array.isArray(alarmImages) ? alarmImages : [];
  };

  // 渲染AI检测结果
  const renderAiResults = () => {
    if (aiResults.length === 0) return null;

    return (
      <div className="ai-results-section">
        <h3>AI检测结果</h3>
        <div className="results-grid">
          {aiResults.map((result, index) => (
            <div key={index} className={`result-card ${result.status === 'error' ? 'error' : result.isAlarmValid ? 'valid' : 'invalid'}`}>
              <div className="result-image">
                <img src={result.imageUrl} alt={`结果-${index}`} />
              </div>
              <div className="result-info">
                <p><strong>引发原因:</strong>
                  {result.cause.split(',').map(cause => {
                    const trimmedCause = cause.trim();
                    return CAUSES_MAPPING[trimmedCause] || `未知(${trimmedCause})`;
                  }).join('、')}
                </p>
                <p><strong>判断结果:</strong>
                  <span className={result.isAlarmValid ? 'result-valid' : 'result-invalid'}>
                    {result.isAlarmValid ? '正确' : '错误'}
                  </span>
                </p>
                {result.newUrl && (
                  <p><strong>存储位置:</strong> {result.isAlarmValid ? 'check_1' : 'check_2'}</p>
                )}
                {result.error && (
                  <p className="result-error"><strong>错误:</strong> {result.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染报警选择模态框
  const renderAlarmModal = () => {
    if (!selectedImageForAlarm) return null;

    return (
      <div className="media-preview-modal" onClick={() => setSelectedImageForAlarm(null)}>
        <div className="preview-content alarm-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-preview" onClick={() => setSelectedImageForAlarm(null)}>×</button>

          <h3 className="status-modal-title">创建报警</h3>

          <div className="alarm-form">
            <div className="form-group">
              <label>报警原因:</label>
              <select
                multiple // 添加多选属性
                value={alarmCause.split(',')} // 将字符串转换为数组
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions);
                  const selectedValues = selectedOptions.map(option => option.value);
                  setAlarmCause(selectedValues.join(',')); // 将数组转换为逗号分隔的字符串
                }}
                className="form-select"
              >
                {Object.entries(CAUSES_MAPPING).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>紧急程度:</label>
              <select
                value={alarmLevel}
                onChange={(e) => setAlarmLevel(e.target.value)}
                className="form-select"
              >
                <option value="">请选择紧急程度</option>
                <option value="1">紧急</option>
                <option value="2">不紧急</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                onClick={() => handleCreateAlarm(selectedImageForAlarm)}
                disabled={isCreatingAlarm || !alarmCause || !alarmLevel}
                className="submit-button"
              >
                {isCreatingAlarm ? '创建中...' : '创建报警'}
              </button>
              <button
                onClick={() => setSelectedImageForAlarm(null)}
                className="cancel-button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染设备图片区域
  const renderDeviceImageSection = () => {
    const currentImages = getCurrentPageDeviceImages();
    return (
      <div className="files-section">
        <h2>设备图片</h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

          {/* 日期选择器 */}
          <div className="date-selector">
            <label>选择日期: </label>
            <input
              type="date"
              value={deviceImageDate}
              onChange={(e) => setDeviceImageDate(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />

            <button
              onClick={() => {
                setDeviceImageDate('');
                loadDeviceImages(1);
              }}
              style={{ marginLeft: '5px', padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              查看全部
            </button>
          </div>

          <button
            className="stream-button"
            onClick={handleDeviceSnap}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
          >
            {loading ? '抓拍中...' : '设备抓拍'}
          </button>

          <button
            className="stream-button"
            onClick={handleGetDeviceStatus}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
          >
            {isGettingStatus ? '获取中...' : '设备状态'}
          </button>

          <button
            className="stream-button"
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
                    width: '330px',
                    height: '250px',
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
                  <div className="file-actions">
                    <button
                      className="alarm-button"
                      onClick={() => setSelectedImageForAlarm(file)}
                      disabled={isCreatingAlarm}
                    >
                      报警
                    </button>
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
                disabled={loading}
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

        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 日期选择器 */}
          <div className="date-selector">
            <label>选择日期: </label>
            <input
              type="date"
              value={deviceVideoDate}
              onChange={(e) => setDeviceVideoDate(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />

            <button
              onClick={() => {
                setDeviceVideoDate('');
                loadDeviceVideos(1);
              }}
              style={{ marginLeft: '5px', padding: '5px 10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              查看全部
            </button>
          </div>
        </div>

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
                    width: '330px',
                    height: '250px',
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
                disabled={loading}
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

        {/* 添加AI检测操作区域 */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="stream-button"
            onClick={toggleSelectAllAlarmImages}
            disabled={loading || currentImages.length === 0}
          >
            {selectedAlarmImages.length === currentImages.length ? '取消全选' : '全选当前页'}
          </button>

          <button
            className="stream-button"
            onClick={handleAiVisionCheck}
            disabled={loading || selectedAlarmImages.length === 0 || isAiChecking}
          >
            {isAiChecking ? '检测中...' : `AI检测 (${selectedAlarmImages.length})`}
          </button>

          <span>已选择 {selectedAlarmImages.length} 张图片</span>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : currentImages.length === 0 ? (
          <p>没有报警图片</p>
        ) : (
          <div className="files-horizontal">
            {currentImages.map((file, index) => {
              const isSelected = selectedAlarmImages.some(img => img.id === file.id);

              return (
                <div
                  key={index}
                  className={`file-card image-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleAlarmImageSelection(file)}
                >
                  <div className="selection-indicator">
                    {isSelected ? '✓' : ''}
                  </div>
                  <img
                    src={file.url}
                    alt={file.name || file.id}
                    style={{
                      width: '330px',
                      height: '250px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openMediaPreview(file.url, 'image');
                    }}
                  />
                  <div className="file-info">
                    <div className="file-meta">
                      <span>报警时间: {file.createdAt}</span>
                      {file.alarmType && <span>报警类型: {file.alarmType}</span>}
                      {file.causes && (
                        <span>
                          引发原因: {
                            // 处理多个原因的情况
                            file.causes.split(',').map(cause => {
                              const trimmedCause = cause.trim();
                              return CAUSES_MAPPING[trimmedCause] || `未知(${trimmedCause})`;
                            }).join('、') // 使用顿号分隔多个原因
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalAlarmImagePages > 1 && (
          <div className="pagination">
            {[...Array(totalAlarmImagePages)].map((_, i) => (
              <button
                key={i}
                onClick={() => loadAlarmImages(i + 1)}
                className={alarmImagePage === i + 1 ? "active-page" : ""}
                disabled={loading}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* 显示AI检测结果 */}
        {renderAiResults()}
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

      {/* 报警创建模态框 */}
      {renderAlarmModal()}
    </div>
  );
};

export default DeviceImageAndVideoDisplay;