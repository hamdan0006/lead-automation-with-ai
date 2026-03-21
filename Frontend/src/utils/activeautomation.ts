import { io, Socket } from 'socket.io-client';

/**
 * Socket.IO client utility for real-time communication with backend
 * Singleton pattern to ensure single connection across the app
 */
class SocketClient {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  /**
   * Initialize Socket.IO connection
   * @returns {Socket} Socket.IO client instance
   */
  connect(): Socket {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected, reusing existing connection');
      return this.socket;
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    console.log('Initializing Socket.IO connection to:', backendUrl);

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('✅ Socket.IO reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 Socket.IO reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnection failed');
    });

    return this.socket;
  }

  /**
   * Join a user-specific room to receive updates
   * @param {string} userId - User ID
   */
  joinUserRoom(userId: string): void {
    if (!this.socket) {
      console.warn('Socket not initialized, call connect() first');
      return;
    }

    console.log('Joining user room:', `user-${userId}`);
    this.socket.emit('join-user-room', userId);
  }

  /**
   * Join a job-specific room to receive progress updates
   * @param {string} jobId - Job ID
   */
  joinJobRoom(jobId: string): void {
    if (!this.socket) {
      console.warn('Socket not initialized, call connect() first');
      return;
    }

    console.log('Subscribing to job progress:', jobId);
    this.socket.emit('subscribeToJobProgress', jobId);
  }

  /**
   * Subscribe to automation progress events
   * @param {Function} callback - Callback function to handle progress updates
   * @returns {Function} Unsubscribe function
   */
  onAutomationProgress(callback: (data: any) => void): () => void {
    if (!this.socket) {
      console.warn('Socket not initialized, call connect() first');
      return () => { };
    }

    this.socket.on('automation-progress', callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off('automation-progress', callback);
    };
  }

  /**
   * Subscribe to job progress events
   * @param {Function} callback - Callback function to handle progress updates
   * @returns {Function} Unsubscribe function
   */
  onJobProgress(callback: (data: any) => void): () => void {
    if (!this.socket) {
      console.warn('Socket not initialized, call connect() first');
      return () => { };
    }

    this.socket.on('jobProgress', callback);

    // Return unsubscribe function
    return () => {
      this.socket?.off('jobProgress', callback);
    };
  }

  /**
   * Disconnect socket connection
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance
   * @returns {Socket|null} Socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
const socketClient = new SocketClient();
export default socketClient;