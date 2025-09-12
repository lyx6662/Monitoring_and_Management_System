import React from 'react';
import { Box, Typography, Paper, styled } from '@mui/material';
import Sidebar from '../SidebarVideo/SidebarVideo'; // 导入侧边栏组件

// 使用 styled-components 创建一个与 DeviceList.js 样式一致的主内容区域
// 这确保了页面布局和风格的统一性
const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1, // 允许该组件占据剩余空间
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
  minHeight: '100vh',
  marginLeft: 20, // 与 DeviceList.js 保持一致的边距
}));

const ContentPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // 添加阴影效果
  borderRadius: '12px', // 添加圆角
}));

const RealTimeSeeAll = () => {
  return (
    // 使用 Box 组件和 flex 布局来并排显示侧边栏和主内容
    <Box sx={{ display: 'flex' }}>
      {/* 侧边栏导航 */}
      <Sidebar />

      {/* 主内容区域 */}
      <MainContent component="main">
        <ContentPaper>
          <Typography variant="h4" gutterBottom>
            图像视频监测
          </Typography>
          <Typography variant="body1">
            这里是图像视频监测页面的实时监控内容。您可以查看所有连接设备的实时视频流。
          </Typography>
          {/* 在这里可以添加视频播放器或其他相关组件 */}
        </ContentPaper>
      </MainContent>
    </Box>
  );
};

export default RealTimeSeeAll;