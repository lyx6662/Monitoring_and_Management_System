// src/videoplayer/VideoPlayer.js
import React from "react";

const VideoPlayer = () => {
  // S3视频的URL（直接使用你提供的链接）
  const videoUrl = "https://check1-video.oss-cn-hangzhou.aliyuncs.com/uploads_device_865522078460315_202507_865522078460315_20250710111734.mp4";
  
  return (
    <div className="video-container">
      <h2>S3视频播放</h2>
      {/* 使用HTML5的video标签播放视频 */}
      <video 
        controls  // 显示播放控制栏（播放/暂停、进度条等）
        width="800"  // 视频宽度
        height="auto"  // 高度自适应
        poster="https://picsum.photos/id/7/3000/1800"  // 视频加载前的占位图
      >
        <source src={videoUrl} type="video/mp4" />  // 指定视频源和格式
        您的浏览器不支持HTML5视频播放，请更新浏览器。
      </video>
    </div>
  );
};

export default VideoPlayer;