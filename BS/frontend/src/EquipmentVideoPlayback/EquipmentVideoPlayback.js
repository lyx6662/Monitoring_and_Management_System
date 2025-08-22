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
  const [successMessage, setSuccessMessage] = useState('');
  const [streamCheckIntervals, setStreamCheckIntervals] = useState({});
  const streamCheckCountRef = useRef({});
  const availabilityCheckRef = useRef(null);
  const devicesRef = useRef(devices);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

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

const checkStreamAvailability = async (url) => {
  try {
    // 如果是无效地址，直接返回false
    if (!url || url === "播流地址还没开放" || url === "null" || url === null) {
      console.log('无效地址，跳过检查');
      return false;
    }

    console.log(`开始检查流地址: ${url}`);
    
    // 第一次检查 - 使用HEAD方法快速检查
    try {
      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 3000);

      const response1 = await fetch(url, {
        method: 'HEAD',
        signal: controller1.signal
      });

      clearTimeout(timeoutId1);
      
      if (!response1.ok) {
        console.log('第一次HEAD检查失败，状态码:', response1.status);
        return false;
      }
    } catch (error) {
      console.log('第一次HEAD检查失败:', error.name);
      return false;
    }

    // 第二次检查 - 对于HLS流，使用GET方法验证内容
    if (url.includes('.m3u8')) {
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

        const response2 = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          headers: {
            'Range': 'bytes=0-1024' // 只请求前1KB内容
          }
        });

        clearTimeout(timeoutId2);
        
        if (!response2.ok) {
          console.log('第二次GET检查失败，状态码:', response2.status);
          return false;
        }

        // 验证m3u8文件内容
        const content = await response2.text();
        const isValidM3U8 = content.includes('#EXTM3U') || 
                           content.trim().startsWith('#EXT') ||
                           (content.includes('.ts') && content.includes('#EXTINF'));
        
        console.log('M3U8内容验证结果:', isValidM3U8);
        return isValidM3U8;

      } catch (error) {
        console.log('第二次GET检查失败:', error.name);
        return false;
      }
    }

    // 对于非HLS流，两次HEAD检查都通过则认为可用
    return true;

  } catch (error) {
    console.log('流地址检查失败:', url, error.name);
    return false;
  }
};

// 修改预加载函数，添加重试机制
// 修改预加载函数，添加重试机制
const preloadStreams = async (devicesToCheck) => {
  const availabilityMap = {};
  const updateNeeded = {};

  // 过滤掉没有有效流地址的设备
  const validDevices = devicesToCheck.filter(device => 
    device.pull_url && 
    device.pull_url !== "播流地址还没开放" &&
    device.pull_url !== "null" &&
    device.pull_url !== null
  );

  console.log('预加载检查设备数量:', validDevices.length);

  for (const device of validDevices) {
    let isAvailable = false;
    let retryCount = 0;
    const maxRetries = 2;

    // 重试机制
    while (retryCount < maxRetries && !isAvailable) {
      isAvailable = await checkStreamAvailability(device.pull_url);
      retryCount++;
      
      if (!isAvailable && retryCount < maxRetries) {
        console.log(`设备 ${device.device_id} 第${retryCount}次检查失败，进行第${retryCount + 1}次检查`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒再重试
      }
    }

    console.log(`设备 ${device.device_id} 最终可用性:`, isAvailable, `(尝试次数: ${retryCount})`);

    // 只有当状态确实发生变化时才更新
    if (streamAvailability[device.device_id] !== isAvailable) {
      updateNeeded[device.device_id] = isAvailable;
    }
    availabilityMap[device.device_id] = isAvailable;
  }

  // 处理没有流地址的设备，设置为不可用
  devicesToCheck.forEach(device => {
    if (!device.pull_url || device.pull_url === "播流地址还没开放") {
      if (streamAvailability[device.device_id] !== false) {
        updateNeeded[device.device_id] = false;
      }
      availabilityMap[device.device_id] = false;
    }
  });

  // 只有在有变化时才更新状态
  if (Object.keys(updateNeeded).length > 0) {
    setStreamAvailability(prev => ({ ...prev, ...availabilityMap }));
  }
};

  // 启动定期检查流可用性
// 启动定期检查流可用性
const startAvailabilityChecks = (devices) => {
  // 清除之前的检查
  if (availabilityCheckRef.current) {
    clearInterval(availabilityCheckRef.current);
  }

  // 只检查有有效流地址的设备
  const devicesWithStreams = devices.filter(device => 
    device.pull_url && 
    device.pull_url !== "播流地址还没开放" &&
    device.pull_url !== "null" &&
    device.pull_url !== null
  );

  console.log('开始定期检查，有效设备数量:', devicesWithStreams.length);

  const intervalId = setInterval(async () => {
    // 只预加载有有效流地址的设备
    await preloadStreams(devicesWithStreams);
  }, 15000); // 增加到15秒一次，减少频繁检查

  availabilityCheckRef.current = intervalId;

  return () => {
    if (availabilityCheckRef.current) {
      clearInterval(availabilityCheckRef.current);
      availabilityCheckRef.current = null;
    }
  };
};

useEffect(() => {
const fetchDevices = async () => {
  try {
    // 从token中获取用户ID
    const token = localStorage.getItem('token');
    let userId = '';
    
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        userId = decoded.userId || decoded.id || ''; // 根据你的token结构调整
      } catch (e) {
        console.error('解析token失败:', e);
      }
    }

    // 构建请求URL，包含用户ID参数
    let url = 'http://116.62.54.160:5000/api/devices';
    if (userId) {
      url += `?user_id=${userId}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('获取设备列表失败');
    }
    const data = await response.json();
    setDevices(data);

    // 初始预加载 - 只检查有有效流地址的设备
    const devicesWithStreams = data.filter(device => 
      device.pull_url && 
      device.pull_url !== "播流地址还没开放" &&
      device.pull_url !== "null" &&
      device.pull_url !== null
    );
    preloadStreams(devicesWithStreams);
    
    // 启动定期检查 - 传入所有设备，但函数内部会过滤
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
        setSuccessMessage('截图已保存');
        setTimeout(() => setSuccessMessage(''), 3000);
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
        setSuccessMessage('录制已保存');
        setTimeout(() => setSuccessMessage(''), 3000);
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
    }, 6000);

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

  // 提取actionKey获取函数
  const getActionKey = (url) => {
    if (url.includes('rotation')) return 'rotation';
    if (url.includes('reset')) return 'reset';
    if (url.includes('zoom')) return 'zoom';
    if (url.includes('heating')) return 'heating';
    if (url.includes('wiper')) return 'wiper';
    if (url.includes('video')) return 'video';
    if (url.includes('snap')) return 'snap';
    return 'unknown';
  };

  // 获取操作名称（用于成功消息）
  const getActionName = (actionKey) => {
    const actionNames = {
      'reset': '云台复位',
      'heating': '加热控制',
      'wiper': '雨刮控制',
      'video': '视频拍摄',
      'snap': '设备抓拍'
    };
    return actionNames[actionKey] || '操作';
  };

  // 设备控制通用请求函数
  const sendControlRequest = async (url, method = 'POST', data = null, showSuccessMessage = true) => {
    if (!currentDeviceCode) {
      alert('请先选择并播放一个设备');
      return;
    }

    try {
      // 设置操作状态为加载中
      const actionKey = getActionKey(url);
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
      
      // 添加成功消息提示（除了移动方向和放大缩小）
      if (showSuccessMessage) {
        const actionName = getActionName(actionKey);
        setSuccessMessage(`${actionName}操作成功`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
      console.log('操作成功:', response.data);
      setTimeout(() => {
        setControlStatus(prev => ({ ...prev, [actionKey]: '' }));
      }, 2000);
      return response.data;
    } catch (error) {
      const actionKey = getActionKey(url);
      const errorMsg = error.response?.data?.error || '操作失败，请重试';
      setControlStatus(prev => ({ ...prev, [actionKey]: 'error' }));
      console.error('操作失败:', error);
      alert(errorMsg);
      setTimeout(() => {
        setControlStatus(prev => ({ ...prev, [actionKey]: '' }));
      }, 2000);
    }
  };

  // 云台方向控制 - 按下按钮时发送方向指令（不显示成功消息）
  const startRotation = (direction) => {
    if (!currentDeviceCode) return;

    setIsRotating(true);
    sendControlRequest(`/api/device-preset/rotation/${direction}?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  // 云台方向控制 - 松开按钮时发送结束指令（不显示成功消息）
  const stopRotation = () => {
    if (!currentDeviceCode || !isRotating) return;

    setIsRotating(false);
    sendControlRequest(`/api/device-preset/rotation/15?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  // 云台复位（显示成功消息）
  const resetRotation = () => {
    sendControlRequest(`/api/device-preset/reset?device_code=${currentDeviceCode}`);
  };

  // 变焦控制（不显示成功消息）
  const controlZoom = (zoomType) => {
    sendControlRequest(`/api/device/decrease/${zoomType}?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  // 加热控制（显示成功消息）
  const controlHeating = (action) => {
    const actionText = action === 1 ? '开启' : '关闭';
    sendControlRequest('/api/device/heating-action', 'POST', {
      device_code: currentDeviceCode,
      heating_action: action
    }).then(() => {
      setSuccessMessage(`加热${actionText}成功`);
      setTimeout(() => setSuccessMessage(''), 3000);
    });
  };

  // 雨刮控制（显示成功消息）
  const controlWiper = () => {
    sendControlRequest(`/api/device-preset/wiper?device_code=${currentDeviceCode}`);
  };

  // 拍摄视频（显示成功消息）
  const captureVideo = () => {
    sendControlRequest('/api/hub/device-video-by-device-code', 'POST', {
      device_code: currentDeviceCode
    });
  };

  // 设备抓拍（显示成功消息）
  const captureDeviceSnap = () => {
    sendControlRequest(`/api/hub/device-snap-by-device-code?deviceCode=${currentDeviceCode}`);
  };

  const fetchStreamUrl = async (deviceId, deviceCode) => {
    // 检查是否已有播流地址
    const currentDevice = devices.find(d => d.device_id === deviceId);
    if (currentDevice?.pull_url && currentDevice.pull_url !== "播流地址还没开放") {
      if (window.confirm("该设备已有播流地址，是否先关闭当前播流再获取新地址？")) {
        await handleStopStream(deviceCode, deviceId);
        // 等待一下让状态更新
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return; // 用户取消操作
      }
    }

    try {
      setLoading(true);
      const streamResponse = await axios.post(
        `http://116.62.54.160:5000/api/devices/${deviceId}/stream-url`,
        { device_code: deviceCode }
      );

      if (streamResponse.data.streamUrl) {
        await axios.put(
          `http://116.62.54.160:5000/api/devices/${deviceId}/stream-url`,
          { pull_url: streamResponse.data.streamUrl }
        );

        // 更新设备列表
        const updatedDevices = devices.map(device =>
          device.device_id === deviceId
            ? { ...device, pull_url: streamResponse.data.streamUrl }
            : device
        );
        setDevices(updatedDevices);

        // 立即开始持续检查新地址 - 确保这行代码执行了
        console.log('开始检查流地址可用性...');
        startStreamAvailabilityCheck(deviceId);

        setSuccessMessage("开始获取播流地址，请等待...");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError("未能获取有效的播流地址");
      }
    } catch (err) {
      setError("获取或更新播流地址失败: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };


  // 修改 startStreamAvailabilityCheck 函数
  const startStreamAvailabilityCheck = (deviceId) => {
    console.log('开始流可用性检查，设备ID:', deviceId);

    // 先清除可能存在的旧检查
    stopStreamAvailabilityCheck(deviceId);

    // 初始化检查计数器（确保从0开始）
    streamCheckCountRef.current[deviceId] = 0;
    console.log('初始化检查计数器:', streamCheckCountRef.current[deviceId]);

    const intervalId = setInterval(async () => {
      // 获取最新的设备信息（使用ref确保时效性）
      const currentDevice = devicesRef.current.find(d => d.device_id === deviceId);
      const currentStreamUrl = currentDevice?.pull_url;

      // 立即检查终止条件：设备不存在/流地址无效/已达最大次数
      if (!currentDevice || !currentStreamUrl || currentStreamUrl === "播流地址还没开放") {
        console.log('设备不存在或流地址无效，停止检查');
        stopStreamAvailabilityCheck(deviceId);
        return;
      }

      // 检查是否已达到最大检查次数（8次）
      if (streamCheckCountRef.current[deviceId] >= 8) {
        console.log('已达到最大检查次数(8次)，停止检查');
        stopStreamAvailabilityCheck(deviceId);
        // 更新状态为不可用
        setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
        setError(`播流地址访问超时，请检查设备状态`);
        setTimeout(() => setError(null), 2000);
        return;
      }

      console.log(`检查流地址 (${streamCheckCountRef.current[deviceId] + 1}/8):`, currentStreamUrl);

      try {
        const isAvailable = await checkStreamAvailability(currentStreamUrl);
        // 无论结果如何，先累加计数
        streamCheckCountRef.current[deviceId] += 1;

        console.log(`流地址检查结果:`, currentStreamUrl, '可用:', isAvailable);

        if (isAvailable) {
          console.log('流可用，停止检查');
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: true }));
          setSuccessMessage(`播流地址已就绪: ${currentStreamUrl}`);
          setTimeout(() => setSuccessMessage(""), 6000);
        } else if (streamCheckCountRef.current[deviceId] >= 8) {
          // 再次确认达到最大次数（双重保险）
          console.error(`设备 ${deviceId} 的播流地址访问超时`);
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
          setError(`播流地址访问超时，请检查设备状态`);
          setTimeout(() => setError(null), 6000);
        }
      } catch (error) {
        console.error('检查流地址时出错:', error);
        streamCheckCountRef.current[deviceId] += 1;

        // 出错时也检查是否达到最大次数
        if (streamCheckCountRef.current[deviceId] >= 8) {
          console.log('检查出错且已达到最大次数，停止检查');
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
        }
      }
    }, 6000);

    // 保存interval ID（使用函数式更新确保状态最新）
    setStreamCheckIntervals(prev => ({ ...prev, [deviceId]: intervalId }));
  };

  // 先定义停止检查的函数
  const stopStreamAvailabilityCheck = (deviceId) => {
    // 使用函数式更新确保获取最新的interval状态
    setStreamCheckIntervals(prevIntervals => {
      const intervalId = prevIntervals[deviceId];
      if (intervalId) {
        clearInterval(intervalId); // 清除定时器
        console.log(`已停止设备${deviceId}的流检查，intervalId:`, intervalId);
      }
      // 返回删除后的新状态
      const newIntervals = { ...prevIntervals };
      delete newIntervals[deviceId];
      return newIntervals;
    });

    // 清理计数器
    if (streamCheckCountRef.current[deviceId] !== undefined) {
      delete streamCheckCountRef.current[deviceId];
      console.log(`已清理设备${deviceId}的检查计数器`);
    }
  };
  // 组件卸载时清理所有资源
  useEffect(() => {
    return () => {
      // 清理流检查定时器
      Object.values(streamCheckIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });

      // 清理可用性检查定时器
      if (availabilityCheckRef.current) {
        clearInterval(availabilityCheckRef.current);
      }

      // 清理录制定时器
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }

      // 清理HLS播放器
      if (hlsPlayer) {
        hlsPlayer.destroy();
      }
    };
  }, [streamCheckIntervals, hlsPlayer]);

  // 在关闭播流的函数中，更新可用性状态并停止当前播放
  const handleStopStream = async (deviceCode, deviceId) => {
    if (!deviceCode) {
      setError("设备代码不能为空，无法关闭播流");
      return;
    }

    // 关键修改：关闭播流时立即停止对应的检查
    stopStreamAvailabilityCheck(deviceId);

    // 如果正在播放这个设备的流，先停止播放
    if (currentDevice && currentDevice.device_id === deviceId) {
      if (hlsPlayer) {
        hlsPlayer.destroy();
        setHlsPlayer(null);
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }

      setCurrentStream(null);
      setCurrentDevice(null);
      setCurrentDeviceCode(null);
      setIsVideoReady(false);
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "http://116.62.54.160:5000/api/devices/stop-stream",
        { deviceCode }
      );

      if (response.data.success) {
        await axios.put(
          `http://116.62.54.160:5000/api/devices/${deviceId}/stream-url`,
          { pull_url: "播流地址还没开放" }
        );

        // 更新设备列表
        const updatedDevices = devices.map(device =>
          device.device_id === deviceId
            ? { ...device, pull_url: "播流地址还没开放" }
            : device
        );
        setDevices(updatedDevices);

        // 立即设置该设备的流为不可用
        setStreamAvailability(prev => ({
          ...prev,
          [deviceId]: false
        }));

        setSuccessMessage("播流已成功关闭");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError("关闭播流失败: " + (response.data.error || "未知错误"));
      }
    } catch (err) {
      setError("关闭播流出错: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
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

        {/* 显示成功消息 */}
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

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
                className="control-btn1 capture-btn"
              >
                <i className="icon-camera"></i> 拍摄截图
              </button>

              {/* 录制按钮 */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isVideoReady}
                className={`control-btn1 record-btn ${isRecording ? 'recording-active pulse' : ''}`}
              >
                <i className="icon-video"></i>
                {isRecording ? `停止录制 (${recordingTime.toFixed(1)}s)` : '录制5秒'}
              </button>
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

          {/* 设备控制区域 - 移动到视频下方 */}
          <div className="device-control-panel">
            <h3>设备控制</h3>

            <div className="control-row">
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
                    <div className="zoom-grid">
                      <button
                        onClick={() => controlZoom('zoom-out-max')}
                        disabled={!currentDeviceCode}
                        className={`control-btn2 zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                      >
                        MAX --🔍
                      </button>
                      <button
                        onClick={() => controlZoom('zoom-out')}
                        disabled={!currentDeviceCode}
                        className={`control-btn2 zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                      >
                        -🔍
                      </button>
                      <button
                        onClick={() => controlZoom('zoom-in-max')}
                        disabled={!currentDeviceCode}
                        className={`control-btn2 zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                      >
                        MAX ++🔍
                      </button>
                      <button
                        onClick={() => controlZoom('zoom-in')}
                        disabled={!currentDeviceCode}
                        className={`control-btn2 zoom-btn ${controlStatus.zoom === 'loading' ? 'loading' : controlStatus.zoom === 'success' ? 'success' : ''}`}
                      >
                        +🔍
                      </button>

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 其他控制 - 区分设备类型显示不同按钮 */}
            <div className="control-section1">
              <h4>其他控制</h4>
              <div className="other-controls">
                {/* 仅当设备不是枪机时显示加热和雨刮控制 */}
                {currentDevice?.device_name !== '枪机' && (
                  <>
                    <button
                      onClick={() => controlHeating(1)}
                      disabled={!currentDeviceCode}
                      className={`control-btn1 heating-btn ${controlStatus.heating === 'loading' ? 'loading' : controlStatus.heating === 'success' ? 'success' : ''}`}
                    >
                      开启加热
                    </button>
                    <button
                      onClick={() => controlHeating(0)}
                      disabled={!currentDeviceCode}
                      className={`control-btn1 heating-btn ${controlStatus.heating === 'loading' ? 'loading' : controlStatus.heating === 'success' ? 'success' : ''}`}
                    >
                      关闭加热
                    </button>
                    <button
                      onClick={controlWiper}
                      disabled={!currentDeviceCode}
                      className={`control-btn1 wiper-btn ${controlStatus.wiper === 'loading' ? 'loading' : controlStatus.wiper === 'success' ? 'success' : ''}`}
                    >
                      雨刮控制
                    </button>
                  </>
                )}

                {/* 以下两个按钮始终显示 */}
                <button
                  onClick={captureVideo}
                  disabled={!currentDeviceCode}
                  className={`control-btn1 video-capture-btn ${controlStatus.video === 'loading' ? 'loading' : controlStatus.video === 'success' ? 'success' : ''}`}
                >
                  拍摄视频
                </button>
                <button
                  onClick={captureDeviceSnap}
                  disabled={!currentDeviceCode}
                  className={`control-btn1 snap-btn ${controlStatus.snap === 'loading' ? 'loading' : controlStatus.snap === 'success' ? 'success' : ''}`}
                >
                  设备抓拍
                </button>
              </div>
            </div>
          </div>
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
                      {/* 优化播放按钮状态显示逻辑 */}
                      <button
                        onClick={() => playStream(device.pull_url, device)}
                        disabled={
                          !device.status ||
                          !hlsSupported ||
                          device.pull_url === "播流地址还没开放" ||
                          streamAvailability[device.device_id] !== true
                        }
                        className="play-btn btn-primary"
                        title={!device.status ? "设备离线" :
                          !hlsSupported ? "浏览器不支持HLS" :
                            device.pull_url === "播流地址还没开放" ? "无播流地址" :
                              streamAvailability[device.device_id] !== true ? "流不可用" : "点击播放"}
                      >
                        {streamAvailability[device.device_id] === true ? '播放' :
                          streamAvailability[device.device_id] === false ? '不可用' :
                            '检查中...'}
                      </button>

                      {/* 获取播流地址按钮 */}
                      <button
                        onClick={() => fetchStreamUrl(device.device_id, device.device_code)}
                        className="stream-button"
                        disabled={!device.device_code || (device.pull_url && device.pull_url !== "播流地址还没开放")}
                        title={!device.device_code ? "需要先设置设备代码" :
                          (device.pull_url && device.pull_url !== "播流地址还没开放") ? "已有播流地址，点击会重新获取" : ""}
                      >
                        {device.pull_url && device.pull_url !== "播流地址还没开放" ? "重新获取" : "获取播流地址"}
                      </button>

                      {/* 关闭播流按钮 */}
                      <button
                        onClick={() => handleStopStream(device.device_code, device.device_id)}
                        className="stop-stream-button"
                        disabled={!device.device_code || !device.pull_url || device.pull_url === "播流地址还没开放"}
                        title={!device.device_code ? "需要设备代码" : (!device.pull_url || device.pull_url === "播流地址还没开放" ? "没有活跃的播流" : "")}
                      >
                        关闭播流
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