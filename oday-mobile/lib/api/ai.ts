import { api } from '@/lib/api/client';

export function chat(message: string, history: { role: 'user' | 'assistant'; content: string }[] = []) {
  return api<{ reply: string }>('/api/oday/mobile/ai/chat', {
    method: 'POST',
    body: { message, history },
  });
}
