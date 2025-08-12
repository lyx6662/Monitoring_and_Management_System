import React from 'react';
import { NavLink } from 'react-router-dom';
import '../css/all.css';
import Sidebar from '../Sidebar/Sidebar';

const AlarmManage = () => {

    return (
        <div>

            {/* 路由模块 */}
            <div>
                <Sidebar />
            </div>


            {/* 报警管理的主内容区 */}
            <div className="main-content">
                <h1>报警管理</h1>
                {/* 这里添加你的报警管理具体内容 */}
            </div>
        </div>
    )



};


export default AlarmManage;