import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const EquipmentVideoPlayback = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [currentDeviceCode, setCurrentDeviceCode] = useState(null);
  const [hlsSupported, setHlsSupported] = useState(false);
  const [hlsPlayer, setHlsPlayer] = useState(null);
  const [username, setUsername] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [streamAvailability, setStreamAvailability] = useState({});
  const [controlStatus, setControlStatus] = useState({});
  const [isRotating, setIsRotating] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

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

  // 检查流地址可用性的函数
  const checkStreamAvailability = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // 预加载检查所有设备流地址的可用性
  const preloadStreams = async (devices) => {
    const availabilityMap = {};

    for (const device of devices) {
      if (device.pull_url && device.pull_url !== "播流地址还没开放") {
        const isAvailable = await checkStreamAvailability(device.pull_url);
        availabilityMap[device.device_id] = isAvailable;
      } else {
        availabilityMap[device.device_id] = false;
      }
    }

    setStreamAvailability(availabilityMap);
  };

  // 启动定期检查流可用性
  const startAvailabilityChecks = (devices) => {
    const intervalId = setInterval(async () => {
      await preloadStreams(devices);
    }, 5000); // 每5秒检查一次

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch('http://116.62.54.160:5000/api/devices');
        if (!response.ok) {
          throw new Error('获取设备列表失败');
        }
        const data = await response.json();
        setDevices(data);

        // 初始预加载
        preloadStreams(data);
        // 启动定期检查
        const cleanup = startAvailabilityChecks(data);

        return cleanup;
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const cleanupPromise = fetchDevices();

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
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  useEffect(() => {
    if (currentStream && videoRef.current) {
      setIsVideoReady(true);
    } else {
      setIsVideoReady(false);
    }
  }, [currentStream]);

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

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      clearTimeout(recordingTimerRef.current);
    };
  }, []);

  const playStream = (url, device) => {
    setCurrentStream(url);
    setCurrentDevice(device);
    setCurrentDeviceCode(device.device_code);
  };

  // 上传功能
  const handleUpload = async (file, fileName) => {
    try {
      setUploadProgress(0);

      // 1. 从后端获取签名URL
      const res = await fetch('http://116.62.54.160:5000/api/oss/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileName: fileName || file.name,
          fileType: file.type
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '获取上传URL失败');
      }

      const { signedUrl, accessUrl } = await res.json();

      if (!signedUrl) {
        throw new Error('未获取到有效的上传URL');
      }

      // 2. 使用axios上传文件
      await axios.put(signedUrl, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      console.log('上传成功:', accessUrl);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 3000); // 3秒后隐藏进度条
      return accessUrl;
    } catch (err) {
      console.error('上传失败:', err);
      setUploadProgress(-1); // 表示错误状态
      throw err;
    }
  };

  // 截图功能
  const captureScreenshot = () => {
    if (!videoRef.current || !isVideoReady) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      // 生成文件名: 截图_设备ID_时间戳.png
      const fileName = `screenshot_${currentDevice?.device_id || 'unknown'}_${Date.now()}.png`;

      // 创建文件对象
      const file = new File([blob], fileName, { type: 'image/png' });

      // 上传截图
      handleUpload(file).then(url => {
        console.log('截图上传成功:', url);
        alert(`截图已保存: ${fileName}`);
      }).catch(console.error);
    }, 'image/png');
  };

  // 开始录制
  const startRecording = () => {
    if (!videoRef.current || !isVideoReady) return;

    const stream = videoRef.current.captureStream();
    if (!stream) {
      alert('浏览器不支持录制功能');
      return;
    }

    recordedChunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });

      // 生成文件名: 录制_设备ID_时间戳.webm
      const fileName = `recording_${currentDevice?.device_id || 'unknown'}_${Date.now()}.webm`;

      // 创建文件对象
      const file = new File([blob], fileName, { type: 'video/webm' });

      // 上传录制视频
      handleUpload(file).then(url => {
        console.log('录制视频上传成功:', url);
        alert(`录制已保存: ${fileName}`);
      }).catch(console.error);

      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordingTime(0);

    // 设置5秒后自动停止
    recordingTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 5000);

    // 更新计时器
    const timer = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 4.9) {
          clearInterval(timer);
          return 5;
        }
        return prev + 0.1;
      });
    }, 100);
  };

  // 停止录制
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimerRef.current);
      setIsRecording(false);
    }
  };

  // 设备控制通用请求函数 - 修复了actionKey未定义的问题
  const sendControlRequest = async (url, method = 'POST', data = null) => {
    if (!currentDeviceCode) {
      alert('请先选择并播放一个设备');
      return;
    }

    try {
      // 设置操作状态为加载中 - 修复actionKey定义
      const actionKey = url.includes('rotation') ? 'rotation' :
        url.includes('reset') ? 'reset' :
          url.includes('zoom') ? 'zoom' :
            url.includes('heating') ? 'heating' :
              url.includes('wiper') ? 'wiper' :
                url.includes('video') ? 'video' : 'snap';

      setControlStatus(prev => ({ ...prev, [actionKey]: 'loading' }));

      const response = await axios({
        method,
        url: `http://116.62.54.160:5000${url}`,
        data,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setControlStatus(prev => ({ ...prev, [actionKey]: 'success' }));
      console.log('操作成功:', response.data);
      setTimeout(() => {
        setControlStatus(prev => ({ ...prev, [actionKey]: '' }));
      }, 2000);
      return response.data;
    } catch (error) {
      // 修复actionKey定义
      const actionKey = url.includes('rotation') ? 'rotation' :
        url.includes('reset') ? 'reset' :
          url.includes('zoom') ? 'zoom' :
            url.includes('heating') ? 'heating' :
              url.includes('wiper') ? 'wiper' :
                url.includes('video') ? 'video' : 'snap';

      const errorMsg = error.response?.data?.error || '操作失败，请重试';
      setControlStatus(prev => ({ ...prev, [actionKey]: 'error' }));
      console.error('操作失败:', error);
      alert(errorMsg);
      setTimeout(() => {
        setControlStatus(prev => ({ ...prev, [actionKey]: '' }));
      }, 2000);
    }
  };

  // 云台方向控制 - 按下按钮时发送方向指令
  const startRotation = (direction) => {
    if (!currentDeviceCode) return;

    setIsRotating(true);
    sendControlRequest(`/api/device-preset/rotation/${direction}?device_code=${currentDeviceCode}`);
  };

  // 云台方向控制 - 松开按钮时发送结束指令
  const stopRotation = () => {
    if (!currentDeviceCode || !isRotating) return;

    setIsRotating(false);
    sendControlRequest(`/api/device-preset/rotation/15?device_code=${currentDeviceCode}`);
  };

  // 云台复位
  const resetRotation = () => {
    sendControlRequest(`/api/device-preset/reset?device_code=${currentDeviceCode}`);
  };

  // 变焦控制
  const controlZoom = (zoomType) => {
    sendControlRequest(`/api/device/decrease/${zoomType}?device_code=${currentDeviceCode}`);
  };

  // 加热控制
  const controlHeating = (action) => {
    sendControlRequest('/api/device/heating-action', 'POST', {
      device_code: currentDeviceCode,
      heating_action: action
    });
  };

  // 雨刮控制
  const controlWiper = () => {
    sendControlRequest(`/api/device-preset/wiper?device_code=${currentDeviceCode}`);
  };

  // 拍摄视频
  const captureVideo = () => {
    sendControlRequest('/api/hub/device-video-by-device-code', 'POST', {
      device_code: currentDeviceCode
    });
  };

  // 设备抓拍
  const captureDeviceSnap = () => {
    sendControlRequest(`/api/hub/device-snap-by-device-code?deviceCode=${currentDeviceCode}`);
  };

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
        <div className="page-header">
          <h1>设备视频播放</h1>
          <p className="page-description">实时监控设备视频流，支持截图和短时间录制功能</p>
        </div>

        {/* 视频播放区域 */}
        <div className="video-container card" style={{ display: currentStream ? 'block' : 'none' }}>
          <div className="video-header">
            <div className="video-title">
              <h2>
                {username && <span className="username-badge">{username}</span>}
                {currentDevice ? currentDevice.device_name : '无设备'}
              </h2>
              <p className="stream-info">
                {currentDevice && `设备ID: ${currentDevice.device_id}`}
                {currentStream && <span className="stream-status online">· 正在播放</span>}
              </p>
            </div>

            {/* 控制按钮区域 */}
            <div className="video-controls">
              {/* 截图按钮 */}
              <button
                onClick={captureScreenshot}
                disabled={!isVideoReady}
                className="control-btn capture-btn"
              >
                <i className="icon-camera"></i> 拍摄截图
              </button>

              {/* 录制按钮 */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isVideoReady}
                className={`control-btn record-btn ${isRecording ? 'recording-active pulse' : ''}`}
              >
                <i className="icon-video"></i>
                {isRecording ? `停止录制 (${recordingTime.toFixed(1)}s)` : '录制5秒'}
              </button>
            </div>
          </div>

          {/* 设备控制区域 */}
          <div className="device-control-panel">
            <h3>设备控制</h3>

            {/* 云台控制 - 仅当设备不是枪机时显示 */}
            {currentDevice?.device_name !== '枪机' && (
              <div className="control-section">
                <h4>云台控制 (按住按钮转动，松开停止)</h4>
                <div className="direction-controls">
                  {/* 第一行 - 左上、上、右上 */}
                  <div className="direction-row">
                    <button
                      onMouseDown={() => startRotation(22)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(22)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      左上 (22)
                    </button>

                    <button
                      onMouseDown={() => startRotation(11)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(11)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      上 (11)
                    </button>

                    <button
                      onMouseDown={() => startRotation(24)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(24)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      右上 (24)
                    </button>
                  </div>

                  {/* 第二行 - 左、复位、右 */}
                  <div className="direction-row">
                    <button
                      onMouseDown={() => startRotation(13)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(13)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      左 (13)
                    </button>

                    <button
                      onClick={resetRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn reset-btn ${controlStatus.reset === 'loading' ? 'loading' : controlStatus.reset === 'success' ? 'success' : ''}`}
                    >
                      复位
                    </button>

                    <button
                      onMouseDown={() => startRotation(14)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(14)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      右 (14)
                    </button>
                  </div>

                  {/* 第三行 - 左下、下、右下 */}
                  <div className="direction-row">
                    <button
                      onMouseDown={() => startRotation(23)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(23)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      左下 (23)
                    </button>

                    <button
                      onMouseDown={() => startRotation(12)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(12)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      下 (12)
                    </button>

                    <button
                      onMouseDown={() => startRotation(25)}
                      onMouseUp={stopRotation}
                      onMouseLeave={stopRotation}
                      onTouchStart={() => startRotation(25)}
                      onTouchEnd={stopRotation}
                      disabled={!currentDeviceCode}
                      className={`control-btn direction-btn ${controlStatus.rotation === 'loading' ? 'loading' : controlStatus.rotation === 'success' ? 'success' : ''}`}
                    >
                      右下 (25)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 变焦控制 - 仅当设备不是枪机时显示 */}
            {currentDevice?.device_name !== '枪机' && (
              <div className="control-section">
                <h4>变焦控制</h4>
                <div className="zoom-controls">
                  <button
                    onClick={() => controlZoom('zoom-out-max')}
                    disabled={!currentDeviceCode}
                    className={`control-btn zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                  >
                    最大缩小
                  </button>
                  <button
                    onClick={() => controlZoom('zoom-out')}
                    disabled={!currentDeviceCode}
                    className={`control-btn zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                  >
                    缩小
                  </button>
                  <button
                    onClick={() => controlZoom('zoom-in')}
                    disabled={!currentDeviceCode}
                    className={`control-btn zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                  >
                    放大
                  </button>
                  <button
                    onClick={() => controlZoom('zoom-in-max')}
                    disabled={!currentDeviceCode}
                    className={`control-btn zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                  >
                    最大放大
                  </button>
                </div>
              </div>
            )}

            {/* 其他控制 - 区分设备类型显示不同按钮 */}
            <div className="control-section">
              <h4>其他控制</h4>
              <div className="other-controls">
                {/* 仅当设备不是枪机时显示加热和雨刮控制 */}
                {currentDevice?.device_name !== '枪机' && (
                  <>
                    <button
                      onClick={() => controlHeating(1)}
                      disabled={!currentDeviceCode}
                      className={`control-btn heating-btn ${controlStatus.heating === 'loading' ? 'loading' : controlStatus.heating === 'success' ? 'success' : ''}`}
                    >
                      开启加热
                    </button>
                    <button
                      onClick={() => controlHeating(0)}
                      disabled={!currentDeviceCode}
                      className={`control-btn heating-btn ${controlStatus.heating === 'loading' ? 'loading' : controlStatus.heating === 'success' ? 'success' : ''}`}
                    >
                      关闭加热
                    </button>
                    <button
                      onClick={controlWiper}
                      disabled={!currentDeviceCode}
                      className={`control-btn wiper-btn ${controlStatus.wiper === 'loading' ? 'loading' : controlStatus.wiper === 'success' ? 'success' : ''}`}
                    >
                      雨刮控制
                    </button>
                  </>
                )}

                {/* 以下两个按钮始终显示 */}
                <button
                  onClick={captureVideo}
                  disabled={!currentDeviceCode}
                  className={`control-btn video-capture-btn ${controlStatus.video === 'loading' ? 'loading' : controlStatus.video === 'success' ? 'success' : ''}`}
                >
                  拍摄视频
                </button>
                <button
                  onClick={captureDeviceSnap}
                  disabled={!currentDeviceCode}
                  className={`control-btn snap-btn ${controlStatus.snap === 'loading' ? 'loading' : controlStatus.snap === 'success' ? 'success' : ''}`}
                >
                  设备抓拍
                </button>
              </div>
            </div>
          </div>

          {/* 视频播放器 */}
          <div className="video-player-container">
            <video
              ref={videoRef}
              controls
              className="stream-video"
              key={currentStream}
            ></video>

            {/* HLS支持警告 */}
            {!hlsSupported && (
              <div className="hls-warning alert alert-warning">
                <i className="icon-warning"></i>
                当前浏览器不支持HLS播放，请使用Chrome/Firefox/Edge等现代浏览器
              </div>
            )}
          </div>

          {/* 上传进度显示 */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="upload-progress progress-container">
              <div className="progress-info">
                <span>上传进度:</span>
                <span className="progress-percentage">{uploadProgress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadProgress === 100 && (
            <div className="upload-status success">
              <i className="icon-check"></i> 上传完成!
            </div>
          )}

          {uploadProgress === -1 && (
            <div className="upload-status error">
              <i className="icon-error"></i> 上传失败!
            </div>
          )}
        </div>

        {/* 无流提示 */}
        {!currentStream && (
          <div className="no-stream empty-state">
            <i className="icon-video-off"></i>
            <h3>暂无播放流</h3>
            <p>请从下方列表中选择一个在线设备的流进行播放</p>
          </div>
        )}

        {/* 设备列表区域 */}
        <div className="device-streams section-card">
          <div className="section-header">
            <h2>设备流地址列表</h2>
            <p className="section-desc">显示所有设备的推流和播流信息</p>
          </div>

          {/* 表格 */}
          <div className="table-responsive">
            <table className="stream-table">
              <thead>
                <tr>
                  <th>设备ID</th>
                  <th>设备名称</th>
                  <th>播流地址</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(device => (
                  <tr key={device.device_id} className={!device.status ? 'inactive-row' : ''}>
                    <td>{device.device_id}</td>
                    <td>{device.device_name}</td>
                    <td className="url-cell">
                      <span className="disabled-link" title={device.pull_url}>{device.pull_url}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${device.status ? 'status-online' : 'status-offline'}`}>
                        {device.status ? '在线' : '离线'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => playStream(device.pull_url, device)}
                        disabled={
                          !device.status ||
                          !hlsSupported ||
                          device.pull_url === "播流地址还没开放" ||
                          !streamAvailability[device.device_id]
                        }
                        className="play-btn btn-primary"
                      >
                        {streamAvailability[device.device_id] ? '播放' : '准备中...'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentVideoPlayback;
