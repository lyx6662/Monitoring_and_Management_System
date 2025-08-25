import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Pagination,
  IconButton,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Divider,
  styled // 添加 styled 导入
} from '@mui/material';
import {
  PlayArrow,
  Close,
  CameraAlt,
  Refresh,
  Info,
  Warning,
  CheckCircle,
  SelectAll,
  Visibility
} from '@mui/icons-material';
import Sidebar from '../Sidebar/Sidebar';

import { useThemeContext } from '../ThemeContext/ThemeContext';

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




const DeviceImageAndVideoDisplay = () => {
  const { theme } = useThemeContext();
  // 设备相关状态
  const [devices, setDevices] = useState([]);
  const [selectedDeviceCode, setSelectedDeviceCode] = useState('');
  const [deviceImages, setDeviceImages] = useState([]);
  const [deviceImagePage, setDeviceImagePage] = useState(1);
  const [totalDeviceImagePages, setTotalDeviceImagePages] = useState(1);
  const [deviceImageDate, setDeviceImageDate] = useState('');

  // 设备视频相关状态
  const [deviceVideos, setDeviceVideos] = useState([]);
  const [deviceVideoPage, setDeviceVideoPage] = useState(1);
  const [totalDeviceVideoPages, setTotalDeviceVideoPages] = useState(1);
  const [deviceVideoDate, setDeviceVideoDate] = useState('');

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
        `http://116.62.54.160:5000/api/picture/get-by-device-code?deviceCode=${selectedDeviceCode}&page=${page}&size=${size}&day=${deviceImageDate}`,
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
        `http://116.62.54.160:5000/api/alarm/query-early-alarm?page=${page}&size=${size}`,
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

  // 创建报警
  const handleCreateAlarm = async (image) => {
    if (!alarmCause || !alarmLevel) {
      setError('请选择报警原因和紧急程度');
      return;
    }

    try {
      setIsCreatingAlarm(true);
      setError('');

      const response = await fetch('http://116.62.54.160:5000/api/alarm/create', {
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

      const response = await fetch('http://116.62.54.160:5000/api/ai-vision-check', {
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
  // 同时禁用html和body的滚动
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
};

  // 关闭媒体预览
const closeMediaPreview = () => {
  setIsPreviewOpen(false);
  setPreviewMedia({ url: '', type: '' });
  // 同时恢复html和body的滚动
  document.documentElement.style.overflow = 'auto';
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
    return Array.isArray(deviceImages) ? deviceImages : [];
  };

  // 获取当前页的设备视频 - 修复版本
  const getCurrentPageDeviceVideos = () => {
    return Array.isArray(deviceVideos) ? deviceVideos : [];
  };

  // 获取当前页的报警图片 - 修复版本
  const getCurrentPageAlarmImages = () => {
    return Array.isArray(alarmImages) ? alarmImages : [];
  };

  // 渲染AI检测结果
  const renderAiResults = () => {
    if (aiResults.length === 0) return null;

    return (
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          AI检测结果
        </Typography>
        <Grid container spacing={2}>
          {aiResults.map((result, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card variant="outlined" sx={{
                borderColor: result.status === 'error' ? 'error.main' : result.isAlarmValid ? 'success.main' : 'warning.main'
              }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={result.imageUrl}
                  alt={`结果-${index}`}
                />
                <CardContent>
                  <Typography variant="body2" gutterBottom>
                    <strong>引发原因:</strong> {result.cause.split(',').map(cause => {
                      const trimmedCause = cause.trim();
                      return CAUSES_MAPPING[trimmedCause] || `未知(${trimmedCause})`;
                    }).join('、')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>判断结果:</strong>
                    <Chip
                      label={result.isAlarmValid ? '正确' : '错误'}
                      size="small"
                      color={result.isAlarmValid ? 'success' : 'error'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  {result.newUrl && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>存储位置:</strong> {result.isAlarmValid ? 'check_1' : 'check_2'}
                    </Typography>
                  )}
                  {result.error && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      <strong>错误:</strong> {result.error}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  // 渲染报警选择模态框
  const renderAlarmModal = () => {
    if (!selectedImageForAlarm) return null;

    return (
      <Dialog
        open={!!selectedImageForAlarm}
        onClose={() => setSelectedImageForAlarm(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          创建报警
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>报警原因</InputLabel>
              <Select
                multiple
                value={alarmCause.split(',')}
                onChange={(e) => setAlarmCause(e.target.value.join(','))}
                label="报警原因"
                renderValue={(selected) => selected.map(val => CAUSES_MAPPING[val] || val).join(', ')}
              >
                {Object.entries(CAUSES_MAPPING).map(([key, value]) => (
                  <MenuItem key={key} value={key}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>紧急程度</InputLabel>
              <Select
                value={alarmLevel}
                onChange={(e) => setAlarmLevel(e.target.value)}
                label="紧急程度"
              >
                <MenuItem value="">请选择紧急程度</MenuItem>
                <MenuItem value="1">紧急</MenuItem>
                <MenuItem value="2">不紧急</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedImageForAlarm(null)}>取消</Button>
          <Button
            onClick={() => handleCreateAlarm(selectedImageForAlarm)}
            disabled={isCreatingAlarm || !alarmCause || !alarmLevel}
            variant="contained"
          >
            {isCreatingAlarm ? '创建中...' : '创建报警'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // 渲染设备图片区域
  const renderDeviceImageSection = () => {
    const currentImages = getCurrentPageDeviceImages();
    return (
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CameraAlt sx={{ mr: 1 }} /> 设备图片
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>选择设备</InputLabel>
            <Select
              value={selectedDeviceCode}
              onChange={(e) => setSelectedDeviceCode(e.target.value)}
              disabled={loading || devices.length === 0}
              label="选择设备"
            >
              {devices.length === 0 ? (
                <MenuItem value="">无可用设备</MenuItem>
              ) : (
                devices.map((device) => (
                  <MenuItem key={device.device_id} value={device.device_code}>
                    {device.device_name} ({device.device_code})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            label="选择日期"
            type="date"
            value={deviceImageDate}
            onChange={(e) => setDeviceImageDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          />

          <Button
            onClick={() => {
              setDeviceImageDate('');
              loadDeviceImages(1);
            }}
            variant="outlined"
          >
            查看全部
          </Button>

          <Button
            onClick={handleDeviceSnap}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
            variant="contained"
            startIcon={<CameraAlt />}
          >
            {loading ? '抓拍中...' : '设备抓拍'}
          </Button>

          <Button
            onClick={handleGetDeviceStatus}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
            variant="outlined"
            startIcon={<Info />}
          >
            {isGettingStatus ? '获取中...' : '设备状态'}
          </Button>

          <Button
            onClick={handleDeviceRestart}
            disabled={loading || !selectedDeviceCode || devices.length === 0 || isGettingStatus || isRestarting}
            variant="outlined"
            color="warning"
            startIcon={<Refresh />}
          >
            {isRestarting ? '重启中...' : '设备重启'}
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : currentImages.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
            没有设备图片
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {currentImages.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="img"
                    height="200"
                    image={file.url}
                    alt={file.path}
                    onClick={() => openMediaPreview(file.url, 'image')}
                    sx={{ cursor: 'pointer' }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      拍摄时间: {file.createdAt}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      抓拍类型: {file.snapType === 'manual-snap' ? '手动抓拍' : '自动抓拍'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => setSelectedImageForAlarm(file)}
                      disabled={isCreatingAlarm}
                    >
                      报警
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {totalDeviceImagePages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalDeviceImagePages}
              page={deviceImagePage}
              onChange={(e, page) => loadDeviceImages(page)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    );
  };

  // 渲染设备视频区域
  const renderDeviceVideoSection = () => {
    const currentVideos = getCurrentPageDeviceVideos();
    return (
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <PlayArrow sx={{ mr: 1 }} /> 设备视频
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          <TextField
            label="选择日期"
            type="date"
            value={deviceVideoDate}
            onChange={(e) => setDeviceVideoDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          />

          <Button
            onClick={() => {
              setDeviceVideoDate('');
              loadDeviceVideos(1);
            }}
            variant="outlined"
          >
            查看全部
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : currentVideos.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
            没有设备视频
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {currentVideos.map((video, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardMedia
                    component="video"
                    height="200"
                    src={video.url}
                    onClick={() => openMediaPreview(video.url, 'video')}
                    sx={{ cursor: 'pointer' }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      录制时间: {video.createdAt}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      状态: {video.status === '1' ? '正常' : '异常'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {totalDeviceVideoPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalDeviceVideoPages}
              page={deviceVideoPage}
              onChange={(e, page) => loadDeviceVideos(page)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    );
  };

  // 渲染报警图片区域
  const renderAlarmImageSection = () => {
    const currentImages = getCurrentPageAlarmImages();
    return (
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          报警图片
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
          <Button
            onClick={toggleSelectAllAlarmImages}
            disabled={loading || currentImages.length === 0}
            variant="outlined"
            startIcon={<SelectAll />}
          >
            {selectedAlarmImages.length === currentImages.length ? '取消全选' : '全选当前页'}
          </Button>

          <Button
            onClick={handleAiVisionCheck}
            disabled={loading || selectedAlarmImages.length === 0 || isAiChecking}
            variant="contained"
            startIcon={isAiChecking ? <CircularProgress size={16} /> : <Warning />}
          >
            {isAiChecking ? '检测中...' : `AI检测 (${selectedAlarmImages.length})`}
          </Button>

          <Typography variant="body2">
            已选择 {selectedAlarmImages.length} 张图片
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : currentImages.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
            没有报警图片
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {currentImages.map((file, index) => {
              const isSelected = selectedAlarmImages.some(img => img.id === file.id);

              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    sx={{
                      position: 'relative',
                      border: isSelected ? '2px solid' : 'none',
                      borderColor: 'primary.main'
                    }}
                    onClick={() => toggleAlarmImageSelection(file)}
                  >
                    {isSelected && (
                      <CheckCircle
                        color="primary"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          bgcolor: 'background.paper',
                          borderRadius: '50%'
                        }}
                      />
                    )}
                    <CardMedia
                      component="img"
                      height="200"
                      image={file.url}
                      alt={file.name || file.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openMediaPreview(file.url, 'image');
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        报警时间: {file.createdAt}
                      </Typography>
                      {file.alarmType && (
                        <Typography variant="body2" color="text.secondary">
                          报警类型: {file.alarmType}
                        </Typography>
                      )}
                      {file.causes && (
                        <Typography variant="body2" color="text.secondary">
                          引发原因: {file.causes.split(',').map(cause => {
                            const trimmedCause = cause.trim();
                            return CAUSES_MAPPING[trimmedCause] || `未知(${trimmedCause})`;
                          }).join('、')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {totalAlarmImagePages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalAlarmImagePages}
              page={alarmImagePage}
              onChange={(e, page) => loadAlarmImages(page)}
              color="primary"
            />
          </Box>
        )}

        {/* 显示AI检测结果 */}
        {renderAiResults()}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      
      <MainContent component="main">
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          报警分析
        </Typography>

        {/* 设备图片区域 */}
        {renderDeviceImageSection()}

        {/* 设备视频区域 */}
        {renderDeviceVideoSection()}

        {/* 报警图片区域 */}
        {renderAlarmImageSection()}
      </MainContent>

      {/* 媒体预览模态框 */}
      <Dialog
        open={isPreviewOpen}
        onClose={closeMediaPreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          媒体预览
          <IconButton
            aria-label="close"
            onClick={closeMediaPreview}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewMedia.type === 'image' && (
            <img
              src={previewMedia.url}
              alt="预览图"
              style={{ width: '100%', height: 'auto' }}
            />
          )}

          {previewMedia.type === 'video' && (
            <video
              src={previewMedia.url}
              style={{ width: '100%', height: 'auto' }}
              controls
              autoPlay
              playsInline
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 设备状态弹窗 */}
      <Dialog
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          设备状态信息
          <IconButton
            aria-label="close"
            onClick={() => setShowStatusModal(false)}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {deviceStatus ? (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                {Object.entries(formatDeviceStatus(deviceStatus)).map(([key, value]) => (
                  <Grid item xs={12} sm={6} key={key}>
                    <Box sx={{
                      p: 1.5,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {key}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {value}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
              未获取到设备状态数据
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatusModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 报警创建模态框 */}
      {renderAlarmModal()}
    </Box>
  );
};

export default DeviceImageAndVideoDisplay;