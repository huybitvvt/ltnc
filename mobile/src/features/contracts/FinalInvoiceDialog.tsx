import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Dialog, HelperText, Text, TextInput } from 'react-native-paper';
import { ContractSummary } from './types';
import { InvoiceDetail, InvoiceSummary } from '../invoices/types';
import { mobileApiClient } from '../auth/mobileClient';
import { formatMoney } from '../../shared/money';

export function FinalInvoiceDialog({ contract, onClose, onDeposit }: {
  contract: ContractSummary | null; onClose: () => void; onDeposit: () => void;
}) {
  const [month, setMonth] = useState('');
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!contract?.actualCheckoutDate) return;
    const lastDay = new Date(`${contract.actualCheckoutDate}T00:00:00Z`);
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
    setMonth(lastDay.toISOString().slice(0, 7)); setInvoice(null); setError('');
  }, [contract?.id]);
  const run = async (issue: boolean) => {
    if (!contract) return;
    setBusy(true); setError('');
    try {
      if (issue && invoice) {
        const res = await mobileApiClient.post<{ data: InvoiceDetail }>(`/invoices/${invoice.id}/issue`, {});
        setInvoice(res.data.data);
      } else {
        const list = await mobileApiClient.get<{ data: { content: InvoiceSummary[] } }>('/invoices',
          { params: { contractId: contract.id, billingMonth: month } });
        const existing = list.data.data.content[0];
        const res = existing?.status === 'ISSUED'
          ? await mobileApiClient.get<{ data: InvoiceDetail }>(`/invoices/${existing.id}`)
          : await mobileApiClient.post<{ data: InvoiceDetail }>('/invoices/draft', { contractId: contract.id, billingMonth: month });
        setInvoice(res.data.data);
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Không nhận được kết quả. Có thể gửi lại thao tác.'); }
    finally { setBusy(false); }
  };
  return <Dialog visible={!!contract} onDismiss={busy ? undefined : onClose}>
    <Dialog.Title>Bước 2/3: Hóa đơn cuối</Dialog.Title>
    <Dialog.ScrollArea><ScrollView style={{ maxHeight: 400 }}><View style={{ paddingVertical: 12, gap: 12 }}>
      <Text>Phòng {contract?.roomNumber} đã trả. Kiểm tra hóa đơn trước đối chiếu công nợ và cọc.</Text>
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <TextInput label="Kỳ cuối (YYYY-MM)" value={month} mode="outlined" disabled={busy}
        onChangeText={v => { setMonth(v); setInvoice(null); }} />
      {invoice && <>
        <Text>{invoice.periodStart} đến trước {invoice.periodEndExclusive} · {invoice.status === 'ISSUED' ? 'Đã phát hành' : 'Bản nháp'}</Text>
        {invoice.items.map((item, i) => <Text key={item.id || i}>{item.label}: {formatMoney(item.amount)}</Text>)}
        <Text variant="titleMedium">Phải trả: {formatMoney(invoice.effectiveDue)}</Text>
        <Text>Còn nợ: {formatMoney(invoice.debt)} · Dư: {formatMoney(invoice.credit)}</Text>
      </>}
      <Button loading={busy} disabled={busy || !/^\d{4}-\d{2}$/.test(month)} onPress={() => run(false)}>Xem trước hóa đơn cuối</Button>
      {invoice?.status === 'DRAFT' && <Button mode="contained" disabled={busy} onPress={() => run(true)}>Phát hành hóa đơn cuối</Button>}
      {invoice?.status === 'ISSUED' && <Button mode="contained" disabled={busy} onPress={onDeposit}>Bước 3: Đối chiếu cọc</Button>}
    </View></ScrollView></Dialog.ScrollArea>
    <Dialog.Actions><Button disabled={busy} onPress={onClose}>Để sau</Button></Dialog.Actions>
  </Dialog>;
}
