import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { ActivateScreen } from '@/features/auth/ActivateScreen';
import { HomeScreen } from '@/features/dashboard/HomeScreen';
import { MobileStatusScreen } from '@/features/status/MobileStatusScreen';
import { PropertyScreen } from '@/features/property/PropertyScreen';
import { ContractsScreen } from '@/features/contracts/ContractsScreen';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useMobileAuth();
  const [authView, setAuthView] = useState<'LOGIN' | 'ACTIVATE'>('LOGIN');
  const [mainView, setMainView] = useState<'HOME' | 'STATUS' | 'PROPERTY' | 'CONTRACTS'>('HOME');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Đang khởi tạo TroHub Mobile...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'ACTIVATE') {
      return <ActivateScreen onNavigateToLogin={() => setAuthView('LOGIN')} />;
    }
    return <LoginScreen onNavigateToActivate={() => setAuthView('ACTIVATE')} />;
  }

  if (mainView === 'STATUS') {
    return <MobileStatusScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'PROPERTY') {
    return <PropertyScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'CONTRACTS') {
    return <ContractsScreen onBack={() => setMainView('HOME')} />;
  }

  return (
    <HomeScreen
      onNavigateToStatus={() => setMainView('STATUS')}
      onNavigateToProperty={() => setMainView('PROPERTY')}
      onNavigateToContracts={() => setMainView('CONTRACTS')}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
  },
});
