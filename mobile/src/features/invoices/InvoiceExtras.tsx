import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { useMobileAuth } from '../auth/AuthContext';
import { ApiResponse } from '../auth/types';
import { mobileOperationsApi } from '../operations/operationsApi';
import { InvoiceDetail, InvoiceSummary } from './types';
import { formatMoney, isMoney } from '../../shared/money';

export function InvoiceExtras({ invoice, onChanged }: {invoice: InvoiceDetail; onChanged: () => Promise<void>}) {
  const { user } = useMobileAuth();
  const manager = user?.role === 'OWNER' || user?.role === 'STAFF';
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const feedback = useQuery({ queryKey: ['mobileInvoiceFeedback', invoice.id],
    queryFn: () => mobileOperationsApi.getInvoiceFeedbacks(invoice.id), enabled: invoice.status === 'ISSUED' });
  const targets = useQuery({ queryKey: ['mobileTransferTargets', invoice.contractId], enabled: transferOpen,
    queryFn: async () => (await mobileApiClient.get<ApiResponse<InvoiceSummary[]>>('/invoices', {
      params: {contractId: invoice.contractId, status: 'ISSUED'},
    })).data.data.filter(item => item.id !== invoice.id && BigInt(item.debt) > 0n) });
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); await feedback.refetch(); }
    catch (e: any) { setError(e.response?.data?.message || 'Không thể thực hiện thao tác'); }
    finally { setBusy(false); }
  };
  const transfer = async () => {
    const destination = targets.data?.find(item => item.id === target);
    if (!destination || !isMoney(amount) || BigInt(amount) <= 0n || !reason.trim()) {
      setError('Chọn hóa đơn đích, nhập số tiền nguyên dương và lý do.'); return;
    }
    if (BigInt(amount) > BigInt(invoice.credit) || BigInt(amount) > BigInt(destination.debt)) {
      setError('Số tiền vượt dư nguồn hoặc nợ đích.'); return;
    }
    Alert.alert('Xác nhận chuyển dư', `${formatMoney(amount)} sang hóa đơn kỳ ${destination.billingMonth}?`, [
      {text: 'Hủy', style: 'cancel'}, {text: 'Chuyển', onPress: () => void perform(async () => {
        await mobileApiClient.post('/payments/transfer-credit', {sourceInvoiceId: invoice.id,
          targetInvoiceId: destination.id, amount, reason: reason.trim()});
        setTransferOpen(false); setAmount(''); setReason(''); setTarget(''); await onChanged();
      })},
    ]);
  };
  if (invoice.status !== 'ISSUED') return null;
  return <View style={{gap: 8, marginTop: 16}}>
    {manager && BigInt(invoice.credit) > 0n && <Button mode="outlined" onPress={() => {setError(''); setTransferOpen(true);}}>Chuyển dư cùng hợp đồng</Button>}
    <Text variant="titleMedium">Phản hồi hóa đơn</Text>
    {(error || feedback.isError) && <HelperText type="error">{error || 'Không tải được phản hồi'}</HelperText>}
    {feedback.isLoading && <Text>Đang tải phản hồi...</Text>}
    {feedback.data?.map(item => <View key={item.id} style={{gap: 6, paddingVertical: 8}}>
      <Text>{item.createdByName}: {item.message} ({item.status})</Text>
      {item.replies?.map(reply => <Text key={reply.id}>{reply.actorName}: {reply.message}</Text>)}
      <TextInput label="Nội dung trả lời" mode="outlined" value={replies[item.id] || ''}
        onChangeText={value => setReplies(values => ({...values, [item.id]: value}))} />
      <Button disabled={busy || !replies[item.id]?.trim()} onPress={() => void perform(async () => {
        await mobileOperationsApi.replyFeedback(item.id, {message: replies[item.id].trim()});
        setReplies(values => ({...values, [item.id]: ''}));
      })}>Gửi trả lời</Button>
      {manager && item.status !== 'RESOLVED' && <Button disabled={busy} onPress={() => void perform(() =>
        mobileOperationsApi.updateFeedbackStatus(item.id, 'RESOLVED'))}>Đánh dấu đã giải quyết</Button>}
    </View>)}
    {!manager && <><TextInput label="Phản hồi mới" mode="outlined" multiline value={message} onChangeText={setMessage} />
      <Button disabled={busy || !message.trim()} onPress={() => void perform(async () => {
        await mobileOperationsApi.createInvoiceFeedback(invoice.id, {message: message.trim()}); setMessage('');
      })}>Gửi phản hồi</Button></>}
    <Portal><Dialog visible={transferOpen} onDismiss={() => !busy && setTransferOpen(false)}>
      <Dialog.Title>Chuyển số dư</Dialog.Title><Dialog.Content>
        <Text>Dư nguồn: {formatMoney(invoice.credit)}</Text>
        {error && <HelperText type="error">{error}</HelperText>}
        {targets.isError && <HelperText type="error">Không tải được hóa đơn đích.</HelperText>}
        <ScrollView style={{maxHeight: 160}}>
          {targets.data?.length === 0 && <Text>Không có hóa đơn cùng hợp đồng còn nợ.</Text>}
          {targets.data?.map(item => <Button key={item.id} mode={target === item.id ? 'contained' : 'outlined'}
            onPress={() => {setTarget(item.id); setAmount((BigInt(invoice.credit) < BigInt(item.debt) ? BigInt(invoice.credit) : BigInt(item.debt)).toString());}}>
            {item.billingMonth}: {formatMoney(item.debt)}
          </Button>)}
        </ScrollView>
        <TextInput label="Số tiền VND" value={amount} onChangeText={setAmount} keyboardType="number-pad" mode="outlined" />
        <TextInput label="Lý do" value={reason} onChangeText={setReason} mode="outlined" />
      </Dialog.Content><Dialog.Actions><Button disabled={busy} onPress={() => setTransferOpen(false)}>Hủy</Button>
        <Button loading={busy} disabled={busy || targets.isLoading} onPress={() => void transfer()}>Chuyển dư</Button></Dialog.Actions>
    </Dialog></Portal>
  </View>;
}
