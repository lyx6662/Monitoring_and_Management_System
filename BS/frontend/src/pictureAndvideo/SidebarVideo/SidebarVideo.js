import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Box,
  Divider,
  styled
} from '@mui/material';
import {
  Home as HomeIcon,
  CameraAlt as DevicesIcon,
  Videocam as VideocamIcon,
  LocationOn as LocationIcon,
  Image as ImageIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';

const routeTitles = {
  '/': '联源电气智能监控系统',
  '/devices': '设备列表',
  '/equipmentvideoplayback': '设备视频播放',
  '/DevicesLocationInformation': '设备位置信息展示',
  '/PictureAndAICheck': '照片存储和AI复查',
  '/DeviceImageAndVideoDisplay': '设备视频图片展示',
};

// 自定义样式的NavLink
const StyledNavLink = styled(NavLink)(({ theme }) => ({
  textDecoration: 'none',
  color: 'inherit',
  width: '100%',
  '&.active': {
    backgroundColor: theme.palette.action.selected,
    borderRight: `3px solid ${theme.palette.primary.main}`,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const Sidebar = () => {
  const location = useLocation();
  const [isDevicesMenuOpen, setIsDevicesMenuOpen] = useState(false);

  // 检测当前路由是否属于设备相关页面，自动展开菜单
  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/devices') ||
      currentPath.startsWith('/equipmentvideoplayback') ||
      currentPath.startsWith('/DevicesLocationInformation') ||
      currentPath.startsWith('/DeviceImageAndVideoDisplay')
    ) {
      setIsDevicesMenuOpen(true);
    }
  }, [location.pathname]);

  // 更新页面标题
  useEffect(() => {
    const currentTitle = routeTitles[location.pathname] || '联源电气智能监控系统';
    document.title = currentTitle;
  }, [location.pathname]);

  // 处理设备菜单展开/收起
  const handleDevicesMenuToggle = () => {
    setIsDevicesMenuOpen(!isDevicesMenuOpen);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: (theme) => theme.palette.background.paper,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          智能监控系统
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ p: 0 }}>
        {/* 主页 - 单独项目 */}
        <ListItem disablePadding>
          <StyledNavLink to="/" end>
            <ListItemButton>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="返回主页" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        {/* 设备列表（父菜单） */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleDevicesMenuToggle}>
            <ListItemIcon>
              <DevicesIcon />
            </ListItemIcon>
            <ListItemText primary="设备管理" />
            {isDevicesMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        {/* 设备子菜单 */}
        <Collapse in={isDevicesMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {/* 设备列表 */}
            <ListItem disablePadding sx={{ pl: 3 }}>
              <StyledNavLink to="/devices">
                <ListItemButton>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <DevicesIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="设备列表" />
                </ListItemButton>
              </StyledNavLink>
            </ListItem>

            {/* 设备视频播放 */}
            <ListItem disablePadding sx={{ pl: 3 }}>
              <StyledNavLink to="/equipmentvideoplayback">
                <ListItemButton>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <VideocamIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="设备视频播放" />
                </ListItemButton>
              </StyledNavLink>
            </ListItem>

            {/* 设备图像视频展示 */}
            <ListItem disablePadding sx={{ pl: 3 }}>
              <StyledNavLink to="/DeviceImageAndVideoDisplay">
                <ListItemButton>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ImageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="设备图像视频展示" />
                </ListItemButton>
              </StyledNavLink>
            </ListItem>

            {/* 设备位置信息展示 */}
            <ListItem disablePadding sx={{ pl: 3 }}>
              <StyledNavLink to="/DevicesLocationInformation">
                <ListItemButton>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LocationIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="设备位置信息展示" />
                </ListItemButton>
              </StyledNavLink>
            </ListItem>
          </List>
        </Collapse>

        <Divider sx={{ my: 1 }} />

        {/* 照片存储以及AI复查 */}
        <ListItem disablePadding>
          <StyledNavLink to="/PictureAndAICheck">
            <ListItemButton>
              <ListItemIcon>
                <ImageIcon />
              </ListItemIcon>
              <ListItemText primary="照片存储与AI复查" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        <Divider sx={{ my: 1 }} />
      </List>
    </Drawer>
  );
};

export default Sidebar;