import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, Chip, Divider, Portal, Dialog, TextInput, HelperText, useTheme } from 'react-native-paper';
import { useMobileAuth } from '../auth/AuthContext';

interface HomeScreenProps {
  onNavigateToStatus: () => void;
  onNavigateToProperty?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToStatus, onNavigateToProperty }) => {
  const theme = useTheme();
  const { user, logout, changePassword } = useMobileAuth();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profile */}
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
        </View>
      </Surface>

      {/* Action Cards */}
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
            <View style={styles.menuItem}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                👥 Khách thuê & Hợp đồng
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Hồ sơ khách thuê, hợp đồng và cọc phòng
              </Text>
            </View>
            <Divider />
            <View style={styles.menuItem}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                ⚡ Điện nước & Dịch vụ
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Ghi chỉ số đồng hồ điện nước hàng tháng
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.menuItem}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                🛏️ Phòng của tôi
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Hợp đồng thuê, giá phòng và các tiện ích đã đăng ký
              </Text>
            </View>
            <Divider />
            <View style={styles.menuItem}>
              <Text variant="bodyLarge" style={styles.menuItemText}>
                📄 Hóa đơn & Thanh toán
              </Text>
              <Text variant="bodySmall" style={styles.menuItemSub}>
                Xem chi tiết tiền phòng, điện nước và lịch sử thanh toán
              </Text>
            </View>
          </>
        )}
        <Divider />
        <View style={styles.menuItem}>
          <Text variant="bodyLarge" style={styles.menuItemText}>
            🛠️ Báo sự cố & Sửa chữa
          </Text>
          <Text variant="bodySmall" style={styles.menuItemSub}>
            Gửi phản ánh sự cố kỹ thuật phòng tới ban quản lý
          </Text>
        </View>
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
          icon="lan-connect"
          onPress={onNavigateToStatus}
          style={styles.systemButton}
        >
          Kiểm tra kết nối API
        </Button>

        <Button
          mode="contained"
          icon="logout"
          buttonColor="#ef4444"
          onPress={() => logout()}
          style={styles.systemButton}
        >
          Đăng xuất
        </Button>
      </Surface>

      {/* Modal đổi mật khẩu */}
      <Portal>
        <Dialog visible={passwordDialogOpen} onDismiss={() => setPasswordDialogOpen(false)}>
          <Dialog.Title>Đổi mật khẩu</Dialog.Title>
          <Dialog.Content>
            {dialogError && (
              <HelperText type="error" visible={!!dialogError}>
                {dialogError}
              </HelperText>
            )}

            <TextInput
              label="Mật khẩu hiện tại"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              mode="outlined"
              style={styles.dialogInput}
              disabled={dialogLoading}
            />

            <TextInput
              label="Mật khẩu mới (>= 6 ký tự)"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.dialogInput}
              disabled={dialogLoading}
            />

            <TextInput
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.dialogInput}
              disabled={dialogLoading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPasswordDialogOpen(false)} disabled={dialogLoading}>
              Hủy
            </Button>
            <Button onPress={handleChangePassword} loading={dialogLoading} disabled={dialogLoading}>
              Xác nhận
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
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '700',
    color: '#0f172a',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  roleChip: {
    height: 24,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  menuCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  menuItemSub: {
    color: '#64748b',
    marginTop: 2,
  },
  systemCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  systemButton: {
    marginBottom: 10,
    borderRadius: 10,
  },
  dialogInput: {
    marginBottom: 10,
  },
});
