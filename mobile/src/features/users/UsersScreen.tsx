import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, Checkbox, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mobileApiClient } from '../auth/mobileClient';
import { useMobileAuth } from '../auth/AuthContext';

type Staff = { id:string; login:string; enabled:boolean };
type Building = { id:string; name:string };
export function UsersScreen({onBack}:{onBack:()=>void}) {
  const {user}=useMobileAuth();
  const cache=useQueryClient();
  const [page,setPage]=useState(0),[login,setLogin]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [selected,setSelected]=useState<Staff|null>(null),[assigned,setAssigned]=useState<string[]>([]);
  const users=useQuery({queryKey:['staff',page],enabled:user?.role==='OWNER',queryFn:async()=> (await mobileApiClient.get<{data:Staff[]}>('/users',{params:{role:'STAFF',page,size:20}})).data.data});
  const buildings=useQuery({queryKey:['staff-assignment-buildings'],enabled:user?.role==='OWNER',queryFn:async()=>{const result=await mobileApiClient.get('/buildings',{params:{size:100}});return (result.data.data.content??result.data.data) as Building[];}});
  async function command(action:()=>Promise<void>) {setBusy(true);setError('');try{await action();await cache.invalidateQueries({queryKey:['staff']});}catch(e:any){setError(e.response?.data?.error?.message??'Không thực hiện được yêu cầu');}finally{setBusy(false);}}
  if(user?.role!=='OWNER') return <><Button onPress={onBack}>Quay lại</Button><Text>Chỉ chủ trọ được quản lý nhân viên.</Text></>;
  return <ScrollView contentContainerStyle={{padding:16,gap:12}}>
    <Button onPress={onBack}>Quay lại</Button><Text variant="headlineSmall">Nhân viên và phân công</Text>
    {(error || users.isError) && <HelperText type="error">{error || 'Không tải được nhân viên'}</HelperText>}
    <TextInput label="Tên đăng nhập nhân viên mới" value={login} onChangeText={setLogin} autoCapitalize="none" disabled={busy} />
    <Button loading={busy} disabled={busy || !login.trim()} onPress={()=>command(async()=>{const result=await mobileApiClient.post('/users',{login:login.trim(),buildingIds:[]});setCode(result.data.data.inviteCode);setLogin('');})}>Tạo và cấp mã mời</Button>
    {users.isLoading && <Text>Đang tải nhân viên…</Text>}
    {users.data?.length===0 && <Text>Chưa có nhân viên.</Text>}
    {users.data?.map(staff=><Card key={staff.id}><Card.Title title={staff.login} subtitle={staff.enabled?'Đang hoạt động':'Chưa kích hoạt hoặc đã khóa'} /><Card.Actions>
      <Button disabled={busy} onPress={()=>command(async()=>{await mobileApiClient.put(`/users/${staff.id}/status`,{enabled:!staff.enabled});})}>{staff.enabled?'Khóa':'Mở khóa'}</Button>
      <Button disabled={busy} onPress={()=>command(async()=>{const result=await mobileApiClient.post(`/users/${staff.id}/reissue-invite`);setCode(result.data.data.inviteCode);})}>Cấp mã</Button>
      <Button disabled={busy} onPress={()=>command(async()=>{const result=await mobileApiClient.get(`/users/${staff.id}/assignments`);setAssigned(result.data.data);setSelected(staff);})}>Phân công</Button>
    </Card.Actions></Card>)}
    <Button onPress={()=>users.refetch()} disabled={busy}>Làm mới</Button>
    <Button disabled={page===0 || users.isFetching} onPress={()=>setPage(page-1)}>Trang trước</Button><Text>Trang {page+1}</Text><Button disabled={users.isFetching || (users.data?.length??0)<20} onPress={()=>setPage(page+1)}>Trang sau</Button>
    <Portal><Dialog visible={!!code} onDismiss={()=>setCode('')}><Dialog.Title>Mã mời / đặt lại mật khẩu</Dialog.Title><Dialog.Content><Text selectable>{code}</Text><Text>Mã dùng một lần, hiệu lực 24 giờ. Người nhận tự đặt mật khẩu.</Text></Dialog.Content><Dialog.Actions><Button onPress={()=>setCode('')}>Đóng</Button></Dialog.Actions></Dialog>
    <Dialog visible={!!selected} onDismiss={()=>!busy && setSelected(null)}><Dialog.Title>Phân công {selected?.login}</Dialog.Title><Dialog.ScrollArea><ScrollView style={{maxHeight:300}}>{buildings.data?.map(building=><Checkbox.Item key={building.id} label={building.name} status={assigned.includes(building.id)?'checked':'unchecked'} disabled={busy} onPress={()=>setAssigned(old=>old.includes(building.id)?old.filter(id=>id!==building.id):[...old,building.id])} />)}</ScrollView></Dialog.ScrollArea><Dialog.Actions><Button disabled={busy} onPress={()=>setSelected(null)}>Hủy</Button><Button loading={busy} disabled={busy || buildings.isLoading || buildings.isError} onPress={()=>command(async()=>{await mobileApiClient.put(`/users/${selected!.id}/assignments`,{buildingIds:assigned});setSelected(null);})}>Lưu phân công</Button></Dialog.Actions></Dialog></Portal>
  </ScrollView>;
}
