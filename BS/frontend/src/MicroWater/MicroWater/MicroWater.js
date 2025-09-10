import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Wifi,
  SettingsEthernet,
  TrendingUp,
  PlayArrow,
  Stop,
  Send,
  Settings,
  Thermostat, // 温度图标
  Compress,   // 压力图标
  WaterDrop,  // 微水图标
  Opacity,    // 露点图标
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SidebarMic from '../SidebarMic/SidebarMic'; // 复用侧边栏组件

// --- 样式定义 ---
const MainContent = styled(Box)(({ theme }) => ({
  marginLeft: 20,
  padding: theme.spacing(3),
  flexGrow: 1,
  backgroundColor: theme.palette.background.default,
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
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
  backgroundColor: connected ? theme.palette.success.main : theme.palette.error.main,
  marginRight: theme.spacing(1),
}));


const MicroWater = () => {
  // --- 状态管理 ---
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [ipAddress, setIpAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [latestData, setLatestData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [autoSending, setAutoSending] = useState(false);
  const [serialStatus, setSerialStatus] = useState(false);
  
  // 用于用户自定义命令参数的状态 (可根据微水协议设置更有意义的默认值)
  const [slaveId, setSlaveId] = useState(1);
  const [address, setAddress] = useState(129); // 示例: 0x81
  const [count, setCount] = useState(9);       // 示例: 读取9个寄存器
  const [sendInterval, setSendInterval] = useState(5000);
  
  const webSocket = useRef(null);
  const dataLimit = 50; 

  // --- 组件卸载时清理WebSocket ---
  useEffect(() => {
    return () => {
      if (webSocket.current) {
        webSocket.current.close();
      }
    };
  }, []);

  // --- 核心函数 ---
  const sendCommand = (type, data = {}) => {
    if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, ...data });
      webSocket.current.send(message);
    } else {
      setError("WebSocket未连接，无法发送指令。");
    }
  };

  const handleSendCustomCommand = (once = false) => {
    const commandData = {
        slaveId: Number(slaveId),
        address: Number(address),
        count: Number(count),
        interval: Number(sendInterval)
    };
    const commandType = once ? "SEND_ONCE" : "START_AUTO_POLL";
    sendCommand(commandType, commandData);
  };

  const connectWebSocket = (url) => {
    setConnectionStatus('connecting');
    setError('');
    
    try {
      // 关键: 连接到微水专用的8082端口
      webSocket.current = new WebSocket(url);
      
      webSocket.current.onopen = () => {
        setConnectionStatus('connected');
        setSuccess('WebSocket连接成功');
        setTimeout(() => setSuccess(''), 3000);
        sendCommand('GET_STATUS'); 
      };
      
      webSocket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type) {
            switch(message.type) {
              case 'STATUS':
                setSendInterval(message.interval);
                setAutoSending(message.autoSending);
                setSerialStatus(message.serialOpen);
                return;
              case 'AUTO_STARTED':
                setAutoSending(true);
                setSuccess(`自动轮询已启动，间隔: ${message.interval}ms`);
                setTimeout(() => setSuccess(''), 3000);
                return;
              case 'AUTO_STOPPED':
                setAutoSending(false);
                setSuccess('自动轮询已停止');
                setTimeout(() => setSuccess(''), 3000);
                return;
              default:
                break;
            }
          }
          
          setLatestData(message);
          
          setChartData(prevData => {
            const newPoint = { 
              time: message.time.split(' ')[1], 
              temperature: parseFloat(message.temperature), 
              microWater: parseFloat(message.microWater) 
            };
            const newChartData = [...prevData, newPoint];
            return newChartData.length > dataLimit ? newChartData.slice(1) : newChartData;
          });

          setTableData(prevData => [{id: Date.now(), ...message}, ...prevData]);

        } catch (err) {
          console.error('解析数据失败:', err, "原始数据:", event.data);
          setError('从服务器接收到格式错误的数据。');
        }
      };
      
      webSocket.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnectionStatus('disconnected');
        setError('连接失败，请检查地址和网络。');
      };
      
      webSocket.current.onclose = () => {
        setConnectionStatus('disconnected');
        setAutoSending(false);
        setSuccess('连接已断开。');
        setTimeout(() => setSuccess(''), 3000);
      };
    } catch (err) {
      setConnectionStatus('disconnected');
      setError('创建WebSocket连接失败: ' + err.message);
    }
  };
  
  // --- UI事件处理函数 ---
  const handleLocalConnect = () => {
    connectWebSocket('ws://localhost:8082');
  };

  const handleNetworkConnect = () => {
    if (!ipAddress.trim()) {
      setError('请输入设备IP地址。');
      return;
    }
    
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
    if (!ipPattern.test(ipAddress)) {
      setError('请输入有效的IP地址 (例如: 192.168.1.1 或 192.168.1.1:8082)');
      return;
    }
    
    const finalAddress = ipAddress.includes(':') ? ipAddress : `${ipAddress}:8082`;
    connectWebSocket(`ws://${finalAddress}`);
  };

  const handleDisconnect = () => {
    if (webSocket.current) {
      webSocket.current.close();
    }
  };
  
  return (
    <Box sx={{ display: 'flex' }}>
      <SidebarMic />
      <MainContent component="main">
        <Typography variant="h4" gutterBottom>
          微水在线监测
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* --- 连接控制面板 --- */}
                <StyledPaper elevation={3}>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
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
                        label="输入局域网或公网IP"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="例如: 192.168.1.100:8081"
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
                    {/* ▼▼▼ 这里是错误修正的地方 ▼▼▼ */}
                    <Typography variant="body1" component="div">
                      状态: 
                      <Chip label={connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中...' : '未连接'}
                            color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'default'} sx={{ ml: 1 }}/>
                      {serialStatus && <Chip label="串口已打开" color="success" variant="outlined" sx={{ ml: 1 }}/>}
                    </Typography>
                    {/* ▲▲▲ 错误修正结束 ▲▲▲ */}
                    {latestData && <Typography variant="body2" color="text.secondary">最后更新: {new Date().toLocaleTimeString()}</Typography>}
                  </Box>
                </StyledPaper>

        {/* --- 指令控制面板 --- */}
        {connectionStatus === 'connected' && (
          <StyledPaper elevation={2}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Settings sx={{ mr: 1 }} /> 指令控制
            </Typography>
             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                注意：请先在Qt程序界面点击“开始采集”以选择设备，然后再从此面板发送读取指令。
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} md={3}><TextField label="从站ID" type="number" value={slaveId} onChange={(e) => setSlaveId(e.target.value)} size="small" fullWidth/></Grid>
              <Grid item xs={6} md={3}><TextField label="起始地址(十进制)" type="number" value={address} onChange={(e) => setAddress(e.target.value)} size="small" fullWidth/></Grid>
              <Grid item xs={6} md={3}><TextField label="寄存器数量" type="number" value={count} onChange={(e) => setCount(e.target.value)} size="small" fullWidth/></Grid>
              <Grid item xs={6} md={3}><TextField label="轮询间隔 (ms)" type="number" value={sendInterval} onChange={(e) => setSendInterval(e.target.value)} size="small" fullWidth/></Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}><Button fullWidth variant="contained" color="info" startIcon={<Send />} onClick={() => handleSendCustomCommand(true)}>发送一次</Button></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="contained" color="success" startIcon={<PlayArrow />} onClick={() => handleSendCustomCommand(false)} disabled={autoSending}>启动自动轮询</Button></Grid>
              <Grid item xs={12} md={4}><Button fullWidth variant="contained" color="error" startIcon={<Stop />} onClick={() => sendCommand('STOP_AUTO')} disabled={!autoSending}>停止自动轮询</Button></Grid>
            </Grid>
            {autoSending && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>自动轮询中, 间隔: {sendInterval}ms</Typography>}
          </StyledPaper>
        )}

        {/* --- 实时数据显示 --- */}
        {latestData && (
          <StyledPaper elevation={3}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 1 }} /> 实时监测数据
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}><Card variant="outlined"><CardContent><Typography color="textSecondary" gutterBottom><WaterDrop/> 微水含量</Typography><Typography variant="h4">{latestData.microWater} ppmV</Typography></CardContent></Card></Grid>
              <Grid item xs={6} md={3}><Card variant="outlined"><CardContent><Typography color="textSecondary" gutterBottom><Thermostat/> 温度</Typography><Typography variant="h4">{latestData.temperature} °C</Typography></CardContent></Card></Grid>
              <Grid item xs={6} md={3}><Card variant="outlined"><CardContent><Typography color="textSecondary" gutterBottom><Compress/> 压力</Typography><Typography variant="h5">{latestData.pressure} MPa</Typography></CardContent></Card></Grid>
              <Grid item xs={6} md={3}><Card variant="outlined"><CardContent><Typography color="textSecondary" gutterBottom><Opacity/> 露点</Typography><Typography variant="h5">{latestData.dewPoint} °C</Typography></CardContent></Card></Grid>
            </Grid>
          </StyledPaper>
        )}

        {/* --- 数据趋势图 --- */}
        <ChartContainer elevation={3}>
          <Typography variant="h5" gutterBottom>数据趋势图</Typography>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" label={{ value: '微水含量 (ppmV)', angle: -90, position: 'insideLeft' }} stroke="#8884d8" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: '温度 (°C)', angle: -90, position: 'insideRight' }} stroke="#82ca9d" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="microWater" stroke="#8884d8" name="微水含量" activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#82ca9d" name="温度" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* --- 历史数据表格 --- */}
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ p: 2 }}>历史数据记录</Typography>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>采集时间</TableCell>
                <TableCell align="right">微水含量 (ppmV)</TableCell>
                <TableCell align="right">温度 (°C)</TableCell>
                <TableCell align="right">压力 (MPa)</TableCell>
                <TableCell align="right">密度</TableCell>
                <TableCell align="right">露点 (°C)</TableCell>
                <TableCell>通信状态</TableCell>
                <TableCell>报警状态</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.time}</TableCell>
                  <TableCell align="right">{row.microWater}</TableCell>
                  <TableCell align="right">{row.temperature}</TableCell>
                  <TableCell align="right">{row.pressure}</TableCell>
                  <TableCell align="right">{row.density}</TableCell>
                  <TableCell align="right">{row.dewPoint}</TableCell>
                  <TableCell>{row.commStatus === 0 ? "正常" : (row.commStatus === 1 ? "异常" : "初始化")}</TableCell>
                  <TableCell sx={{ color: row.alarmStatus === 2 ? 'red' : (row.alarmStatus === 1 ? 'orange' : 'inherit') }}>
                    {row.alarmStatus === 0 ? "正常" : (row.alarmStatus === 1 ? "预警" : "报警")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

      </MainContent>
    </Box>
  );
};

export default MicroWater;