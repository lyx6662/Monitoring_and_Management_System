import '../css/all.css';
import DeviceList from "../devicelist/DeviceList";
import AlarmManage from "../alarmManage/alarmManage";
import Login from "../login/login";
import LineManage from "../lineManage/lineManage";
import EquipmentVideoPlayback from "../EquipmentVideoPlayback/EquipmentVideoPlayback";
import ProvinceManage from "../provinceManage/provinceManage";
import RealTimeMonitoring from "../realTimeMonitoring/realTimeMonitoring";
import Settings from "../settings/settings";
import WarningAnalysis from "../warningAnalysis/warningAnalysis";
import WorkorderManage from "../workorderManage/workorderManage";
import VideoPlayer from "../videoplayer/VideoPlayer";
import PersonalInformation from '../PersonalInformation/personalInformation';
import { useAuth } from '../auth/auth';
import React, { useState } from "react";
import DOMPurify from "dompurify";
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import Sidebar from '../Sidebar/Sidebar';

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
      const res = await fetch("http://3.85.80.40:5000/api/ai-chat", {
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
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content">
        <h1 style={{ textAlign: "center" }}>欢迎来到联源电气科技有限公司</h1>

        {/* System Introduction */}
        <FunctionIntroduction />

        {/* AI Assistant */}
        <div className="ai-assistant">
          <h2>AI 智能助手</h2>
          <form onSubmit={handleSubmit} className="ai-form">
            <div className="ai-input-group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入你的问题..."
                className="ai-input"
              />
              <button
                type="submit"
                disabled={loading}
                className="ai-button"
              >
                {loading ? "发送中..." : "发送"}
              </button>
            </div>
          </form>

          {response && (
            <div className="ai-response">
              <strong className="ai-response-title">AI 回复：</strong>
              <div
                style={{ marginTop: "10px" }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(response.replace(/#/g, '').replace(/\n/g, '<br>')),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={
          <RouteGuard>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/devices" element={<DeviceList />} />
              <Route path="/alarmManage" element={<AlarmManage />} />
              <Route path="/lineManage" element={<LineManage />} />
              <Route path="/equipmentvideoplayback" element={<EquipmentVideoPlayback />} />
              <Route path="/provinceManage" element={<ProvinceManage />} />
              <Route path="/realTimeMonitoring" element={<RealTimeMonitoring />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/warningAnalysis" element={<WarningAnalysis />} />
              <Route path="/workorderManage" element={<WorkorderManage />} />
              <Route path="/video-player" element={<VideoPlayer />} />
              <Route path="/personalInformation" element={<PersonalInformation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </RouteGuard>
        } />
      </Routes>
    </Router>
  );
}

function FunctionIntroduction() {
  return (
    <div className="introduction">
      <h2>系统介绍</h2>
      <p>本系统是一个综合的监控和管理平台，旨在提供设备管理、报警处理、线路监控等功能。</p>
      <p>用户可以通过注册和登录功能访问系统，管理员可以添加、编辑和删除设备信息。</p>
      <p>系统还提供实时监控、报警分析和工单管理等功能，帮助用户高效地管理设备和处理问题。</p>
    </div>
  );
}

export default App; 