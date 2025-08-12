import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../css/all.css';

// 定义路由与标题的映射关系
const routeTitles = {
  '/': '联源电气智能监控系统',
  '/devices': '设备列表',
  '/equipmentvideoplayback': '设备视频播放',
  '/alarmManage': '报警管理',
  '/lineManage': '线路管理',
  '/provinceManage': '省份管理',
  '/realTimeMonitoring': '实时监控',
  '/settings': '设置',
  '/warningAnalysis': '报警分析',
  '/workorderManage': '工单管理',
  '/video-player': '设备视频',
  '/personalInformation': '个人信息编辑',
};

const Sidebar = () => {
  const location = useLocation();

  // 当路由变化时更新页面标题
  useEffect(() => {
    const currentTitle = routeTitles[location.pathname] || '联源电气智能监控系统';
    document.title = currentTitle;
  }, [location.pathname]);

  return (
    <div className="sidebar">
      <h2>这是目录</h2>
      <nav>
        <ul className="nav-menu">
          <li className="nav-item">
            <NavLink to="/" className="nav-link" end>主页</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/devices" className="nav-link">设备列表</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/equipmentvideoplayback" className="nav-link">设备视频播放</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/alarmManage" className="nav-link">报警管理</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/lineManage" className="nav-link">线路管理</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/provinceManage" className="nav-link">省份管理</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/realTimeMonitoring" className="nav-link">实时监控</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/settings" className="nav-link">设置</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/warningAnalysis" className="nav-link">报警分析</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/workorderManage" className="nav-link">工单管理</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/video-player" className="nav-link">设备视频</NavLink>
          </li>
          <li className="nav-item">
            <NavLink to="/personalInformation" className="nav-link">个人信息编辑</NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
    