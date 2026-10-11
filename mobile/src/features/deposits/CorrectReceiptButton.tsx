import React, { useState } from 'react';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { mobileDepositsApi } from './depositsApi';
import { formatMoney, isMoney } from '../../shared/money';
import { DepositLedgerEntryResponse } from './types';

export function CorrectReceiptButton({entry, onChanged}: {entry: DepositLedgerEntryResponse; onChanged: () => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isMoney(delta, true) || BigInt(delta) === 0n || !reason.trim()) {setError('Nhập chênh lệch khác 0 và lý do.'); return;}
    setBusy(true); setError('');
    try {
      await mobileDepositsApi.correctReceipt({refEntryId: entry.id, deltaAmount: delta, reason: reason.trim()});
      setOpen(false); setDelta(''); setReason(''); await onChanged();
    } catch (e: any) {setError(e.response?.data?.message || 'Không thể sửa phiếu thu');}
    finally {setBusy(false);}
  };
  return <><Button compact onPress={() => {setError(''); setOpen(true);}}>Sửa phiếu thu</Button>
    <Portal><Dialog visible={open} onDismiss={() => !busy && setOpen(false)}><Dialog.Title>Sửa phiếu thu cọc</Dialog.Title>
      <Dialog.Content><Text>Phiếu gốc: {formatMoney(entry.amount)}</Text>
        {error && <HelperText type="error">{error}</HelperText>}
        <TextInput label="Chênh lệch VND (âm để giảm)" value={delta} onChangeText={setDelta} mode="outlined" />
        <TextInput label="Lý do" value={reason} onChangeText={setReason} mode="outlined" />
      </Dialog.Content><Dialog.Actions><Button disabled={busy} onPress={() => setOpen(false)}>Hủy</Button>
        <Button loading={busy} disabled={busy} onPress={() => void submit()}>Ghi đính chính</Button></Dialog.Actions>
    </Dialog></Portal></>;
}
