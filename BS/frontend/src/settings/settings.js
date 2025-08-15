import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const Setting = () => {
  // 定义预设颜色选项 - 彩虹7色+黑白
  const colorOptions = [
    { value: '#ff0000', label: '红色' },
    { value: '#ffa500', label: '橙色' },
    { value: '#ffff00', label: '黄色' },
    { value: '#008000', label: '绿色' },
    { value: '#0000ff', label: '蓝色' },
    { value: '#4b0082', label: '靛色' },
    { value: '#ee82ee', label: '紫色' },
    { value: '#000000', label: '黑色' },
    { value: '#ffffff', label: '白色' }
  ];

  // 状态管理
  const [settings, setSettings] = useState({
    background_color: '#f5f7fa',
    sidebar_color: '#f8f9fa',
    font_family: 'Arial, sans-serif',
    video_resolution: '720p',
    theme_mode: 'light'
  });

  // 加载用户现有设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://116.62.54.160.140:5000/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings(res.data);
      } catch (error) {
        console.error('获取设置失败:', error);
      }
    };
    fetchSettings();
  }, []);

  // 保存设置
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://116.62.54.160.140:5000/api/user/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('设置已保存！');
      // 应用新样式
      applyStyles();
    } catch (error) {
      console.error('保存设置失败:', error);
      alert('保存设置失败，请重试');
    }
  };

  // 动态应用样式到页面
  const applyStyles = () => {
    document.documentElement.style.setProperty('--bg-color', settings.background_color);
    document.documentElement.style.setProperty('--sidebar-color', settings.sidebar_color);
    document.documentElement.style.setProperty('--font-family', settings.font_family);
    // 主题模式（如深色模式）
    document.body.className = settings.theme_mode;
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <h1>个性化设置</h1>
        <div className="device-form">
          {/* 背景颜色设置 - 使用下拉框选择预设颜色 */}
          <div className="form-group">
            <label className="form-label">界面背景色</label>
            <select
              value={settings.background_color}
              onChange={(e) => setSettings({...settings, background_color: e.target.value})}
              className="form-select color-select"
            >
              {colorOptions.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  style={{ '--color': option.value }} // 使用CSS变量传递颜色值
                  className="color-option"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 导航栏颜色设置 - 使用下拉框选择预设颜色 */}
          <div className="form-group">
            <label className="form-label">导航栏背景色</label>
            <select
              value={settings.sidebar_color}
              onChange={(e) => setSettings({...settings, sidebar_color: e.target.value})}
              className="form-select color-select"
            >
              {colorOptions.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  style={{ '--color': option.value }} // 使用CSS变量传递颜色值
                  className="color-option"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* 字体设置 */}
          <div className="form-group">
            <label className="form-label">字体</label>
            <select
              value={settings.font_family}
              onChange={(e) => setSettings({...settings, font_family: e.target.value})}
              className="form-select"
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
              <option value="'SimSun', serif">宋体</option>
            </select>
          </div>

          {/* 视频分辨率设置 */}
          <div className="form-group">
            <label className="form-label">视频分辨率</label>
            <select
              value={settings.video_resolution}
              onChange={(e) => setSettings({...settings, video_resolution: e.target.value})}
              className="form-select"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          {/* 保存按钮 */}
          <button onClick={handleSave} className="submit-button">
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default Setting;
