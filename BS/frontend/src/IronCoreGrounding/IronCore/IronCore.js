import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  styled,
  Divider,
  Alert,
  Card,
  CardContent,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Wifi,
  SettingsEthernet,
  TrendingUp,
  PlayArrow,
  Stop,
  Send,
  Settings
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SidebarIron from '../SidebarIron/SidebarIron';

// 使用styled组件创建自定义样式
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

const FormContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const ChartContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: 400,
  marginTop: theme.spacing(3),
}));

const StatusIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'connected'
})(({ theme, connected }) => ({
  display: 'inline-block',
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: connected ? '#4caf50' : '#f44336',
  marginRight: theme.spacing(1),
}));

const ControlPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
}));

const IronCore = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ipAddress, setIpAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latestData, setLatestData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [sendInterval, setSendInterval] = useState(5000);
  const [autoSending, setAutoSending] = useState(false);
  const [serialStatus, setSerialStatus] = useState(false);
  const webSocket = useRef(null);
  const dataLimit = 50;

  // 初始化图表数据
  useEffect(() => {
    const initialData = Array.from({ length: 10 }, (_, i) => ({
      time: i,
      coreCurrent: 0,
      clampCurrent: 0,
      standbyCurrent: 0
    }));
    setChartData(initialData);
  }, []);

  // 清理WebSocket连接
  useEffect(() => {
    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, []);

  const sendCommand = (type, data = {}) => {
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, ...data });
      webSocket.current.send(message);
    }
  };

  const connectWebSocket = (url) => {
    setConnectionStatus('connecting');
    setError('');
    
    try {
      webSocket.current = new WebSocket(url);
      
      webSocket.current.onopen = () => {
        setConnectionStatus('connected');
        setSuccess('连接成功');
        setTimeout(() => setSuccess(''), 3000);
        // 连接成功后获取当前状态
        sendCommand('GET_STATUS');
      };
      
      webSocket.current.onmessage = (event) => {
        try {
          // 尝试解析为JSON
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'STATUS') {
              // 状态信息
              setSendInterval(message.interval);
              setAutoSending(message.autoSending);
              setSerialStatus(message.serialOpen);
              return;
            } else if (message.type === 'INTERVAL_SET') {
              setSuccess(`发送间隔设置为: ${message.interval}ms`);
              setTimeout(() => setSuccess(''), 3000);
              return;
            } else if (message.type === 'AUTO_STARTED') {
              setAutoSending(true);
              setSuccess(`自动发送已启动，间隔: ${message.interval}ms`);
              setTimeout(() => setSuccess(''), 3000);
              return;
            } else if (message.type === 'AUTO_STOPPED') {
              setAutoSending(false);
              setSuccess('自动发送已停止');
              setTimeout(() => setSuccess(''), 3000);
              return;
            }
          } catch (e) {
            // 如果不是JSON，继续处理为数据消息
          }
          
          // 处理数据消息
          const newData = JSON.parse(event.data);
          setLatestData(newData);
          
          // 更新图表数据
          setChartData(prevData => {
            const newChartData = [...prevData];
            if (newChartData.length >= dataLimit) {
              newChartData.shift();
            }
            
            const timestamp = new Date().toLocaleTimeString();
            newChartData.push({
              time: timestamp,
              coreCurrent: newData.coreCurrent || 0,
              clampCurrent: newData.clampCurrent || 0,
              standbyCurrent: newData.standbyCurrent || 0
            });
            
            return newChartData;
          });
        } catch (err) {
          console.error('解析数据失败:', err);
          setError('数据格式错误');
        }
      };
      
      webSocket.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnectionStatus('disconnected');
        setError('连接失败，请检查地址和网络');
      };
      
      webSocket.current.onclose = () => {
        setConnectionStatus('disconnected');
        setAutoSending(false);
      };
    } catch (err) {
      setConnectionStatus('disconnected');
      setError('创建连接失败: ' + err.message);
    }
  };

  const handleLocalConnect = () => {
    connectWebSocket('ws://localhost:8080');
  };

  const handleNetworkConnect = () => {
    if (!ipAddress.trim()) {
      setError('请输入设备IP地址');
      return;
    }
    
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
    if (!ipPattern.test(ipAddress)) {
      setError('请输入有效的IP地址（格式: 192.168.1.1 或 192.168.1.1:8080）');
      return;
    }
    
    const finalAddress = ipAddress.includes(':') ? ipAddress : `${ipAddress}:8080`;
    connectWebSocket(`ws://${finalAddress}`);
  };

  const handleDisconnect = () => {
    if (webSocket.current) {
      webSocket.current.close();
      setConnectionStatus('disconnected');
      setAutoSending(false);
      setSuccess('连接已断开');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleSetInterval = () => {
    sendCommand('SET_INTERVAL', { interval: sendInterval });
  };

  const handleSendNow = () => {
    sendCommand('SEND_NOW');
  };

  const handleStartAuto = () => {
    sendCommand('START_AUTO');
  };

  const handleStopAuto = () => {
    sendCommand('STOP_AUTO');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SidebarIron />
      <MainContent component="main">
        <Typography variant="h4" gutterBottom>
          铁芯接地装置监测
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* 连接控制面板 */}
        <FormContainer elevation={3}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            {/* 修正这里：使用 connected 而不是 $connected */}
            <StatusIndicator connected={connectionStatus === 'connected'} />
            设备连接
          </Typography>
          
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SettingsEthernet />}
                onClick={handleLocalConnect}
                disabled={connectionStatus !== 'disconnected'}
                color="primary"
              >
                本地连接
              </Button>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="输入局域网或公网设备IP"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="例如: 192.168.1.100 或 192.168.1.100:8080"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Wifi />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Wifi />}
                onClick={handleNetworkConnect}
                disabled={connectionStatus !== 'disconnected'}
                color="secondary"
              >
                网络连接
              </Button>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleDisconnect}
                disabled={connectionStatus === 'disconnected'}
                color="error"
              >
                断开连接
              </Button>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1" component="div">
              状态: 
              <Chip 
                label={
                  connectionStatus === 'connected' ? '已连接' : 
                  connectionStatus === 'connecting' ? '连接中...' : '未连接'
                } 
                color={
                  connectionStatus === 'connected' ? 'success' : 
                  connectionStatus === 'connecting' ? 'warning' : 'default'
                } 
                sx={{ ml: 1 }}
              />
              {serialStatus && (
                <Chip 
                  label="串口已打开" 
                  color="success" 
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            
            {latestData && (
              <Typography variant="body2" color="text.secondary">
                最后更新: {new Date().toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </FormContainer>

        {/* 发送控制面板 */}
        {connectionStatus === 'connected' && (
          <ControlPanel elevation={2}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Settings sx={{ mr: 1 }} />
              发送控制
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    发送间隔:
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={sendInterval}
                    onChange={(e) => setSendInterval(Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ms</InputAdornment>,
                    }}
                    sx={{ width: 120, mr: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSetInterval}
                  >
                    设置
                  </Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSendNow}
                  color="info"
                >
                  立即发送
                </Button>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PlayArrow />}
                  onClick={handleStartAuto}
                  disabled={autoSending}
                  color="success"
                >
                  启动自动
                </Button>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Stop />}
                  onClick={handleStopAuto}
                  disabled={!autoSending}
                  color="error"
                >
                  停止自动
                </Button>
              </Grid>
            </Grid>
            
            {autoSending && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                自动发送中，间隔: {sendInterval}ms
              </Typography>
            )}
          </ControlPanel>
        )}

        {/* 实时数据展示 */}
        {latestData && (
          <FormContainer elevation={3}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} />
              实时监测数据
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      铁芯电流值
                    </Typography>
                    <Typography variant="h4" component="div">
                      {latestData.coreCurrent} uA
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      夹件电流值
                    </Typography>
                    <Typography variant="h4" component="div">
                      {latestData.clampCurrent} uA
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      备用电流值
                    </Typography>
                    <Typography variant="h4" component="div">
                      {latestData.standbyCurrent} uA
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </FormContainer>
        )}

        {/* 折线图展示 */}
        <ChartContainer elevation={3}>
          <Typography variant="h5" gutterBottom>
            数据趋势图
          </Typography>
          
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time" 
                allowDuplicatedCategory={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: '电流值 (uA)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="coreCurrent" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                strokeWidth={2}
                name="铁芯电流"
              />
              <Line 
                type="monotone" 
                dataKey="clampCurrent" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="夹件电流"
              />
              <Line 
                type="monotone" 
                dataKey="standbyCurrent" 
                stroke="#ffc658" 
                strokeWidth={2}
                name="备用电流"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </MainContent>
    </Box>
  );
};

export default IronCore;