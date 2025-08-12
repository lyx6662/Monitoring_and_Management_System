import React from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const WarningAnalysis = () => {
    return (
        <div className="app-container">
            {/* 复用相同的侧边导航栏 */}
            <Sidebar />

            {/* 报警分析的主内容区 */}

            {/* 报警管理的主内容区 */}
            <div className="main-content">
                <h1>图片轮播系统</h1>
                {/* 这里添加你的报警管理具体内容 */}
                <div className="alarm-content">
                    <p>这里是图片轮播的具体内容...</p>
                </div>
            </div>
        </div>
    );
};

export default WarningAnalysis;