import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Apartment as ApartmentIcon,
  People as PeopleIcon,
  ReceiptLong as ReceiptIcon,
  Speed as MeterIcon,
  ReportProblem as TicketIcon,
  ManageAccounts as UsersIcon,
  VpnKey as KeyIcon,
  Logout as LogoutIcon,
  Speed as StatusIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { ChangePasswordDialog } from '../../features/auth/ChangePasswordDialog';

const DRAWER_WIDTH = 260;

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const roleColor = {
    OWNER: 'error' as const,
    STAFF: 'primary' as const,
    TENANT: 'success' as const,
  }[user?.role || 'TENANT'];

  const roleLabel = {
    OWNER: 'Chủ trọ',
    STAFF: 'Nhân viên',
    TENANT: 'Khách thuê',
  }[user?.role || 'TENANT'];

  // Danh mục menu theo quyền
  const menuItems = [
    ...(user?.role !== 'TENANT'
      ? [{ text: 'Bảng điều khiển', icon: <DashboardIcon />, path: '/dashboard' }]
      : [{ text: 'Phòng của tôi', icon: <DashboardIcon />, path: '/tenant' }]),
    ...(user?.role !== 'TENANT'
      ? [
          { text: 'Khu nhà & Phòng', icon: <ApartmentIcon />, path: '/buildings' },
          { text: 'Khách thuê', icon: <PeopleIcon />, path: '/tenants' },
          { text: 'Dịch vụ & Điện nước', icon: <MeterIcon />, path: '/meters' },
        ]
      : []),
    { text: 'Hóa đơn & Tiền phòng', icon: <ReceiptIcon />, path: '/invoices' },
    { text: 'Yêu cầu & Sự cố', icon: <TicketIcon />, path: '/tickets' },
    ...(user?.role === 'OWNER'
      ? [{ text: 'Quản lý Nhân viên', icon: <UsersIcon />, path: '/users' }]
      : []),
    { text: 'Trạng thái hệ thống', icon: <StatusIcon />, path: '/status' },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            fontWeight: 800,
            width: 40,
            height: 40,
          }}
        >
          TH
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} letterSpacing={-0.5} lineHeight={1.2}>
            TroHub
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Quản lý nhà trọ
          </Typography>
        </Box>
      </Box>

      <Divider />

      <List sx={{ flexGrow: 1, px: 1.5, py: 2 }}>
        {menuItems.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selected}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  color: selected ? 'primary.main' : 'text.primary',
                  fontWeight: selected ? 700 : 500,
                  '&.Mui-selected': {
                    bgcolor: 'primary.lighter',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: selected ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: selected ? 700 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
            {user?.login?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap fontWeight={700}>
              {user?.fullName || user?.login}
            </Typography>
            <Chip label={roleLabel} size="small" color={roleColor} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ borderRadius: 1.5, textTransform: 'none' }}
        >
          Đăng xuất
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              TroHub Management
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={roleLabel}
              color={roleColor}
              size="small"
              sx={{ fontWeight: 700, px: 0.5 }}
            />
            <IconButton onClick={handleMenuOpen} size="small">
              <AccountIcon color="primary" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  setPasswordDialogOpen(true);
                }}
              >
                <ListItemIcon>
                  <KeyIcon fontSize="small" />
                </ListItemIcon>
                Đổi mật khẩu
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Đăng xuất
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Outlet />
      </Box>

      {/* Dialog đổi mật khẩu */}
      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />
    </Box>
  );
};
