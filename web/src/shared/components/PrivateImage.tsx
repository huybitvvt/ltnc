import { useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { apiClient } from '../api/client';

export function PrivateImage({ fileId, alt }: { fileId: string; alt: string }) {
  const [src, setSrc] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setFailed(false); setSrc(undefined);
    apiClient.get<Blob>(`/files/${fileId}`, { responseType: 'blob', signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(data); setSrc(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [fileId]);
  if (failed) return <Alert severity="error">Không tải được ảnh.</Alert>;
  return src ? <Box component="img" src={src} alt={alt} sx={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }} /> : <span>Đang tải ảnh…</span>;
}
