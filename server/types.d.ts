import { WebSocket as WS } from 'ws';

declare module 'ws' {
  interface WebSocket extends WS {
    webhookId?: number;
  }
}
