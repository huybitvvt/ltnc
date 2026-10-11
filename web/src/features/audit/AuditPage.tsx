import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

interface AuditEvent { id: string; action: string; actor_role: string; recorded_at: string; reason?: string; after_data: string; }
export function AuditPage() {
  const [page,setPage]=useState(0);
  const query=useQuery({queryKey:['audit',page],queryFn:async()=> (await apiClient.get<{data:AuditEvent[]}>('/audit',{params:{page}})).data.data});
  return <Stack spacing={2}>
    <Typography variant="h5">Nhật ký giao dịch</Typography>
    <Typography color="text.secondary">Các bút toán đã ghi. Nhân viên chỉ thấy tòa nhà được phân công.</Typography>
    {query.isLoading && <CircularProgress aria-label="Đang tải nhật ký" />}
    {query.isError && <Alert severity="error">Không tải được nhật ký. <Button onClick={()=>query.refetch()}>Thử lại</Button></Alert>}
    {query.data?.length===0 && <Alert severity="info">Chưa có giao dịch trong trang này.</Alert>}
    {query.data?.map(event=><Paper key={event.id} sx={{p:2}}>
      <Typography fontWeight={700}>{event.action} · {event.actor_role}</Typography>
      <Typography>{new Date(event.recorded_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</Typography>
      {event.reason && <Typography>{event.reason}</Typography>}
      <Box component="pre" sx={{overflowX:'auto',fontSize:13}}>{JSON.stringify(JSON.parse(event.after_data),null,2)}</Box>
    </Paper>)}
    <Stack direction="row" spacing={2}><Button disabled={page===0 || query.isFetching} onClick={()=>setPage(page-1)}>Trang trước</Button><Typography>Trang {page+1}</Typography><Button disabled={query.isFetching || (query.data?.length??0)<50} onClick={()=>setPage(page+1)}>Trang sau</Button></Stack>
  </Stack>;
}
