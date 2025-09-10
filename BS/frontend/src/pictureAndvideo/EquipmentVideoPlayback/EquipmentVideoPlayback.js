import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Grid,
  styled,
  alpha,
  useTheme
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  CameraAlt as CameraIcon,
  Videocam as VideoIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  HeatPump as HeatIcon,
  CleanHands as WipeIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  ArrowBack as LeftIcon,
  ArrowForward as RightIcon,
  CenterFocusStrong as CenterIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  NavigateBefore as BeforeIcon,
  NavigateNext as NextIcon
} from '@mui/icons-material';
import Sidebar from '../SidebarVideo/SidebarVideo';
const API_URL = process.env.REACT_APP_API_BASE_URL;

// 自定义样式组件
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

const VideoContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  position: 'relative',
}));

const VideoPlayer = styled('video')({
  width: '100%',
  maxHeight: '500px',
  backgroundColor: '#000',
  borderRadius: '8px',
});

const ControlButton = styled(Button)(({ theme, active }) => ({
  margin: theme.spacing(0.5),
  minWidth: 'auto',
  ...(active && {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    border: `2px solid ${theme.palette.primary.main}`,
  }),
}));

const DirectionButton = styled(IconButton)(({ theme }) => ({
  width: 50,
  height: 50,
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.grey[100],
  '&:hover': {
    backgroundColor: theme.palette.grey[300],
  },
}));

const StatusBadge = styled(Chip)(({ theme, status }) => ({
  fontWeight: 'bold',
  ...(status === 'online' && {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  }),
  ...(status === 'offline' && {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  }),
  ...(status === 'checking' && {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  }),
}));

const PulseAnimation = styled(Box)({
  animation: 'pulse 1.5s infinite',
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.5 },
    '100%': { opacity: 1 },
  },
});

const EquipmentVideoPlayback = () => {
  const theme = useTheme();
  const navigate = useNavigate();
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
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

  // 显示消息提示
  const showMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // 关闭消息提示
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // 从token获取用户信息
  useEffect(() => {
    const getUsernameFromToken = () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        setUsername(decoded.username || decoded.userId || '用户');
      } catch (e) {
        console.error('解析token失败:', e);
        navigate('/login');
      }
    };

    getUsernameFromToken();
  }, [navigate]);

  // 检查流可用性函数（保持原有逻辑）
  const checkStreamAvailability = async (url) => {
    try {
      if (!url || url === "播流地址还没开放" || url === "null" || url === null) {
        return false;
      }

      // 第一次检查 - 使用HEAD方法
      try {
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 3000);

        const response1 = await fetch(url, {
          method: 'HEAD',
          signal: controller1.signal
        });

        clearTimeout(timeoutId1);
        
        if (!response1.ok) {
          return false;
        }
      } catch (error) {
        return false;
      }

      // 第二次检查 - 对于HLS流
      if (url.includes('.m3u8')) {
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 5000);

          const response2 = await fetch(url, {
            method: 'GET',
            signal: controller2.signal,
            headers: {
              'Range': 'bytes=0-1024'
            }
          });

          clearTimeout(timeoutId2);
          
          if (!response2.ok) {
            return false;
          }

          const content = await response2.text();
          const isValidM3U8 = content.includes('#EXTM3U') || 
                             content.trim().startsWith('#EXT') ||
                             (content.includes('.ts') && content.includes('#EXTINF'));
          
          return isValidM3U8;
        } catch (error) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // 预加载流函数（保持原有逻辑）
  const preloadStreams = async (devicesToCheck) => {
    const availabilityMap = {};
    const updateNeeded = {};

    const validDevices = devicesToCheck.filter(device => 
      device.pull_url && 
      device.pull_url !== "播流地址还没开放" &&
      device.pull_url !== "null" &&
      device.pull_url !== null
    );

    for (const device of validDevices) {
      let isAvailable = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount < maxRetries && !isAvailable) {
        isAvailable = await checkStreamAvailability(device.pull_url);
        retryCount++;
        
        if (!isAvailable && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (streamAvailability[device.device_id] !== isAvailable) {
        updateNeeded[device.device_id] = isAvailable;
      }
      availabilityMap[device.device_id] = isAvailable;
    }

    devicesToCheck.forEach(device => {
      if (!device.pull_url || device.pull_url === "播流地址还没开放") {
        if (streamAvailability[device.device_id] !== false) {
          updateNeeded[device.device_id] = false;
        }
        availabilityMap[device.device_id] = false;
      }
    });

    if (Object.keys(updateNeeded).length > 0) {
      setStreamAvailability(prev => ({ ...prev, ...availabilityMap }));
    }
  };

  // 启动定期检查（保持原有逻辑）
  const startAvailabilityChecks = (devices) => {
    if (availabilityCheckRef.current) {
      clearInterval(availabilityCheckRef.current);
    }

    const devicesWithStreams = devices.filter(device => 
      device.pull_url && 
      device.pull_url !== "播流地址还没开放" &&
      device.pull_url !== "null" &&
      device.pull_url !== null
    );

    const intervalId = setInterval(async () => {
      await preloadStreams(devicesWithStreams);
    }, 15000);

    availabilityCheckRef.current = intervalId;

    return () => {
      if (availabilityCheckRef.current) {
        clearInterval(availabilityCheckRef.current);
        availabilityCheckRef.current = null;
      }
    };
  };

  // 获取设备列表
  useEffect(() => {
    const fetchDevices = async () => {
      if (!API_URL) {
        setError("API 地址未配置，请检查 .env 文件并重启服务。");
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        let userId = '';
        
        if (token) {
          try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            userId = decoded.userId || decoded.id || '';
          } catch (e) {
            console.error('解析token失败:', e);
          }
        }

        // 使用  前缀
        let url = `${API_URL}/devices`;
        if (userId) {
          url += `?user_id=${userId}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('获取设备列表失败');
        }
        const data = await response.json();
        setDevices(data);

        const devicesWithStreams = data.filter(device => 
          device.pull_url && 
          device.pull_url !== "播流地址还没开放" &&
          device.pull_url !== "null" &&
          device.pull_url !== null
        );
        preloadStreams(devicesWithStreams);
        
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

  // 初始化 HLS 播放器（保持原有逻辑）
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

  // 组件卸载时清理资源（保持原有逻辑）
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

      const res = await fetch(`${API_URL}/oss/upload`, {
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

      showMessage('上传成功');
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 3000);
      return accessUrl;
    } catch (err) {
      console.error('上传失败:', err);
      setUploadProgress(-1);
      showMessage('上传失败', 'error');
      throw err;
    }
  };

  // 截图功能（保持原有逻辑）
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

      const fileName = `screenshot_${currentDevice?.device_id || 'unknown'}_${Date.now()}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      handleUpload(file).then(url => {
        showMessage('截图已保存');
      }).catch(console.error);
    }, 'image/png');
  };

  // 开始录制（保持原有逻辑）
  const startRecording = () => {
    if (!videoRef.current || !isVideoReady) return;

    const stream = videoRef.current.captureStream();
    if (!stream) {
      showMessage('浏览器不支持录制功能', 'warning');
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
      const fileName = `recording_${currentDevice?.device_id || 'unknown'}_${Date.now()}.webm`;
      const file = new File([blob], fileName, { type: 'video/webm' });

      handleUpload(file).then(url => {
        showMessage('录制已保存');
      }).catch(console.error);

      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordingTime(0);

    recordingTimerRef.current = setTimeout(() => {
      stopRecording();
    }, 6000);

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

  // 停止录制（保持原有逻辑）
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      clearTimeout(recordingTimerRef.current);
      setIsRecording(false);
    }
  };

  // 提取actionKey获取函数（保持原有逻辑）
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

  // 获取操作名称（保持原有逻辑）
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

  // ===================================================================
  // ▼▼▼ 核心修正 2: 修改 sendControlRequest 函数 ▼▼▼
  // ===================================================================
  const sendControlRequest = async (url, method = 'POST', data = null, showSuccessMessage = true) => {
    if (!currentDeviceCode) {
      showMessage('请先选择并播放一个设备', 'warning');
      return;
    }

    try {
      const actionKey = getActionKey(url);
      setControlStatus(prev => ({ ...prev, [actionKey]: 'loading' }));

      // 将硬编码的 'http://localhost:5000' 替换为 API_URL
      const response = await axios({
        method,
        url: `${API_URL}${url}`, // 使用 API_URL 变量
        data,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setControlStatus(prev => ({ ...prev, [actionKey]: 'success' }));
      
      if (showSuccessMessage) {
        const actionName = getActionName(actionKey);
        showMessage(`${actionName}操作成功`);
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
      showMessage(errorMsg, 'error');
      setTimeout(() => {
        setControlStatus(prev => ({ ...prev, [actionKey]: '' }));
      }, 2000);
    }
  };
  // ===================================================================

  // 云台方向控制（保持原有逻辑）
  const startRotation = (direction) => {
    if (!currentDeviceCode) return;
    setIsRotating(true);
    sendControlRequest(`/device-preset/rotation/${direction}?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  const stopRotation = () => {
    if (!currentDeviceCode || !isRotating) return;
    setIsRotating(false);
    sendControlRequest(`/device-preset/rotation/15?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  // 云台复位（保持原有逻辑）
  const resetRotation = () => {
    sendControlRequest(`/device-preset/reset?device_code=${currentDeviceCode}`);
  };

  // 变焦控制（保持原有逻辑）
  const controlZoom = (zoomType) => {
    sendControlRequest(`/device/decrease/${zoomType}?device_code=${currentDeviceCode}`, 'POST', null, false);
  };

  // 加热控制（保持原有逻辑）
  const controlHeating = (action) => {
    const actionText = action === 1 ? '开启' : '关闭';
    sendControlRequest('/device/heating-action', 'POST', {
      device_code: currentDeviceCode,
      heating_action: action
    }).then(() => {
      showMessage(`加热${actionText}成功`);
    });
  };

  // 雨刮控制（保持原有逻辑）
  const controlWiper = () => {
    sendControlRequest(`/device-preset/wiper?device_code=${currentDeviceCode}`);
  };

  // 拍摄视频（保持原有逻辑）
  const captureVideo = () => {
    sendControlRequest('/hub/device-video-by-device-code', 'POST', {
      device_code: currentDeviceCode
    });
  };

  // 设备抓拍（保持原有逻辑）
  const captureDeviceSnap = () => {
    sendControlRequest(`/hub/device-snap-by-device-code?deviceCode=${currentDeviceCode}`);
  };

  // 获取流地址
  const fetchStreamUrl = async (deviceId, deviceCode) => {
    const currentDevice = devices.find(d => d.device_id === deviceId);
    if (currentDevice?.pull_url && currentDevice.pull_url !== "播流地址还没开放") {
      if (window.confirm("该设备已有播流地址，是否先关闭当前播流再获取新地址？")) {
        await handleStopStream(deviceCode, deviceId);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        return;
      }
    }

    try {
      setLoading(true);
      const streamResponse = await axios.post(
        `${API_URL}/devices/${deviceId}/stream-url`,
        { device_code: deviceCode }
      );

      if (streamResponse.data.streamUrl) {
        await axios.put(
          `${API_URL}/devices/${deviceId}/stream-url`,
          { pull_url: streamResponse.data.streamUrl }
        );

        const updatedDevices = devices.map(device =>
          device.device_id === deviceId
            ? { ...device, pull_url: streamResponse.data.streamUrl }
            : device
        );
        setDevices(updatedDevices);

        startStreamAvailabilityCheck(deviceId);
        showMessage("开始获取播流地址，请等待...");
      } else {
        setError("未能获取有效的播流地址");
      }
    } catch (err) {
      setError("获取或更新播流地址失败: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 启动流可用性检查（保持原有逻辑）
  const startStreamAvailabilityCheck = (deviceId) => {
    stopStreamAvailabilityCheck(deviceId);
    streamCheckCountRef.current[deviceId] = 0;
  
    const intervalId = setInterval(async () => {
      const currentDevice = devicesRef.current.find(d => d.device_id === deviceId);
      const currentStreamUrl = currentDevice?.pull_url;
  
      if (!currentDevice || !currentStreamUrl || currentStreamUrl === "播流地址还没开放") {
        stopStreamAvailabilityCheck(deviceId);
        return;
      }
  
      if (streamCheckCountRef.current[deviceId] >= 8) {
        stopStreamAvailabilityCheck(deviceId);
        setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
        showMessage(`播流地址访问超时，自动关闭播流`, 'error');
        // 6次失败后自动关闭播流
        handleStopStream(currentDevice.device_code, deviceId);
        return;
      }
  
      try {
        const isAvailable = await checkStreamAvailability(currentStreamUrl);
        streamCheckCountRef.current[deviceId] += 1;
  
        if (isAvailable) {
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: true }));
          showMessage(`播流地址已就绪: ${currentStreamUrl}`);
        } else if (streamCheckCountRef.current[deviceId] >= 8) {
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
          showMessage(`播流地址访问超时,请检查设备状态,自动关闭播流`, 'error');
          // 6次失败后自动关闭播流
          handleStopStream(currentDevice.device_code, deviceId);
        }
      } catch (error) {
        streamCheckCountRef.current[deviceId] += 1;
        if (streamCheckCountRef.current[deviceId] >= 8) {
          stopStreamAvailabilityCheck(deviceId);
          setStreamAvailability(prev => ({ ...prev, [deviceId]: false }));
          showMessage(`播流地址访问超时，自动关闭播流`, 'error');
          // 6次失败后自动关闭播流
          handleStopStream(currentDevice.device_code, deviceId);
        }
      }
    }, 6000);
  
    setStreamCheckIntervals(prev => ({ ...prev, [deviceId]: intervalId }));
  };

  // 停止流可用性检查（保持原有逻辑）
  const stopStreamAvailabilityCheck = (deviceId) => {
    setStreamCheckIntervals(prevIntervals => {
      const intervalId = prevIntervals[deviceId];
      if (intervalId) {
        clearInterval(intervalId);
      }
      const newIntervals = { ...prevIntervals };
      delete newIntervals[deviceId];
      return newIntervals;
    });

    if (streamCheckCountRef.current[deviceId] !== undefined) {
      delete streamCheckCountRef.current[deviceId];
    }
  };

  // 组件卸载时清理所有资源（保持原有逻辑）
  useEffect(() => {
    return () => {
      Object.values(streamCheckIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });

      if (availabilityCheckRef.current) {
        clearInterval(availabilityCheckRef.current);
      }

      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }

      if (hlsPlayer) {
        hlsPlayer.destroy();
      }
    };
  }, [streamCheckIntervals, hlsPlayer]);

  // 关闭播流
  const handleStopStream = async (deviceCode, deviceId) => {
    if (!deviceCode) {
      setError("设备代码不能为空，无法关闭播流");
      return;
    }

    stopStreamAvailabilityCheck(deviceId);

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
        `${API_URL}/devices/stop-stream`,
        { deviceCode }
      );

      if (response.data.success) {
        await axios.put(
          `${API_URL}/devices/${deviceId}/stream-url`,
          { pull_url: "播流地址还没开放" }
        );

        const updatedDevices = devices.map(device =>
          device.device_id === deviceId
            ? { ...device, pull_url: "播流地址还没开放" }
            : device
        );
        setDevices(updatedDevices);

        setStreamAvailability(prev => ({
          ...prev,
          [deviceId]: false
        }));

        showMessage("播流已成功关闭");
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
    return (
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <MainContent>
          <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
            <CircularProgress />
          </Box>
        </MainContent>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <MainContent>
          <Alert severity="error">{error}</Alert>
        </MainContent>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <MainContent>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          报警分析
        </Typography>


        {/* 视频播放区域 */}
        {currentStream ? (
          <VideoContainer elevation={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {username && (
                    <Chip 
                      label={username} 
                      size="small" 
                      color="primary" 
                      sx={{ mr: 1 }} 
                    />
                  )}
                  {currentDevice ? currentDevice.device_name : '无设备'}
                </Typography>
                {/* =================================================================== */}
                {/* ▼▼▼ 核心修正 1: 添加 component="div" 修复 Hydration 错误 ▼▼▼ */}
                {/* =================================================================== */}
                <Typography variant="body2" color="text.secondary" component="div">
                  {currentDevice && `设备ID: ${currentDevice.device_id}`}
                  {currentStream && (
                    <Chip 
                      label="正在播放" 
                      size="small" 
                      color="success" 
                      sx={{ ml: 1 }} 
                    />
                  )}
                </Typography>
                {/* =================================================================== */}
              </Box>

              {/* 控制按钮区域 */}
              <Box>
                {/* 截图按钮 */}
                <Button
                  onClick={captureScreenshot}
                  disabled={!isVideoReady}
                  variant="outlined"
                  startIcon={<CameraIcon />}
                  sx={{ mr: 1 }}
                >
                  拍摄截图
                </Button>

                {/* 录制按钮 */}
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!isVideoReady}
                  variant={isRecording ? "contained" : "outlined"}
                  color={isRecording ? "error" : "primary"}
                  startIcon={isRecording ? <StopIcon /> : <VideoIcon />}
                  sx={isRecording ? {
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.7 },
                      '100%': { opacity: 1 },
                    }
                  } : {}}
                >
                  {isRecording ? `停止录制 (${recordingTime.toFixed(1)}s)` : '录制5秒'}
                </Button>
              </Box>
            </Box>

            {/* 视频播放器 */}
            <Box position="relative">
              <VideoPlayer
                ref={videoRef}
                controls
                key={currentStream}
              />

              {/* HLS支持警告 */}
              {!hlsSupported && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  当前浏览器不支持HLS播放，请使用Chrome/Firefox/Edge等现代浏览器
                </Alert>
              )}
            </Box>

            {/* 上传进度显示 */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">上传进度:</Typography>
                  <Typography variant="body2">{uploadProgress}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}

            {uploadProgress === 100 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                上传完成!
              </Alert>
            )}

            {uploadProgress === -1 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                上传失败!
              </Alert>
            )}

            {/* 设备控制区域 */}
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                设备控制
              </Typography>

              <Grid container spacing={3}>
                {/* 云台控制 - 仅当设备不是枪机时显示 */}
                {currentDevice?.device_name !== '枪机' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="云台控制" subheader="按住按钮转动，松开停止" />
                        <CardContent>
                          <Box display="flex" flexDirection="column" alignItems="center">
                            {/* 第一行 - 左上、上、右上 */}
                            <Box display="flex" mb={1}>
                              <DirectionButton
                                onMouseDown={() => startRotation(22)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(22)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <BeforeIcon sx={{ transform: 'rotate(45deg)' }} />
                              </DirectionButton>
                              <DirectionButton
                                onMouseDown={() => startRotation(11)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(11)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <UpIcon />
                              </DirectionButton>
                              <DirectionButton
                                onMouseDown={() => startRotation(24)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(24)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <NextIcon sx={{ transform: 'rotate(-45deg)' }} />
                              </DirectionButton>
                            </Box>

                            {/* 第二行 - 左、复位、右 */}
                            <Box display="flex" mb={1}>
                              <DirectionButton
                                onMouseDown={() => startRotation(13)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(13)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <LeftIcon />
                              </DirectionButton>
                              <Button
                                onClick={resetRotation}
                                disabled={!currentDeviceCode}
                                variant="outlined"
                                startIcon={<CenterIcon />}
                                sx={{ mx: 1, minWidth: 'auto' }}
                              >
                                复位
                              </Button>
                              <DirectionButton
                                onMouseDown={() => startRotation(14)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(14)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <RightIcon />
                              </DirectionButton>
                            </Box>

                            {/* 第三行 - 左下、下、右下 */}
                            <Box display="flex">
                              <DirectionButton
                                onMouseDown={() => startRotation(23)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(23)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <BeforeIcon sx={{ transform: 'rotate(-45deg)' }} />
                              </DirectionButton>
                              <DirectionButton
                                onMouseDown={() => startRotation(12)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(12)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <DownIcon />
                              </DirectionButton>
                              <DirectionButton
                                onMouseDown={() => startRotation(25)}
                                onMouseUp={stopRotation}
                                onMouseLeave={stopRotation}
                                onTouchStart={() => startRotation(25)}
                                onTouchEnd={stopRotation}
                                disabled={!currentDeviceCode}
                              >
                                <NextIcon sx={{ transform: 'rotate(45deg)' }} />
                              </DirectionButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* 变焦控制 */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="变焦控制" />
                        <CardContent>
                          <Box display="flex" flexWrap="wrap" justifyContent="center">
                            <ControlButton
                              onClick={() => controlZoom('zoom-out-max')}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<ZoomOutIcon />}
                            >
                              MAX --
                            </ControlButton>
                            <ControlButton
                              onClick={() => controlZoom('zoom-out')}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<ZoomOutIcon />}
                            >
                              -
                            </ControlButton>
                            <ControlButton
                              onClick={() => controlZoom('zoom-in-max')}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<ZoomInIcon />}
                            >
                              MAX ++
                            </ControlButton>
                            <ControlButton
                              onClick={() => controlZoom('zoom-in')}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<ZoomInIcon />}
                            >
                              +
                            </ControlButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}

                {/* 其他控制 */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader title="其他控制" />
                    <CardContent>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {/* 仅当设备不是枪机时显示加热和雨刮控制 */}
                        {currentDevice?.device_name !== '枪机' && (
                          <>
                            <ControlButton
                              onClick={() => controlHeating(1)}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<HeatIcon />}
                            >
                              开启加热
                            </ControlButton>
                            <ControlButton
                              onClick={() => controlHeating(0)}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<HeatIcon />}
                            >
                              关闭加热
                            </ControlButton>
                            <ControlButton
                              onClick={controlWiper}
                              disabled={!currentDeviceCode}
                              variant="outlined"
                              startIcon={<WipeIcon />}
                            >
                              雨刮控制
                            </ControlButton>
                          </>
                        )}

                        {/* 以下两个按钮始终显示 */}
                        <ControlButton
                          onClick={captureVideo}
                          disabled={!currentDeviceCode}
                          variant="outlined"
                          startIcon={<VideoIcon />}
                        >
                          拍摄视频
                        </ControlButton>
                        <ControlButton
                          onClick={captureDeviceSnap}
                          disabled={!currentDeviceCode}
                          variant="outlined"
                          startIcon={<CameraIcon />}
                        >
                          设备抓拍
                        </ControlButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </VideoContainer>
        ) : (
          /* 无流提示 */
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <VideoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              暂无播放流
            </Typography>
            <Typography variant="body2" color="text.secondary">
              请从下方列表中选择一个在线设备的流进行播放
            </Typography>
          </Paper>
        )}

        {/* 设备列表区域 */}
        <Paper elevation={3} sx={{ p: 3 ,mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            设备流地址列表
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            显示所有设备的推流和播流信息
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>设备ID</TableCell>
                  <TableCell>设备名称</TableCell>
                  <TableCell>播流地址</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map(device => (
                  <TableRow 
                    key={device.device_id} 
                    sx={{ 
                      opacity: device.status ? 1 : 0.6,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <TableCell>{device.device_id}</TableCell>
                    <TableCell>{device.device_name}</TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography 
                        variant="body2" 
                        noWrap 
                        title={device.pull_url}
                        sx={{ color: 'text.secondary' }}
                      >
                        {device.pull_url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={device.status ? '在线' : '离线'}
                        status={device.status ? 'online' : 'offline'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {/* 播放按钮 */}
                        <Button
                          onClick={() => playStream(device.pull_url, device)}
                          disabled={
                            !device.status ||
                            !hlsSupported ||
                            device.pull_url === "播流地址还没开放" ||
                            streamAvailability[device.device_id] !== true
                          }
                          variant="outlined"
                          size="small"
                          startIcon={<PlayIcon />}
                          sx={{ minWidth: 'auto' }}
                          title={!device.status ? "设备离线" :
                            !hlsSupported ? "浏览器不支持HLS" :
                              device.pull_url === "播流地址还没开放" ? "无播流地址" :
                                streamAvailability[device.device_id] !== true ? "流不可用" : "点击播放"}
                        >
                          {streamAvailability[device.device_id] === true ? '播放' :
                            streamAvailability[device.device_id] === false ? '不可用' :
                              '检查中...'}
                        </Button>

                        {/* 获取播流地址按钮 */}
                        <Button
                          onClick={() => fetchStreamUrl(device.device_id, device.device_code)}
                          variant="outlined"
                          size="small"
                          color="secondary"
                          disabled={!device.device_code || (device.pull_url && device.pull_url !== "播流地址还没开放")}
                          title={!device.device_code ? "需要先设置设备代码" :
                            (device.pull_url && device.pull_url !== "播流地址还没开放") ? "已有播流地址，点击会重新获取" : ""}
                        >
                          {device.pull_url && device.pull_url !== "播流地址还没开放" ? "重新获取" : "获取播流地址"}
                        </Button>

                        {/* 关闭播流按钮 */}
                        <Button
                          onClick={() => handleStopStream(device.device_code, device.device_id)}
                          variant="outlined"
                          size="small"
                          color="error"
                          disabled={!device.device_code || !device.pull_url || device.pull_url === "播流地址还没开放"}
                          title={!device.device_code ? "需要设备代码" : (!device.pull_url || device.pull_url === "播流地址还没开放" ? "没有活跃的播流" : "")}
                        >
                          关闭播流
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 消息提示 */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbarSeverity} 
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </MainContent>
    </Box>
  );
};

export default EquipmentVideoPlayback;