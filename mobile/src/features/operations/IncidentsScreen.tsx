import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
import { mobileOperationsApi } from './operationsApi';
import { IssueDto, IssueStatus } from './types';
import { mobileApiClient } from '../auth/mobileClient';

interface IncidentsScreenProps {
  onBack?: () => void;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const { user } = useMobileAuth();
  const isTenant = user?.role === 'TENANT';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  // Dialog: Báo sự cố mới
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [formContractId, setFormContractId] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dialog: Chi tiết sự cố & Chuyển trạng thái
  const [detailDialogVisible, setDetailDialogVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueDto | null>(null);
  const [reopenDialogVisible, setReopenDialogVisible] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [issueList, contractRes] = await Promise.all([
        mobileOperationsApi.listIssues(),
        mobileApiClient.get<any>('/contracts'),
      ]);
      setIssues(issueList);
      const listC = contractRes.data?.data?.content || contractRes.data?.data || [];
      setContracts(listC);

      if (isTenant && listC.length > 0) {
        const activeC = listC.find((c: any) => c.status === 'ACTIVE') || listC[0];
        setFormContractId(activeC.id);
        setFormRoomId(activeC.roomId);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Không thể tải danh sách sự cố');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateIssue = async () => {
    if (!formContractId || !formRoomId || !formTitle.trim() || !formDesc.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ tiêu đề và mô tả sự cố.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await mobileOperationsApi.createIssue({
        contractId: formContractId,
        roomId: formRoomId,
        title: formTitle.trim(),
        description: formDesc.trim(),
      });
      setCreateDialogVisible(false);
      setFormTitle('');
      setFormDesc('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Gửi báo cáo sự cố thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: IssueStatus, comment?: string) => {
    setErrorMsg(null);
    try {
      const updated = await mobileOperationsApi.updateIssueStatus(issueId, { status, comment });
      setSelectedIssue(updated);
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Cập nhật trạng thái thất bại.');
    }
  };

  const handleReopen = async () => {
    if (!selectedIssue) return;
    if (!reopenReason.trim()) {
      setErrorMsg('Vui lòng nêu rõ lý do yêu cầu mở lại (BR-127).');
      return;
    }
    await handleUpdateStatus(selectedIssue.id, 'IN_PROGRESS', reopenReason.trim());
    setReopenDialogVisible(false);
    setReopenReason('');
  };

  const renderStatusChip = (status: IssueStatus) => {
    switch (status) {
      case 'OPEN':
        return <Chip style={[styles.chip, { backgroundColor: '#ffe0b2' }]} textStyle={{ color: '#e65100' }}>Chờ tiếp nhận</Chip>;
      case 'ACCEPTED':
        return <Chip style={[styles.chip, { backgroundColor: '#e1f5fe' }]} textStyle={{ color: '#0288d1' }}>Đã nhận</Chip>;
      case 'IN_PROGRESS':
        return <Chip style={[styles.chip, { backgroundColor: '#ede7f6' }]} textStyle={{ color: '#512da8' }}>Đang sửa</Chip>;
      case 'RESOLVED':
        return <Chip style={[styles.chip, { backgroundColor: '#e8f5e9' }]} textStyle={{ color: '#2e7d32' }}>Đã sửa xong</Chip>;
      case 'CLOSED':
        return <Chip style={[styles.chip, { backgroundColor: '#f5f5f5' }]} textStyle={{ color: '#757575' }}>Đã đóng</Chip>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      <View style={styles.header}>
        <View>
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            Sự Cố & Sửa Chữa
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Báo hỏng hóc thiết bị, theo dõi tiến trình sửa chữa
          </Text>
        </View>
        <Button
          mode="contained"
          icon="plus"
          compact
          onPress={() => setCreateDialogVisible(true)}
        >
          Báo Sự Cố
        </Button>
      </View>

      {errorMsg && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={{ color: '#d32f2f' }}>{errorMsg}</Text>
          </Card.Content>
        </Card>
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {issues.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={{ textAlign: 'center', color: theme.colors.outline }}>
                  Chưa có sự cố bảo trì nào được ghi nhận.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            issues.map((issue) => (
              <TouchableOpacity
                key={issue.id}
                onPress={() => {
                  setSelectedIssue(issue);
                  setDetailDialogVisible(true);
                }}
              >
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Text variant="titleSmall" style={{ fontWeight: 'bold', flex: 1 }}>
                        {issue.title}
                      </Text>
                      {renderStatusChip(issue.status)}
                    </View>

                    <Text variant="bodyMedium" numberOfLines={2} style={{ marginVertical: 4 }}>
                      {issue.description}
                    </Text>

                    <Divider style={{ marginVertical: 8 }} />

                    <View style={styles.cardFooter}>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        Phòng {issue.roomCode} &bull; {issue.createdByName}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                        {new Date(issue.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL: BÁO SỰ CỐ MỚI */}
      <Portal>
        <Dialog visible={createDialogVisible} onDismiss={() => setCreateDialogVisible(false)}>
          <Dialog.Title>Báo Cáo Sự Cố Mới</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 350 }}>
              <TextInput
                label="Tiêu đề sự cố *"
                value={formTitle}
                onChangeText={setFormTitle}
                mode="outlined"
                style={{ marginBottom: 12 }}
                placeholder="Ví dụ: Rò rỉ nước bồn cầu, hỏng đèn..."
              />
              <TextInput
                label="Mô tả chi tiết sự cố *"
                value={formDesc}
                onChangeText={setFormDesc}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={{ marginBottom: 12 }}
                placeholder="Mô tả cụ thể vị trí hư hại, thời điểm phát hiện..."
              />
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                Theo BR-125: Người thuê chỉ có thể gửi sự cố khi đang có hợp đồng cư trú ACTIVE.
              </Text>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" onPress={handleCreateIssue} loading={submitting}>
              Gửi Báo Cáo
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* MODAL: CHI TIẾT SỰ CỐ & THAO TÁC */}
      <Portal>
        <Dialog visible={detailDialogVisible} onDismiss={() => setDetailDialogVisible(false)}>
          <Dialog.Title>Chi Tiết Sự Cố</Dialog.Title>
          <Dialog.Content>
            {selectedIssue && (
              <ScrollView style={{ maxHeight: 400 }}>
                <View style={styles.cardHeader}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold', flex: 1 }}>
                    {selectedIssue.title}
                  </Text>
                  {renderStatusChip(selectedIssue.status)}
                </View>

                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginVertical: 4 }}>
                  Phòng {selectedIssue.roomCode} &bull; Người báo: {selectedIssue.createdByName} &bull;{' '}
                  {new Date(selectedIssue.createdAt).toLocaleString('vi-VN')}
                </Text>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>Mô tả hiện trường:</Text>
                <Text variant="bodyMedium" style={{ marginTop: 4, marginBottom: 12 }}>
                  {selectedIssue.description}
                </Text>

                <Divider style={{ marginVertical: 8 }} />

                {/* Các nút hành động */}
                <Text variant="labelMedium" style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  Cập nhật tiến trình:
                </Text>

                {!isTenant && selectedIssue.status === 'OPEN' && (
                  <Button
                    mode="contained"
                    buttonColor="#0288d1"
                    style={{ marginBottom: 8 }}
                    onPress={() => handleUpdateStatus(selectedIssue.id, 'ACCEPTED', 'Đã tiếp nhận yêu cầu')}
                  >
                    Tiếp Nhận Xử Lý
                  </Button>
                )}

                {!isTenant && selectedIssue.status === 'ACCEPTED' && (
                  <Button
                    mode="contained"
                    buttonColor="#512da8"
                    style={{ marginBottom: 8 }}
                    onPress={() => handleUpdateStatus(selectedIssue.id, 'IN_PROGRESS', 'Thợ đang tiến hành sửa chữa')}
                  >
                    Bắt Đầu Sửa Chữa
                  </Button>
                )}

                {!isTenant && selectedIssue.status === 'IN_PROGRESS' && (
                  <Button
                    mode="contained"
                    buttonColor="#2e7d32"
                    style={{ marginBottom: 8 }}
                    onPress={() => handleUpdateStatus(selectedIssue.id, 'RESOLVED', 'Đã sửa chữa và kiểm tra hoàn tất')}
                  >
                    Báo Đã Sửa Xong
                  </Button>
                )}

                {selectedIssue.status === 'RESOLVED' && (
                  <View style={{ gap: 8 }}>
                    <Button
                      mode="contained"
                      buttonColor="#2e7d32"
                      icon="check-circle"
                      onPress={() => handleUpdateStatus(selectedIssue.id, 'CLOSED', 'Xác nhận kiểm tra hoạt động tốt')}
                    >
                      Xác Nhận Đóng Sự Cố
                    </Button>
                    <Button
                      mode="outlined"
                      textColor="#e65100"
                      icon="replay"
                      onPress={() => setReopenDialogVisible(true)}
                    >
                      Yêu Cầu Mở Lại
                    </Button>
                  </View>
                )}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDetailDialogVisible(false)}>Đóng</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* MODAL: MỞ LẠI SỰ CỐ */}
      <Portal>
        <Dialog visible={reopenDialogVisible} onDismiss={() => setReopenDialogVisible(false)}>
          <Dialog.Title>Mở Lại Sự Cố (BR-127)</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ marginBottom: 8, color: theme.colors.outline }}>
              Vui lòng nêu rõ lý do tại sao sự cố chưa được khắc phục triệt để.
            </Text>
            <TextInput
              label="Lý do mở lại *"
              value={reopenReason}
              onChangeText={setReopenReason}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReopenDialogVisible(false)}>Hủy</Button>
            <Button mode="contained" buttonColor="#e65100" onPress={handleReopen}>
              Gửi Mở Lại
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 10,
    backgroundColor: '#fff',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    height: 28,
  },
  errorCard: {
    margin: 12,
    backgroundColor: '#ffebee',
  },
});
