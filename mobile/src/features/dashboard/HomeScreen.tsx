import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  Button,
  Chip,
  Divider,
  Portal,
  Dialog,
  TextInput,
  HelperText,
  useTheme,
  Badge,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useMobileAuth } from '../auth/AuthContext';
import { mobileDashboardApi, DashboardMetrics } from './dashboardApi';
import { mobileNotificationsApi, AppNotification } from './notificationsApi';
import { mobileApiClient } from '../auth/mobileClient';
import { formatMoney } from '../../shared/money';

interface HomeScreenProps {
  onNavigateToStatus: () => void;
  onNavigateToProperty?: () => void;
  onNavigateToContracts?: () => void;
  onNavigateToMetering?: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToIncidents?: () => void;
  onNavigateToUsers?: () => void;
  onNavigateToAudit?: () => void;
}

const formatVnd = formatMoney;

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToStatus,
  onNavigateToProperty,
  onNavigateToContracts,
  onNavigateToMetering,
  onNavigateToInvoices,
  onNavigateToIncidents,
  onNavigateToUsers,
  onNavigateToAudit,
}) => {
  const theme = useTheme();
  const { user, logout, changePassword } = useMobileAuth();

  const [refreshing, setRefreshing] = useState(false);

  // Đổi mật khẩu
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  // Thông báo (Notifications)
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Broadcast Notification (OWNER / STAFF)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Dashboard Metrics
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [billingMonth,setBillingMonth]=useState(''),[cashFrom,setCashFrom]=useState(''),[cashTo,setCashTo]=useState(''),[asOf,setAsOf]=useState('');

  const roleColor = {
    OWNER: '#ef4444',
    STAFF: '#2563eb',
    TENANT: '#10b981',
  }[user?.role || 'TENANT'];

  const roleLabel = {
    OWNER: 'Chủ trọ',
    STAFF: 'Nhân viên',
    TENANT: 'Khách thuê',
  }[user?.role || 'TENANT'];

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await mobileNotificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await mobileNotificationsApi.getNotifications(false, 0, 15);
      setNotifications(res.content || []);
    } catch {
      // ignore
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    if (user?.role === 'TENANT') return;
    setMetricsLoading(true);
    try {
      const data = await mobileDashboardApi.getMetrics(selectedBuildingId || undefined,billingMonth || undefined,{cashFrom,cashTo,asOf});
      setMetrics(data);
    } catch {
      setStatusMessage('Không tải được dashboard. Kiểm tra bộ lọc và thử lại.');
    } finally {
      setMetricsLoading(false);
    }
  }, [user?.role,selectedBuildingId,billingMonth,cashFrom,cashTo,asOf]);

  const loadBuildings = useCallback(async () => {
    if (user?.role === 'TENANT') return;
    try {
      const res = await mobileApiClient.get<any>('/buildings');
      const bList = res.data?.data || [];
      setBuildings(bList);
      if (bList.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(bList[0].id);
      }
    } catch {
      // ignore
    }
  }, [user?.role, selectedBuildingId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUnreadCount(), loadMetrics(), loadBuildings()]);
    setRefreshing(false);
  }, [loadUnreadCount, loadMetrics, loadBuildings]);

  useEffect(() => {
    loadUnreadCount();
    loadMetrics();
    loadBuildings();
  }, [loadUnreadCount, loadMetrics, loadBuildings]);

  const handleOpenNotifications = () => {
    setNotifDialogOpen(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await mobileNotificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      loadUnreadCount();
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await mobileNotificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleSendBroadcast = async () => {
    if (!selectedBuildingId || !broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcastLoading(true);
    try {
      const res = await mobileNotificationsApi.broadcastNotification({
        buildingId: selectedBuildingId,
        title: broadcastTitle,
        message: broadcastMessage,
      });
      setBroadcastDialogOpen(false);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setStatusMessage(`Đã gửi thông báo đến ${res.sentCount} người thuê!`);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Không thể phát thông báo');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setDialogError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setDialogError('Mật khẩu xác nhận không khớp');
      return;
    }

    setDialogError(null);
    setDialogLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPasswordDialogOpen(false);
    } catch (err: any) {
      setDialogError(err.response?.data?.error?.message || err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setDialogLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Profile with Notification Bell */}
      <Surface style={styles.profileCard} elevation={2}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.login?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text variant="titleLarge" style={styles.userName}>
              {user?.fullName || user?.login}
            </Text>
            <View style={styles.chipRow}>
              <Chip
                textStyle={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}
                style={[styles.roleChip, { backgroundColor: roleColor }]}
              >
                {roleLabel}
              </Chip>
            </View>
          </View>

          {/* Bell Icon with Badge */}
          <TouchableOpacity onPress={handleOpenNotifications} style={styles.bellButton}>
            <IconButton icon="bell" size={26} iconColor={theme.colors.primary} />
            {unreadCount > 0 && (
              <Badge style={styles.badge} size={20}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </TouchableOpacity>
        </View>
      </Surface>

      {/* Financial & Operational Summary for OWNER / STAFF (BR-148..BR-160) */}
      {user?.role !== 'TENANT' && <View style={{padding:12,gap:8}}>
        <TextInput label="Kỳ hóa đơn YYYY-MM" value={billingMonth} onChangeText={setBillingMonth} />
        <TextInput label="Thu/hoàn từ YYYY-MM-DD" value={cashFrom} onChangeText={setCashFrom} />
        <TextInput label="Thu/hoàn đến YYYY-MM-DD" value={cashTo} onChangeText={setCashTo} />
        <TextInput label="Số dư đến YYYY-MM-DD" value={asOf} onChangeText={setAsOf} />
        <Button loading={metricsLoading} disabled={metricsLoading} onPress={loadMetrics}>Đối chiếu sổ</Button>
      </View>}
      {user?.role !== 'TENANT' && metrics && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              📊 Dòng tiền & Hiện trạng
            </Text>
            {buildings.length > 0 && (
              <Button
                mode="text"
                compact
                icon="bullhorn"
                onPress={() => setBroadcastDialogOpen(true)}
              >
                Gửi thông báo
              </Button>
            )}
          </View>

          <Surface style={styles.metricsCard} elevation={1}>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricItem, { backgroundColor: '#f8fafc' }]}>
                <Text variant="labelSmall" style={styles.metricLabel}>
                  HÓA ĐƠN ĐÃ PHÁT HÀNH
                </Text>
                <Text variant="titleMedium" style={[styles.metricValue, { color: '#2563eb' }]}>
                  {formatVnd(metrics.billedAmount)}
                </Text>
                <Text variant="bodySmall" style={styles.metricSub}>
                  Gốc + điều chỉnh
                </Text>
              </View>

              <View style={[styles.metricItem, { backgroundColor: '#f0fdf4' }]}>
                <Text variant="labelSmall" style={[styles.metricLabel, { color: '#16a34a' }]}>
                  TIỀN THỰC THU
                </Text>
                <Text variant="titleMedium" style={[styles.metricValue, { color: '#16a34a' }]}>
                  {formatVnd(metrics.cashCollected)}
                </Text>
                <Text variant="bodySmall" style={styles.metricSub}>
                  Tiền mặt / CK
                </Text>
              </View>

              <View style={[styles.metricItem, { backgroundColor: '#fffbeb' }]}>
                <Text variant="labelSmall" style={[styles.metricLabel, { color: '#d97706' }]}>
                  CÔNG NỢ PHẢI THU
                </Text>
                <Text variant="titleMedium" style={[styles.metricValue, { color: '#d97706' }]}>
                  {formatVnd(metrics.totalDebt)}
                </Text>
                <Text variant="bodySmall" style={styles.metricSub}>
                  Hóa đơn chưa thu
                </Text>
              </View>

              <View style={[styles.metricItem, { backgroundColor: '#faf5ff' }]}>
                <Text variant="labelSmall" style={[styles.metricLabel, { color: '#9333ea' }]}>
                  TIỀN CỌC ĐANG GIỮ
                </Text>
                <Text variant="titleMedium" style={[styles.metricValue, { color: '#9333ea' }]}>
                  {formatVnd(metrics.totalDepositHeld)}
                </Text>
                <Text variant="bodySmall" style={styles.metricSub}>
                  Sổ cọc mọi HĐ (BR-157)
                </Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.roomStatusRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                Phòng: {metrics.occupiedRooms}/{metrics.totalRooms} đang thuê ({metrics.vacantBookableRooms} phòng trống)
              </Text>
              {metrics.openIssuesCount > 0 && (
                <Chip icon="alert" style={{ backgroundColor: '#fee2e2' }} textStyle={{ color: '#dc2626', fontSize: 11 }}>
                  {metrics.openIssuesCount} sự cố mở
                </Chip>
              )}
            </View>
          </Surface>
        </>
      )}

      {/* Action Cards */}
      {user?.role === 'OWNER' && <Button icon="account-group" onPress={onNavigateToUsers}>Nhân viên và phân công</Button>}
      {user?.role !== 'TENANT' && <Button icon="history" onPress={onNavigateToAudit}>Nhật ký giao dịch</Button>}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {user?.role === 'TENANT' ? 'Dịch vụ cư dân' : 'Quản lý vận hành'}
      </Text>

      <Surface style={styles.menuCard} elevation={1}>
        {user?.role !== 'TENANT' ? (
          <>
            <TouchableOpacity onPress={onNavigateToProperty} activeOpacity={0.7} style={styles.menuItem}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                🏢 Tòa nhà & Phòng
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Xem danh sách tòa nhà, sơ đồ tầng và trạng thái phòng
              </Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToContracts}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                👥 Khách thuê & Hợp đồng
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Hồ sơ khách thuê, hợp đồng và cọc phòng
              </Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToMetering}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                ⚡ Điện nước & Dịch vụ
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Ghi chỉ số đồng hồ điện nước và cảnh báo tiêu thụ
              </Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToInvoices}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                📄 Hóa đơn & Tiền phòng
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Lập hóa đơn nháp, phát hành, điều chỉnh và công nợ
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToContracts}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                🛏️ Phòng & Hợp đồng của tôi
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Hợp đồng thuê, giá phòng và các tiện ích đã đăng ký
              </Text>
            </TouchableOpacity>
            <Divider />
            <TouchableOpacity style={styles.menuItem} onPress={onNavigateToInvoices}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                📄 Hóa đơn & Thanh toán
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Xem chi tiết tiền phòng, điện nước và lịch sử thanh toán
              </Text>
            </TouchableOpacity>
          </>
        )}
        <Divider />
        <TouchableOpacity style={styles.menuItem} onPress={onNavigateToIncidents} activeOpacity={0.7}>
          <Text variant="bodyLarge" style={styles.menuItemText}>
            🛠️ Báo sự cố & Sửa chữa
          </Text>
          <Text variant="bodySmall" style={styles.menuItemSub}>
            Gửi phản ánh sự cố kỹ thuật phòng tới ban quản lý
          </Text>
        </TouchableOpacity>
      </Surface>

      {/* System Utilities */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Hệ thống
      </Text>

      <Surface style={styles.systemCard} elevation={1}>
        <Button
          mode="outlined"
          icon="shield-key"
          onPress={() => {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setDialogError(null);
            setPasswordDialogOpen(true);
          }}
          style={styles.systemButton}
        >
          Đổi mật khẩu
        </Button>

        <Button
          mode="outlined"
          icon="server-network"
          onPress={onNavigateToStatus}
          style={styles.systemButton}
        >
          Trạng thái kết nối API
        </Button>

        <Button
          mode="contained"
          buttonColor="#fee2e2"
          textColor="#b91c1c"
          icon="logout"
          onPress={logout}
          style={styles.logoutButton}
        >
          Đăng xuất
        </Button>
      </Surface>

      {/* Modal Danh sách thông báo */}
      <Portal>
        <Dialog visible={notifDialogOpen} onDismiss={() => setNotifDialogOpen(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontWeight: '700' }}>🔔 Thông báo hệ thống</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 380, paddingHorizontal: 0 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
              {notifLoading ? (
                <ActivityIndicator style={{ marginVertical: 32 }} />
              ) : notifications.length === 0 ? (
                <Text style={{ textAlign: 'center', marginVertical: 32, color: '#64748b' }}>
                  Không có thông báo nào
                </Text>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => !n.readAt && handleMarkAsRead(n.id)}
                    style={[styles.notifItem, { backgroundColor: n.readAt ? '#f8fafc' : '#eff6ff' }]}
                  >
                    <View style={styles.notifHeader}>
                      <Text variant="labelLarge" style={{ fontWeight: n.readAt ? '600' : '800', flex: 1 }}>
                        {n.title}
                      </Text>
                      {!n.readAt && <Badge size={8} style={{ backgroundColor: '#2563eb' }} />}
                    </View>
                    <Text variant="bodySmall" style={{ color: '#475569', marginTop: 4 }}>
                      {n.message}
                    </Text>
                    <Text variant="labelSmall" style={{ color: '#94a3b8', marginTop: 6, fontSize: 10 }}>
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            {unreadCount > 0 && (
              <Button onPress={handleMarkAllAsRead}>Đã đọc tất cả</Button>
            )}
            <Button onPress={() => setNotifDialogOpen(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal Broadcast Thông báo tòa nhà */}
      <Portal>
        <Dialog visible={broadcastDialogOpen} onDismiss={() => setBroadcastDialogOpen(false)}>
          <Dialog.Title>📢 Phát thông báo tòa nhà</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: '#64748b', marginBottom: 12 }}>
              Thông báo sẽ gửi đến tất cả người thuê phòng đang ACTIVE trong tòa nhà.
            </Text>
            <TextInput
              label="Tiêu đề"
              mode="outlined"
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Nội dung thông báo"
              mode="outlined"
              multiline
              numberOfLines={4}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBroadcastDialogOpen(false)}>Hủy</Button>
            <Button
              mode="contained"
              loading={broadcastLoading}
              disabled={!broadcastTitle.trim() || !broadcastMessage.trim() || broadcastLoading}
              onPress={handleSendBroadcast}
            >
              Gửi
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal Thông báo Toast/Status */}
      <Portal>
        <Dialog visible={!!statusMessage} onDismiss={() => setStatusMessage(null)}>
          <Dialog.Title>Thông báo</Dialog.Title>
          <Dialog.Content>
            <Text>{statusMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatusMessage(null)}>Đồng ý</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal Đổi mật khẩu */}
      <Portal>
        <Dialog visible={passwordDialogOpen} onDismiss={() => setPasswordDialogOpen(false)}>
          <Dialog.Title>Đổi mật khẩu</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Mật khẩu hiện tại"
              mode="outlined"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              style={styles.input}
            />
            <TextInput
              label="Mật khẩu mới (ít nhất 6 ký tự)"
              mode="outlined"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
            <TextInput
              label="Xác nhận mật khẩu mới"
              mode="outlined"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
            />
            {dialogError && <HelperText type="error">{dialogError}</HelperText>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogOpen(false)} disabled={dialogLoading}>
              Hủy
            </Button>
            <Button mode="contained" onPress={handleChangePassword} loading={dialogLoading}>
              Cập nhật
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '800',
    color: '#0f172a',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleChip: {
    borderRadius: 8,
    height: 24,
    justifyContent: 'center',
  },
  bellButton: {
    position: 'relative',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 10,
    marginTop: 10,
  },
  metricsCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    width: '48%',
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  metricValue: {
    fontWeight: '800',
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#94a3b8',
  },
  roomStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  menuItemSub: {
    color: '#64748b',
  },
  systemCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  systemButton: {
    marginBottom: 10,
    borderRadius: 8,
  },
  logoutButton: {
    borderRadius: 8,
  },
  input: {
    marginBottom: 12,
  },
  dialog: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  notifItem: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
