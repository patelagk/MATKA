import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function initSocketService(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // User joins their personal room for targeted wallet & entry updates
    socket.on('join:user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Client can join a specific market room if desired
    socket.on('join:market', (marketId: string) => {
      if (marketId) {
        socket.join(`market:${marketId}`);
      }
    });
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitMarketUpdated(marketData: any) {
  if (ioInstance) {
    ioInstance.emit('market:updated', marketData);
  }
}

export function emitResultPublished(resultData: any) {
  if (ioInstance) {
    ioInstance.emit('result:published', resultData);
  }
}

export function emitEntrySettled(userId: string, entryData: any) {
  if (ioInstance) {
    // Emit to specific user room and broadcast for admin live streams
    ioInstance.to(`user:${userId}`).emit('entry:settled', entryData);
    ioInstance.emit('admin:entry:settled', entryData);
  }
}

export function emitWalletUpdated(userId: string, walletData: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('wallet:updated', walletData);
  }
}
