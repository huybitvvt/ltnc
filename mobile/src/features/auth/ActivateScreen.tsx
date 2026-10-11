import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Surface, useTheme } from 'react-native-paper';
import { useMobileAuth } from './AuthContext';
import { mobileApiClient } from './mobileClient';

interface ActivateScreenProps {
  onNavigateToLogin: () => void;
  reset?: boolean;
}

export const ActivateScreen: React.FC<ActivateScreenProps> = ({ onNavigateToLogin, reset = false }) => {
  const theme = useTheme();
  const { activate } = useMobileAuth();

  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!inviteCode.trim()) {
      setError('Vui lòng nhập mã kích hoạt');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (reset) await mobileApiClient.post('/auth/reset-password', { inviteCode: inviteCode.trim().toUpperCase(), password });
      else await activate(inviteCode.trim().toUpperCase(), password);
      setSuccessMsg('Mật khẩu đã được lưu. Vui lòng quay lại đăng nhập.');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Kích hoạt thất bại';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text variant="headlineMedium" style={[styles.brandTitle, { color: theme.colors.primary }]}>
            {reset ? 'Đặt lại mật khẩu' : 'Kích hoạt tài khoản'}
          </Text>
          <Text variant="bodyMedium" style={styles.brandSubtitle}>
            Nhập mã mời được quản lý cấp (hiệu lực trong 24 giờ)
          </Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          {successMsg && (
            <HelperText type="info" visible={!!successMsg} style={[styles.errorText, { color: '#059669' }]}>
              {successMsg}
            </HelperText>
          )}

          <TextInput
            label="Mã kích hoạt (Invite Code)"
            placeholder="Ví dụ: INV-A1B2C3D4"
            value={inviteCode}
            onChangeText={(t) => {
              setInviteCode(t);
              setError(null);
            }}
            mode="outlined"
            autoCapitalize="characters"
            left={<TextInput.Icon icon="key" />}
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Mật khẩu mới"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              setError(null);
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-check" />}
            style={styles.input}
            disabled={loading}
          />

          <Button
            mode="contained"
            onPress={handleActivate}
            loading={loading}
            disabled={loading}
            style={styles.activateButton}
            contentStyle={styles.buttonContent}
          >
            {reset ? 'Đặt lại mật khẩu' : 'Kích hoạt ngay'}
          </Button>

          <Button mode="text" onPress={onNavigateToLogin} disabled={loading} style={styles.backButton}>
            Quay lại đăng nhập
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  brandSubtitle: {
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  activateButton: {
    marginTop: 8,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  backButton: {
    marginTop: 12,
  },
});
