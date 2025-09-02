import React, { useState, useEffect } from "react";
import {
  ThemeProvider as MUIThemeProvider,
  createTheme,
  styled,
  CssBaseline,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container
} from '@mui/material';
//视频和图片
import DeviceList from "../pictureAndvideo/devicelist/DeviceList";
import DevicesLocationInformation from "../pictureAndvideo/DevicesLocationInformation/DevicesLocationInformation";
import PictureAndAICheck from "../pictureAndvideo/PictureAndAICheck/PictureAndAICheck";
import EquipmentVideoPlayback from "../pictureAndvideo/EquipmentVideoPlayback/EquipmentVideoPlayback";
import DeviceImageAndVideoDisplay from "../pictureAndvideo/DeviceImageAndVideoDisplay/DeviceImageAndVideoDisplay";
//铁芯接地
import IronCoreGrounding from "../IronCoreGrounding/IronCore/IronCore";
//其他
import Settings from "../settings/settings";
import Login from "../login/login";
import PersonalInformation from '../PersonalInformation/personalInformation';
import { useAuth } from '../auth/auth';
import DOMPurify from "dompurify";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SidebarAll from '../SidebarAll/SidebarAll';
import axios from 'axios';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '../ThemeContext/ThemeContext';

// 创建Material-UI主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
});


// 使用styled组件创建自定义样式
const AppContainer = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
});

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
}));

const AIChatContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const AIResponse = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
}));




//路由保护
function RouteGuard({ children }) {
  const { isAuthenticated } = useAuth();

  // 从localStorage获取token并解析出用户ID
  const getUserId = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      // 解析JWT的payload部分（通常是第二部分）
      const decoded = JSON.parse(atob(token.split('.')[1]));
      // 检查token是否过期
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        return null;
      }
      return decoded.userId || decoded.id; // 根据实际token结构调整字段名
    } catch (e) {
      console.error('解析token失败:', e);
      return null;
    }
  };

  const userId = getUserId();

  // 打印登录状态和用户ID
  console.log('当前路由保护状态:', isAuthenticated);
  console.log('当前登录账户ID:', userId);

  return isAuthenticated ? children : null;
}

function Home() {
  // AI 聊天相关状态
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // AI 聊天提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return; // 防止空提交

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
        }),
      });
      const data = await res.json();
      setResponse(data.choices?.[0]?.message?.content || "无响应");
    } catch (err) {
      console.error("请求失败:", err);
      setResponse("服务异常，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContainer>
      {/* Sidebar Navigation */}
                                <SidebarAll />       

      {/* Main Content Area */}
      <MainContent component="main">
        <Container maxWidth="lg">
          <Typography variant="h4" align="center" gutterBottom>
            欢迎来到联源电气科技有限公司
          </Typography>

          {/* System Introduction */}
          <FunctionIntroduction />

          {/* AI Assistant */}
          <AIChatContainer elevation={3}>
            <Typography variant="h5" gutterBottom>
              联源电气AI小助手
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              与电气相关的问题都可以问我哦~
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入你的问题..."
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{ minWidth: '100px' }}
                >
                  {loading ? "发送中..." : "发送"}
                </Button>
              </Box>
            </Box>

            {response && (
              <AIResponse variant="outlined" sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  AI 回复：
                </Typography>
                <div
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(response.replace(/#/g, '').replace(/\n/g, '<br>')),
                  }}
                />
              </AIResponse>
            )}
          </AIChatContainer>
        </Container>
      </MainContent>
    </AppContainer>
  );
}


function AppContent() {
  const { theme } = useThemeContext(); // 使用主题上下文
  
  // 添加用户设置相关的副作用
  useEffect(() => {
    // 页面加载时获取并应用用户设置
    const fetchAndApplySettings = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get('http://localhost:5000/api/user/settings', {
            headers: { Authorization: `Bearer ${token}` }
          });
          // 应用样式
          document.documentElement.style.setProperty('--bg-color', res.data.background_color);
          document.documentElement.style.setProperty('--sidebar-color', res.data.sidebar_color);
          document.documentElement.style.setProperty('--font-family', res.data.font_family);
        } catch (err) {
          console.error('获取用户设置失败:', err);
        }
      }
    };
    fetchAndApplySettings();
  }, []);


  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={
            <RouteGuard>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/devices" element={<DeviceList />} />
                <Route path="/DevicesLocationInformation" element={<DevicesLocationInformation />} />
                <Route path="/PictureAndAICheck" element={<PictureAndAICheck />} />
                <Route path="/equipmentvideoplayback" element={<EquipmentVideoPlayback />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/DeviceImageAndVideoDisplay" element={<DeviceImageAndVideoDisplay />} />
                <Route path="/personalInformation" element={<PersonalInformation />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/IronCoreGrounding" element={<IronCoreGrounding />} />
              </Routes>
            </RouteGuard>
          } />
        </Routes>
      </Router>
    </MUIThemeProvider>
  );
}

function FunctionIntroduction() {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        系统介绍
      </Typography>
      <Typography variant="body1" paragraph>
        本系统是一个综合的监控和管理平台，旨在提供设备管理、报警处理、线路监控等功能。
      </Typography>
      <Typography variant="body1" paragraph>
        用户可以通过注册和登录功能访问系统，管理员可以添加、编辑和删除设备信息。
      </Typography>
      <Typography variant="body1" paragraph>
        系统还提供实时监控、报警分析和工单管理等功能，帮助用户高效地管理设备和处理问题。
      </Typography>
    </Paper>
  );
}

function App() {
  return (
    <AppThemeProvider> {/* 包装整个应用 */}
      <AppContent />
    </AppThemeProvider>
  );
}

export default App;