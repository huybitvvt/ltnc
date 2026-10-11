import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Text } from 'react-native-paper';
import { getMobileAccessToken, mobileApiClient } from '../features/auth/mobileClient';

export function PrivateImage({fileId}:{fileId:string}) {
  const [source,setSource]=useState<{uri:string;headers:Record<string,string>}>(),[error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController(); setSource(undefined);setError(false);
    mobileApiClient.head(`/files/${fileId}`,{signal:controller.signal}).then(()=>{
      if(!controller.signal.aborted) setSource({uri:mobileApiClient.getUri({url:`/files/${fileId}`}),headers:{Authorization:`Bearer ${getMobileAccessToken()}`}});
    }).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return ()=>controller.abort();
  },[fileId]);
  if(error)return <Text>Không tải được ảnh.</Text>;
  return source?<Image source={source} accessibilityLabel="Ảnh sự cố" style={{width:'100%',height:180,resizeMode:'contain'}} onError={()=>setError(true)}/>:<Text>Đang tải ảnh…</Text>;
}
