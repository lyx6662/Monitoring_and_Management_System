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
  FlashOn as DevicesIcon,
} from '@mui/icons-material';

const routeTitles = {
  '/': '首页',
  '/MicroWater': '微水检测',
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

const SidebarMic = () => {
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
          变压器局放检测
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
          <StyledNavLink to="/MicroWater">
            <ListItemButton>
              <ListItemIcon>
                <DevicesIcon />
              </ListItemIcon>
              <ListItemText primary="微水检测" />
            </ListItemButton>
          </StyledNavLink>
        </ListItem>

        

        <Divider sx={{ my: 1 }} />
      </List>
    </Drawer>
  );
};

export default SidebarMic;
