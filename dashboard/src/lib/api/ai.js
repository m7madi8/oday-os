import { api } from './client';

export function chat(message, history = []) {
  return api('/api/oday/mobile/ai/chat', {
    method: 'POST',
    body: { message, history },
  });
}
