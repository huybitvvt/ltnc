
import { createPendingCommands } from './pendingCommands';

test('lost-response key survives restart and is scoped to the actor', async () => {
  const data = new Map<string, string>();
  const storage = { get: (key: string) => data.get(key) || null,
    set: (key: string, value: string) => { data.set(key, value); }, remove: (key: string) => { data.delete(key); } };
  const first = createPendingCommands(storage); first.setActor('owner-a');
  const payload = { amount: '9007199254740993', note: 'Hoàn tiền nước' };
  const command = await first.acquire('/payments/record', payload);
  const restarted = createPendingCommands(storage); restarted.setActor('owner-a');
  expect((await restarted.acquire('/payments/record', payload)).key).toBe(command.key);
  expect([...data.keys()][0]).not.toContain('Hoàn');
  restarted.setActor('owner-b');
  expect((await restarted.acquire('/payments/record', payload)).key).not.toBe(command.key);
  restarted.setActor('owner-a'); await restarted.release(command.storageKey);
  expect((await restarted.acquire('/payments/record', payload)).key).not.toBe(command.key);
});

test('simultaneous submits share one persisted key', async () => {
  const store = new Map<string, string>();
  const commands = createPendingCommands({ get: async key => store.get(key) || null,
    set: async (key, value) => { store.set(key, value); }, remove: key => { store.delete(key); } });
  commands.setActor('staff');
  const result = await Promise.all([commands.acquire('/payments/record', {amount:'1'}), commands.acquire('/payments/record', {amount:'1'})]);
  expect(result[0].key).toBe(result[1].key); expect(store.size).toBe(1);
});

test('storage failure prevents sending without a durable key', async () => {
  const commands = createPendingCommands({ get: () => null, set: () => { throw new Error('storage full'); }, remove: () => {} });
  commands.setActor('owner');
  await expect(commands.acquire('/payments/record', {})).rejects.toThrow('storage full');
});
