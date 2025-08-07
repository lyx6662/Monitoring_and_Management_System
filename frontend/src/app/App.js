import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import './App.css';
import DeviceList from "../devicelist/DeviceList";
import AlarmManage from "../alarmManage/alarmManage";
import Login from "../login/login";
import LineManage from "../lineManage/lineManage";
import PictureRotation from "../pictureRotation/pictureRotation";
import ProvinceManage from "../provinceManage/provinceManage";
import RealTimeMonitoring from "../realTimeMonitoring/realTimeMonitoring";
import Settings from "../settings/settings";
import WarningAnalysis from "../warningAnalysis/warningAnalysis";
import WorkorderManage from "../workorderManage/workorderManage";
import VideoPlayer from "../videoplayer/VideoPlayer";
import { useAuth } from '../auth/auth';
import React, { useState } from "react";
import DOMPurify from "dompurify";

function RouteGuard({ children }) {
  const { isAuthenticated } = useAuth();
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
    <div className="app-container">
      <h1 style={{ textAlign: "center" }}>欢迎来到联源电器科技有限公司</h1>

      {/* 导航链接区域 */}
      <div
        style={{
          display: "flex",
          gap: "40px",
          marginBottom: "20px",
          flexWrap: "wrap",
          padding: "10px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
        }}
      >
        <Link to="/">主页 →</Link>
        <Link to="/devices">设备列表 →</Link>
        <Link to="/alarmManage">报警管理 →</Link>
        <Link to="/lineManage">线路管理 →</Link>
        <Link to="/pictureRotation">图片轮播 →</Link>
        <Link to="/provinceManage">省份管理 →</Link>
        <Link to="/realTimeMonitoring">实时监控 →</Link>
        <Link to="/settings">设置 →</Link>
        <Link to="/warningAnalysis">报警分析 →</Link>
        <Link to="/workorderManage">工单管理 →</Link>
        <Link to="/video-player">播放设备视频 →</Link>
      </div>
      
      {/* 系统介绍区域 */}
      <Function_Introduction />

      {/* AI 助手区域（支持 HTML 渲染） */}
      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h2>AI 智能助手</h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {loading ? "发送中..." : "发送"}
            </button>
          </div>
        </form>

        {response && (
          <div
            style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "4px",
              borderLeft: "4px solid #4CAF50",
            }}
          >
            <strong style={{ color: "#4CAF50" }}>AI 回复：</strong>
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
              <Route path="/pictureRotation" element={<PictureRotation />} />
              <Route path="/provinceManage" element={<ProvinceManage />} />
              <Route path="/realTimeMonitoring" element={<RealTimeMonitoring />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/warningAnalysis" element={<WarningAnalysis />} />
              <Route path="/workorderManage" element={<WorkorderManage />} />
              <Route path="/video-player" element={<VideoPlayer />} />
            </Routes>
          </RouteGuard>
        } />
      </Routes>
    </Router>
  );
}

function Function_Introduction(){
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