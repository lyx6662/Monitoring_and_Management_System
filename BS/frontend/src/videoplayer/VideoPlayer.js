import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const VideoPlayer = () => {
  // 视频相关状态
  const videoUrl = "https://check1-video.oss-cn-hangzhou.aliyuncs.com/uploads_device_865522078460315_202507_865522078460315_20250710111734.mp4";

  // 二维码相关状态
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrCodeError, setQrCodeError] = useState(null);

  // 加载二维码
  useEffect(() => {
    const loadQRCode = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/qrcode?t=${Date.now()}`);
        if (!res.ok) throw new Error("二维码加载失败");
        const blob = await res.blob();
        setQrCodeUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error("二维码加载错误:", err);
        setQrCodeError(err.message);
        // 备用二维码
        setQrCodeUrl("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Example");
      }
    };
    loadQRCode();
  }, []);

  return (
    <div className="app-container">
      {/* 侧边导航栏 */}
      <Sidebar />

      {/* 视频播放的主内容区 */}
      <div className="main-content">
        <h1>设备视频</h1>
        
        {/* 视频播放区域 */}
        <div style={{ marginBottom: '40px' }}>
          <h2>阿里云ossbucket存储项目播放</h2>
          <video
            controls
            width="50%"
            height="auto"
            poster="https://picsum.photos/id/7/3000/1800"
            style={{ marginBottom: '20px' }}
          >
            <source src={videoUrl} type="video/mp4" />
            您的浏览器不支持HTML5视频播放
          </video>
        </div>

        {/* 二维码展示区域 */}
        <div style={{ marginBottom: '40px', textAlign: 'left' }}>
          <h2>扫描二维码</h2>
          {qrCodeError ? (
            <p style={{ color: 'red' }}>{qrCodeError}</p>
          ) : qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="二维码"
              style={{
                width: '200px',
                height: '200px',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
            />
          ) : (
            <p>二维码加载中...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;