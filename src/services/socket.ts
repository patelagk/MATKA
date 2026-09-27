import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to MatkaVibe Real-Time WebSocket');
      const token = localStorage.getItem('matkavibe_token');
      const userStr = localStorage.getItem('matkavibe_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?._id) {
            socket?.emit('join:user', user._id);
          }
        } catch {
          // ignore
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Real-Time WebSocket');
    });
  }

  return socket;
}

export function registerSocketUser(userId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit('join:user', userId);
  } else {
    s.once('connect', () => {
      s.emit('join:user', userId);
    });
  }
}
