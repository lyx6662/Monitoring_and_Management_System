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
import React from "react";

function RouteGuard({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : null;
}

function Home() {
  return (
    <div className="app-container">
      <h1 style={{ textAlign: 'center' }}>欢迎来到联源电器科技有限公司</h1>
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        padding: '10px',
        border: '1px solid #e0e0e0',
        borderRadius: '4px'
      }}>
        <Link to="/">主页 →</Link>
        <Link to="/login">登录 →</Link>
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
      <Function_Introduction />
    </div>
  );
}

function App() {            //路由
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