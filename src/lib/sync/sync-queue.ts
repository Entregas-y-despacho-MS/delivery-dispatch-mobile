import { getStoredJson, removeStoredItem, setStoredJson } from '@/lib/storage/async-storage';

export interface QueueEntry<TPayload = unknown> {
  id: string;
  payload: TPayload;
  createdAt: string;
  attempts: number;
}

const QUEUE_KEY = 'app.sync.queue';

export async function readQueue<TPayload = unknown>(): Promise<Array<QueueEntry<TPayload>>> {
  return (await getStoredJson<Array<QueueEntry<TPayload>>>(QUEUE_KEY)) ?? [];
}

export async function enqueue<TPayload>(entry: QueueEntry<TPayload>) {
  const queue = await readQueue<TPayload>();
  await setStoredJson(QUEUE_KEY, [...queue, entry]);
}

export async function removeFromQueue(id: string) {
  const queue = await readQueue();
  await setStoredJson(QUEUE_KEY, queue.filter((entry) => entry.id !== id));
}

export function clearQueue() {
  return removeStoredItem(QUEUE_KEY);
}
