import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Surface, useTheme } from 'react-native-paper';
import { useMobileAuth } from './AuthContext';

interface LoginScreenProps {
  onNavigateToActivate: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToActivate }) => {
  const theme = useTheme();
  const { login } = useMobileAuth();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginId.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(loginId.trim(), password);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Đăng nhập không thành công';
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
          <Text variant="displaySmall" style={[styles.brandTitle, { color: theme.colors.primary }]}>
            TroHub
          </Text>
          <Text variant="bodyLarge" style={styles.brandSubtitle}>
            Quản lý nhà trọ thông minh & tinh gọn
          </Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Đăng nhập
          </Text>

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <TextInput
            label="Tên đăng nhập / Số điện thoại"
            value={loginId}
            onChangeText={(t) => {
              setLoginId(t);
              setError(null);
            }}
            mode="outlined"
            autoCapitalize="none"
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
            disabled={loading}
          />

          <TextInput
            label="Mật khẩu"
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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
          >
            Đăng nhập
          </Button>

          <Button
            mode="text"
            onPress={onNavigateToActivate}
            disabled={loading}
            style={styles.activateButton}
          >
            Kích hoạt tài khoản bằng mã mời
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
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 16,
    color: '#1e293b',
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  activateButton: {
    marginTop: 12,
  },
});
