import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface MobileStatusScreenProps {
  onBack?: () => void;
}

export const MobileStatusScreen: React.FC<MobileStatusScreenProps> = ({ onBack }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api/v1';

  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mobileBackendHealth'],
    queryFn: async () => {
      const res = await axios.get(`${apiUrl.replace('/api/v1', '')}/actuator/health`, {
        timeout: 5000,
      });
      return res.data;
    },
    retry: 1,
  });

  const isConnected = !error && data?.status === 'UP';

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            TroHub Mobile
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Trạng thái kết nối API Backend
          </Text>

          {isLoading ? (
            <ActivityIndicator animating size="large" style={styles.spacing} />
          ) : (
            <View style={styles.statusBox}>
              <Chip
                icon={isConnected ? 'check-circle' : 'alert-circle'}
                style={isConnected ? styles.chipSuccess : styles.chipWarning}
              >
                {isConnected ? 'ĐÃ KẾT NỐI BACKEND (UP)' : 'CHƯA KẾT NỐI BACKEND'}
              </Chip>
              <Text variant="bodySmall" style={styles.urlText}>
                API Host: {apiUrl}
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={() => refetch()}
            loading={isFetching}
            disabled={isFetching}
            style={styles.button}
          >
            Thử lại kết nối
          </Button>

          {onBack && (
            <Button
              mode="text"
              onPress={onBack}
              style={{ marginTop: 8, width: '100%' }}
            >
              Quay lại màn hình chính
            </Button>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  card: {
    elevation: 3,
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 24,
  },
  spacing: {
    marginVertical: 24,
  },
  statusBox: {
    alignItems: 'center',
    marginVertical: 16,
  },
  chipSuccess: {
    backgroundColor: '#dcfce7',
  },
  chipWarning: {
    backgroundColor: '#fef3c7',
  },
  urlText: {
    marginTop: 12,
    color: '#64748b',
  },
  button: {
    marginTop: 20,
    width: '100%',
  },
});
