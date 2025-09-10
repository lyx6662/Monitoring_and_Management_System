import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  styled
} from '@mui/material';
import {
  Home as HomeIcon,
  CameraAlt as Camera,
  Person as PersonIcon,
  Settings as SettingsIcon,
  FlashOn as IronCoreGroundingIcon // 新增图标，可根据实际需求替换
} from '@mui/icons-material';

const routeTitles = {
  '/': '首页',
  '/devices': '设备列表',
  '/IronCoreGrounding': '铁芯接地', // 新增路由标题
  '/TransformerPartialDischarge': '变压器局放', // 新增路由标题
  '/MicroWater': '微水检测', // 新增路由标题
  '/personalInformation': '个人信息编辑',
  '/settings': '设置',
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

const SidebarAll = () => {
  const location = useLocation();

  // 更新页面标题
  useEffect(() => {
    const currentTitle = routeTitles[location.pathname] || '旗下设备检测';
    document.title = currentTitle;
  }, [location.pathname]);

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
          旗下设备检测
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ p: 0 }}>
        {/* 返回首页 */}
        <ListItem disablePadding>
          <StyledNavLink to="/" end>
            <ListItemButton>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="首页" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {/* 设备列表 */}
        <ListItem disablePadding>
          <StyledNavLink to="/devices">
            <ListItemButton>
              <ListItemIcon>
                <Camera />
              </ListItemIcon>
              <ListItemText primary="摄像头" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        {/* 新增铁芯接地导航项 */}
        <ListItem disablePadding>
          <StyledNavLink to="/IronCoreGrounding">
            <ListItemButton>
              <ListItemIcon>
                <IronCoreGroundingIcon />
              </ListItemIcon>
              <ListItemText primary="铁芯接地" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        {/* 新增变压器局放导航项 */}
        <ListItem disablePadding>
          <StyledNavLink to="/TransformerPartialDischarge">
            <ListItemButton>
              <ListItemIcon>
                <IronCoreGroundingIcon />
              </ListItemIcon>
              <ListItemText primary="变压器局放" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>
        
        {/* 新增微水检测导航项 */}
        <ListItem disablePadding>
          <StyledNavLink to="/MicroWater">
            <ListItemButton>
              <ListItemIcon>
                <IronCoreGroundingIcon />
              </ListItemIcon>
              <ListItemText primary="微水检测" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        <Divider sx={{ my: 1 }} />

        {/* 个人信息编辑 */}
        <ListItem disablePadding>
          <StyledNavLink to="/personalInformation">
            <ListItemButton>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="个人信息编辑" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        {/* 设置 */}
        <ListItem disablePadding>
          <StyledNavLink to="/settings">
            <ListItemButton>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="设置" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        <Divider sx={{ my: 1 }} />
      </List>
    </Drawer>
  );
};

export default SidebarAll;