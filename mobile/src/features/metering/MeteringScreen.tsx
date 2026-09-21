import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  TextInput,
  Portal,
  Dialog,
  useTheme,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useMobileAuth } from '@/features/auth/AuthContext';
import { mobileApiClient } from '../auth/mobileClient';
import { Tariff, ConsumptionAlert } from './types';

interface MeteringScreenProps {
  onBack?: () => void;
}

export const MeteringScreen: React.FC<MeteringScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const { user } = useMobileAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'STAFF';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'READINGS' | 'ALERTS' | 'TARIFFS'>('READINGS');

  // Buildings & selections
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Data
  const [rooms, setRooms] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [alerts, setAlerts] = useState<ConsumptionAlert[]>([]);

  // Dialog: Acknowledge alert
  const [ackDialogVisible, setAckDialogVisible] = useState(false);
  const [targetAlert, setTargetAlert] = useState<ConsumptionAlert | null>(null);
  const [ackReason, setAckReason] = useState('');

  // Dialog: Quick record reading
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [targetRoom, setTargetRoom] = useState<any | null>(null);
  const [elecReadingInput, setElecReadingInput] = useState('');
  const [waterReadingInput, setWaterReadingInput] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      loadBuildingData(selectedBuildingId);
    }
  }, [selectedBuildingId, selectedMonth]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const res = await mobileApiClient.get('/buildings');
      const bList = res.data.data || [];
      setBuildings(bList);
      if (bList.length > 0) {
        setSelectedBuildingId(bList[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingData = async (bId: string) => {
    try {
      // 1. Rooms
      const rRes = await mobileApiClient.get(`/buildings/${bId}/rooms`);
      setRooms(rRes.data.data || []);

      // 2. Tariffs
      const tRes = await mobileApiClient.get(`/buildings/${bId}/tariffs`);
      setTariffs(tRes.data.data || []);

      // 3. Contracts and alerts
      const cRes = await mobileApiClient.get('/contracts', {
        params: { buildingId: bId, status: 'ACTIVE' },
      });
      const cList = cRes.data.data?.content || cRes.data.data || [];
      const allAlerts: ConsumptionAlert[] = [];
      for (const c of cList) {
        try {
          const aRes = await mobileApiClient.get(`/contracts/${c.id}/consumption-alerts`, {
            params: { billingMonth: selectedMonth },
          });
          allAlerts.push(...(aRes.data.data || []));
        } catch (_) {}
      }
      setAlerts(allAlerts);
    } catch (err: any) {
      console.error(err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedBuildingId) {
      await loadBuildingData(selectedBuildingId);
    } else {
      await loadInitialData();
    }
    setRefreshing(false);
  };

  const handleOpenRecord = (room: any) => {
    setTargetRoom(room);
    setElecReadingInput('');
    setWaterReadingInput('');
    setRecordDialogVisible(true);
  };

  const handleSaveReading = async () => {
    if (!targetRoom) return;
    try {
      setRecordDialogVisible(false);
      setFeedback({ type: 'success', text: `Đã lưu chỉ số phòng ${targetRoom.roomNumber} kỳ ${selectedMonth}!` });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Lỗi khi lưu chỉ số' });
    }
  };

  const handleOpenAck = (alert: ConsumptionAlert) => {
    setTargetAlert(alert);
    setAckReason('');
    setAckDialogVisible(true);
  };

  const handleConfirmAck = async () => {
    if (!targetAlert || !ackReason.trim()) return;
    try {
      await mobileApiClient.put(`/consumption-alerts/${targetAlert.id}/acknowledge`, {
        reason: ackReason.trim(),
      });
      setAckDialogVisible(false);
      setFeedback({ type: 'success', text: 'Đã xác nhận cảnh báo chỉ số đúng (BR-145)!' });
      loadBuildingData(selectedBuildingId);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Lỗi khi xác nhận' });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Đo lường và Đơn giá
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
          Quản lý chỉ số điện nước định kỳ và cảnh báo tiêu thụ
        </Text>
      </View>

      {/* Chọn tòa nhà */}
      {isManager && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buildingScroll}>
          {buildings.map((b) => (
            <Chip
              key={b.id}
              selected={selectedBuildingId === b.id}
              onPress={() => setSelectedBuildingId(b.id)}
              style={styles.buildingChip}
              showSelectedOverlay
            >
              {b.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Chip
          selected={activeTab === 'READINGS'}
          onPress={() => setActiveTab('READINGS')}
          style={styles.tabChip}
        >
          Chỉ số phòng
        </Chip>
        <Chip
          selected={activeTab === 'ALERTS'}
          onPress={() => setActiveTab('ALERTS')}
          style={styles.tabChip}
        >
          Cảnh báo ({alerts.length})
        </Chip>
        <Chip
          selected={activeTab === 'TARIFFS'}
          onPress={() => setActiveTab('TARIFFS')}
          style={styles.tabChip}
        >
          Bảng giá ({tariffs.length})
        </Chip>
      </View>

      {feedback && (
        <Card style={[styles.feedbackCard, { backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee' }]}>
          <Card.Content>
            <Text style={{ color: feedback.type === 'success' ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
              {feedback.text}
            </Text>
          </Card.Content>
        </Card>
      )}

      {loading && <ActivityIndicator animating size="large" style={{ marginVertical: 20 }} />}

      {/* TAB 1: DANH SÁCH PHÒNG & CHỈ SỐ */}
      {activeTab === 'READINGS' && (
        <View style={styles.contentSection}>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: 'bold' }}>
            Kỳ ghi số: {selectedMonth}
          </Text>

          {rooms.map((room) => (
            <Card key={room.id} style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    Phòng {room.roomNumber}
                  </Text>
                  <Chip compact style={{ height: 26 }}>
                    {room.status === 'RENTED' ? 'Đang thuê' : 'Trống'}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                  Sức chứa: {room.maxTenants} người | Giá thuê: {Number(room.basePrice).toLocaleString('vi-VN')} đ
                </Text>
              </Card.Content>

              {isManager && (
                <Card.Actions>
                  <Button mode="contained-tonal" compact onPress={() => handleOpenRecord(room)}>
                    Ghi chỉ số
                  </Button>
                </Card.Actions>
              )}
            </Card>
          ))}

          {rooms.length === 0 && !loading && (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
                  Không có phòng nào trong tòa nhà này
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* TAB 2: CẢNH BÁO TIÊU THỤ BẤT THƯỜNG */}
      {activeTab === 'ALERTS' && (
        <View style={styles.contentSection}>
          {alerts.map((a) => (
            <Card key={a.id} style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Chip compact style={{ backgroundColor: a.meterType === 'ELECTRICITY' ? '#fff3e0' : '#e1f5fe' }}>
                    {a.meterType === 'ELECTRICITY' ? 'Điện (kWh)' : 'Nước (m³)'}
                  </Chip>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        a.evaluationStatus === 'WARNING'
                          ? '#ffebee'
                          : a.evaluationStatus === 'NORMAL'
                          ? '#e8f5e9'
                          : '#f5f5f5',
                    }}
                  >
                    {a.evaluationStatus}
                  </Chip>
                </View>

                <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                  Kỳ đánh giá: {a.billingMonth}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4, fontFamily: 'monospace' }}>
                  Snapshot: {a.comparisonSnapshot}
                </Text>

                {a.acknowledgedAt && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 6 }}>
                    <Text variant="bodySmall" style={{ color: '#166534', fontWeight: 'bold' }}>
                      Đã xác nhận: {a.reason}
                    </Text>
                  </View>
                )}
              </Card.Content>

              {isManager && a.evaluationStatus === 'WARNING' && !a.acknowledgedAt && (
                <Card.Actions>
                  <Button mode="contained" buttonColor="#f59e0b" compact onPress={() => handleOpenAck(a)}>
                    Xác nhận số đúng
                  </Button>
                </Card.Actions>
              )}
            </Card>
          ))}

          {alerts.length === 0 && !loading && (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
                  Không có cảnh báo tiêu thụ nào trong kỳ này
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* TAB 3: BẢNG GIÁ DỊCH VỤ */}
      {activeTab === 'TARIFFS' && (
        <View style={styles.contentSection}>
          {tariffs.map((t) => (
            <Card key={t.id} style={styles.card} mode="outlined">
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                    {t.serviceName}
                  </Text>
                  <Text variant="titleMedium" style={{ color: '#2563eb', fontWeight: 'bold' }}>
                    {Number(t.unitPrice).toLocaleString('vi-VN')} đ / {t.serviceUnit}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                  Cách tính: {t.calculationType} | Hiệu lực từ: {t.effectiveMonth}
                </Text>
              </Card.Content>
            </Card>
          ))}

          {tariffs.length === 0 && !loading && (
            <Card style={styles.card} mode="outlined">
              <Card.Content>
                <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
                  Chưa cấu hình bảng giá nào cho tòa này
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* DIALOG: XÁC NHẬN CẢNH BÁO (BR-145) */}
      <Portal>
        <Dialog visible={ackDialogVisible} onDismiss={() => setAckDialogVisible(false)}>
          <Dialog.Title>Xác nhận số liệu đúng (BR-145)</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 12 }}>
              Quản lý xác nhận số liệu tiêu thụ tăng cao là chính xác để tiếp tục cho phép phát hành hóa đơn.
            </Text>
            <TextInput
              label="Lý do giải trình (Bắt buộc)"
              mode="outlined"
              multiline
              numberOfLines={3}
              value={ackReason}
              onChangeText={setAckReason}
              placeholder="Ví dụ: Khách mở máy lạnh nhiều trong mùa nóng..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAckDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" onPress={handleConfirmAck} disabled={!ackReason.trim()}>
              Xác nhận
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* DIALOG: GHI CHỈ SỐ */}
      <Portal>
        <Dialog visible={recordDialogVisible} onDismiss={() => setRecordDialogVisible(false)}>
          <Dialog.Title>Ghi chỉ số phòng {targetRoom?.roomNumber}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Chỉ số điện mới (kWh)"
              mode="outlined"
              keyboardType="numeric"
              value={elecReadingInput}
              onChangeText={setElecReadingInput}
              style={{ marginBottom: 12 }}
            />
            <TextInput
              label="Chỉ số nước mới (m³)"
              mode="outlined"
              keyboardType="numeric"
              value={waterReadingInput}
              onChangeText={setWaterReadingInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRecordDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" onPress={handleSaveReading}>
              Lưu chỉ số
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
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontWeight: 'bold',
  },
  buildingScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  buildingChip: {
    marginRight: 8,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabChip: {
    flex: 1,
  },
  feedbackCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  contentSection: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
export default MeteringScreen;
