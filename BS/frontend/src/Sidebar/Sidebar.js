import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../css/all.css';

const routeTitles = {
  '/': '联源电气智能监控系统',
  '/devices': '设备列表',
  '/equipmentvideoplayback': '设备视频播放',
  '/DevicesLocationInformation': '设备位置信息展示',
  '/PictureAndAICheck': '照片存储和ai复查',
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
  const [isDevicesMenuOpen, setIsDevicesMenuOpen] = useState(false);

  // 检测当前路由是否属于设备相关页面，自动展开菜单
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/devices') ||
      currentPath.startsWith('/equipmentvideoplayback') ||
      currentPath.startsWith('/DevicesLocationInformation')) {
      setIsDevicesMenuOpen(true);
    }
  }, [location.pathname]);

  // 更新页面标题
  useEffect(() => {
    const currentTitle = routeTitles[location.pathname] || '联源电气智能监控系统';
    document.title = currentTitle;
  }, [location.pathname]);

  // 处理设备菜单展开/收起
  const handleDevicesMenuToggle = (e) => {
    // 如果点击的是NavLink本身（想要导航），则不处理展开/收起
    if (e.target.tagName !== 'A' || !e.target.classList.contains('nav-link-main')) {
      setIsDevicesMenuOpen(!isDevicesMenuOpen);
    }
  };

  // 判断当前路径是否匹配NavLink的to属性
  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  // 判断是否为设备相关的父菜单
  const isDevicesParentActive = () => {
    const devicesPaths = ['/devices', '/equipmentvideoplayback', '/DevicesLocationInformation'];
    return devicesPaths.some(path => location.pathname.startsWith(path));
  };

  return (
    <div className="sidebar">
      <h2>这是目录</h2>
      <nav>
        <ul className="nav-menu">
          {/* 主页 - 单独项目 */}
          <li className="nav-item">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end
            >
              主页
            </NavLink>
          </li>

          {/* 设备列表（父菜单） */}
          <li className="nav-item">
            <div className="nav-parent" onClick={handleDevicesMenuToggle}>
              {/* 主要的导航链接 - 点击导航到/devices */}
              <NavLink
                to="/devices"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                设备列表
                <span
                  className="toggle-icon"
                  style={{
                    cursor: 'pointer',
                    marginLeft: '10px',
                    fontSize: '12px',
                    transition: 'transform 0.3s ease',
                    userSelect: 'none'
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    setIsDevicesMenuOpen(!isDevicesMenuOpen);
                  }}
                >
                  {isDevicesMenuOpen ? '▼' : '▶'}
                </span>
              </NavLink>


            </div>

            {/* 子菜单（设备视频播放 + 设备位置信息） */}
            {isDevicesMenuOpen && (
              <ul className="sub-menu">
                <li className="nav-item">
                  <NavLink
                    to="/equipmentvideoplayback"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    设备视频播放
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink
                    to="/DevicesLocationInformation"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    设备位置信息展示
                  </NavLink>
                </li>
              </ul>
            )}
          </li>

          {/* 其他独立菜单项 */}
          <li className="nav-item">
            <NavLink
              to="/PictureAndAICheck"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              照片存储以及ai复查
            </NavLink>
          </li>

          <li className="nav-item">
            <NavLink
              to="/video-player"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              设备视频
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/personalInformation"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              个人信息编辑
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              设置
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/warningAnalysis"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              报警分析
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/workorderManage"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              工单管理
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/provinceManage"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              省份管理
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/realTimeMonitoring"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              实时监控
            </NavLink>
          </li>

        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;