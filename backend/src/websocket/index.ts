// WebSocket server and registration
export {
  registerWebSocketServer,
  getChannelManager,
  broadcastTickers,
  broadcastSignal,
  broadcastPump,
  broadcastNotification,
  getWsStats,
} from './ws.server.js';

// Authentication utilities
export { extractToken, validateWsToken, WsAuthError } from './ws.auth.js';

// Channel management
export {
  ChannelManager,
  CHANNEL_TYPES,
  isValidChannel,
  parseChannel,
  type ChannelType,
} from './ws.channels.js';

// Message handling
export {
  parseMessage,
  handleMessage,
  WsMessageType,
  type WsClientMessage,
  type WsServerMessage,
  type WsTickerMessage,
  type WsSignalMessage,
  type WsPumpMessage,
  type WsNotificationMessage,
} from './ws.handlers.js';
