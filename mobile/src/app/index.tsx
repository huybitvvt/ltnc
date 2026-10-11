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
import { MeteringScreen } from '@/features/metering/MeteringScreen';
import { InvoicesScreen } from '@/features/invoices/InvoicesScreen';
import { IncidentsScreen } from '@/features/operations/IncidentsScreen';
import { UsersScreen } from '@/features/users/UsersScreen';
import { AuditScreen } from '@/features/audit/AuditScreen';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useMobileAuth();
  const [authView, setAuthView] = useState<'LOGIN' | 'ACTIVATE' | 'RESET'>('LOGIN');
  const [mainView, setMainView] = useState<'HOME' | 'STATUS' | 'PROPERTY' | 'CONTRACTS' | 'METERING' | 'INVOICES' | 'INCIDENTS' | 'USERS' | 'AUDIT'>('HOME');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating size="large" />
        <Text style={styles.loadingText}>Đang khởi tạo TroHub Mobile...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'ACTIVATE' || authView === 'RESET') {
      return <ActivateScreen reset={authView === 'RESET'} onNavigateToLogin={() => setAuthView('LOGIN')} />;
    }
    return <LoginScreen onNavigateToActivate={() => setAuthView('ACTIVATE')} onNavigateToReset={() => setAuthView('RESET')} />;
  }

  if (mainView === 'STATUS') {
    return <MobileStatusScreen onBack={() => setMainView('HOME')} />;
  }
  if (mainView === 'USERS') return <UsersScreen onBack={() => setMainView('HOME')} />;
  if (mainView === 'AUDIT') return <AuditScreen onBack={() => setMainView('HOME')} />;

  if (mainView === 'PROPERTY') {
    return <PropertyScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'CONTRACTS') {
    return <ContractsScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'METERING') {
    return <MeteringScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'INVOICES') {
    return <InvoicesScreen onBack={() => setMainView('HOME')} />;
  }

  if (mainView === 'INCIDENTS') {
    return <IncidentsScreen onBack={() => setMainView('HOME')} />;
  }

  return (
    <HomeScreen
      onNavigateToStatus={() => setMainView('STATUS')}
      onNavigateToProperty={() => setMainView('PROPERTY')}
      onNavigateToContracts={() => setMainView('CONTRACTS')}
      onNavigateToMetering={() => setMainView('METERING')}
      onNavigateToInvoices={() => setMainView('INVOICES')}
      onNavigateToIncidents={() => setMainView('INCIDENTS')}
      onNavigateToUsers={() => setMainView('USERS')}
      onNavigateToAudit={() => setMainView('AUDIT')}
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
