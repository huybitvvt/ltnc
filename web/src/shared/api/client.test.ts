import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { afterEach, expect, test, vi } from 'vitest';
import { apiClient, setInMemoryToken } from './client';

afterEach(() => { vi.restoreAllMocks(); setInMemoryToken(null); });

test('a financial retry keeps its key after a lost response', async () => {
  const keys: string[] = [];
  apiClient.defaults.adapter = async config => {
    keys.push(String(config.headers['X-Idempotency-Key']));
    if (keys.length === 1) throw new AxiosError('lost response', 'ECONNABORTED', config);
    return { data: {}, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
  };
  const payload = {invoiceId:'invoice',amount:'9007199254740993',paymentMethod:'CASH'};
  await expect(apiClient.post('/payments/record', payload)).rejects.toThrow('lost response');
  await apiClient.post('/payments/record', payload);
  await apiClient.post('/payments/record', payload);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[1]);
});

test('refresh failure rejects every waiting request', async () => {
  vi.spyOn(axios,'get').mockResolvedValue({data:{data:{token:'csrf'}}});
  vi.spyOn(axios,'post').mockImplementation(async () => {
    await new Promise(resolve=>setTimeout(resolve,30));
    throw new Error('refresh failed');
  });
  apiClient.defaults.adapter = async (config:InternalAxiosRequestConfig) => {
    throw new AxiosError('expired',undefined,config,undefined,{data:{},status:401,statusText:'Unauthorized',headers:new AxiosHeaders(),config});
  };
  const result = await Promise.allSettled([apiClient.get('/invoices'),apiClient.get('/contracts')]);
  expect(result.map(item=>item.status)).toEqual(['rejected','rejected']);
  expect(axios.post).toHaveBeenCalledTimes(1);
});
