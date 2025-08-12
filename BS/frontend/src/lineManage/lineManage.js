// src/lineManage/LineManage.js
import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import '../css/all.css';

const LineManage = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <h1>线路管理</h1>
        {/* 这里添加你的线路管理具体内容 */}
      </div>
    </div>
  );
};

export default LineManage;