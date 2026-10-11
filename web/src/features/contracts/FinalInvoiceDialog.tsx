import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { ContractSummary } from './types';
import { InvoiceDetail } from '../invoices/types';
import { invoicesApi } from '../invoices/invoicesApi';
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
      if (issue && invoice) setInvoice(await invoicesApi.issueInvoice(invoice.id));
      else {
        const list = await invoicesApi.listInvoices({ contractId: contract.id, billingMonth: month });
        const existing = list.content[0];
        setInvoice(existing?.status === 'ISSUED' ? await invoicesApi.getInvoice(existing.id)
          : await invoicesApi.createOrRecalculateDraft({ contractId: contract.id, billingMonth: month }));
      }
    } catch (err: any) { setError(err.response?.data?.message || 'Không nhận được kết quả. Có thể gửi lại thao tác.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={!!contract} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>Bước 2/3: Hóa đơn cuối phòng {contract?.roomNumber}</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      <Typography>Đã chốt trả phòng. Kiểm tra từng khoản trước phát hành, sau đó đối chiếu công nợ và cọc.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Kỳ hóa đơn cuối" type="month" value={month} disabled={busy}
        InputLabelProps={{ shrink: true }} onChange={e => { setMonth(e.target.value); setInvoice(null); }} />
      {invoice && <>
        <Typography>Từ {invoice.periodStart} đến trước {invoice.periodEndExclusive} · {invoice.status === 'ISSUED' ? 'Đã phát hành' : 'Bản nháp'}</Typography>
        {invoice.items.map((item, i) => <Stack key={item.id || i} direction="row" justifyContent="space-between">
          <Typography>{item.label}</Typography><Typography>{formatMoney(item.amount)}</Typography>
        </Stack>)}
        <Typography fontWeight={700}>Phải trả: {formatMoney(invoice.effectiveDue)}</Typography>
        <Typography>Còn nợ: {formatMoney(invoice.debt)} · Dư: {formatMoney(invoice.credit)}</Typography>
      </>}
    </Stack></DialogContent>
    <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
      <Button disabled={busy} onClick={onClose}>Để sau</Button>
      <Button disabled={busy || !month} onClick={() => run(false)}>Xem trước hóa đơn cuối</Button>
      {invoice?.status === 'DRAFT' && <Button variant="contained" disabled={busy} onClick={() => run(true)}>Phát hành hóa đơn cuối</Button>}
      {invoice?.status === 'ISSUED' && <Button variant="contained" disabled={busy} onClick={onDeposit}>Bước 3: Đối chiếu cọc</Button>}
    </DialogActions>
  </Dialog>;
}
