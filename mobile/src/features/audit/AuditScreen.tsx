import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { useMobileAuth } from '../auth/AuthContext';

type Event={id:string;action:string;actor_role:string;reason?:string;recorded_at:string;after_data:string};
export function AuditScreen({onBack}:{onBack:()=>void}) {
  const {user}=useMobileAuth(); const [page,setPage]=useState(0);
  const query=useQuery({queryKey:['audit',page],enabled:user?.role!=='TENANT',queryFn:async()=>(await mobileApiClient.get<{data:Event[]}>('/audit',{params:{page}})).data.data});
  return <ScrollView contentContainerStyle={{padding:16,gap:12}}><Button onPress={onBack}>Quay lại</Button><Text variant="headlineSmall">Nhật ký giao dịch</Text>
    {user?.role==='TENANT'?<Text>Chỉ quản lý được xem nhật ký.</Text>:<>
      {query.isLoading && <Text>Đang tải nhật ký…</Text>}{query.isError && <Text>Không tải được nhật ký.</Text>}{query.data?.length===0 && <Text>Chưa có giao dịch trong trang này.</Text>}
      {query.data?.map(event=><Card key={event.id}><Card.Title title={`${event.action} · ${event.actor_role}`} subtitle={new Date(event.recorded_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}/><Card.Content>{event.reason && <Text>{event.reason}</Text>}<Text selectable>{event.after_data}</Text></Card.Content></Card>)}
      <Button onPress={()=>query.refetch()}>Làm mới</Button><Button disabled={page===0 || query.isFetching} onPress={()=>setPage(page-1)}>Trang trước</Button><Text>Trang {page+1}</Text><Button disabled={query.isFetching || (query.data?.length??0)<50} onPress={()=>setPage(page+1)}>Trang sau</Button>
    </>}</ScrollView>;
}
