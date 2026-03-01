import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { HeygenDirectService } from './heygen-direct.service';

interface HeyGenDirectClient {
  id: string;
  socket: Socket;
  sessionId?: string;
  token?: string;
  lastActivity: Date;
}

@WebSocketGateway({
  namespace: '/heygen-direct',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
})
export class HeygenDirectGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HeygenDirectGateway.name);
  private readonly clients = new Map<string, HeyGenDirectClient>();

  constructor(private readonly heygenDirectService: HeygenDirectService) {}

  async handleConnection(client: Socket) {
    this.logger.log(`HeyGen Direct WebSocket 客戶端已連接: ${client.id}`);
    
    const clientInfo: HeyGenDirectClient = {
      id: client.id,
      socket: client,
      lastActivity: new Date(),
    };
    
    this.clients.set(client.id, clientInfo);
    
    client.emit('connected', {
      message: 'HeyGen Direct WebSocket 連接成功',
      clientId: client.id,
    });
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`HeyGen Direct WebSocket 客戶端已斷線: ${client.id}`);
    
    const clientInfo = this.clients.get(client.id);
    if (clientInfo?.sessionId && clientInfo.token) {
      try {
        await this.heygenDirectService.stopSession(clientInfo.sessionId, clientInfo.token);
        this.logger.log(`已自動停止會話 [${clientInfo.sessionId}] 由於客戶端斷線`);
      } catch (error) {
        this.logger.error(`停止會話時發生錯誤: ${error}`);
      }
    }
    
    this.clients.delete(client.id);
  }

  @SubscribeMessage('create-session')
  async handleCreateSession(
    @MessageBody() data: {
      avatarId: string;
      voiceId?: string;
      token: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.log(`收到建立會話請求 [${client.id}]: avatarId=${data.avatarId}`);
      
      const clientInfo = this.clients.get(client.id);
      if (!clientInfo) {
        client.emit('session-error', { error: '客戶端資訊不存在' });
        return;
      }

      const sessionInfo = await this.heygenDirectService.createSession({
        avatarId: data.avatarId,
        voiceId: data.voiceId,
        token: data.token,
      });

      clientInfo.sessionId = sessionInfo.sessionId;
      clientInfo.token = data.token;
      clientInfo.lastActivity = new Date();

      client.emit('session-created', {
        sessionId: sessionInfo.sessionId,
        livekitUrl: sessionInfo.livekitUrl,
        livekitToken: sessionInfo.livekitToken,
        livekitIceServers: sessionInfo.livekitIceServers,
        message: 'HeyGen 直接會話已建立',
      });

      this.logger.log(`會話建立成功 [${sessionInfo.sessionId}] for client [${client.id}]`);

      // 開始監聽會話狀態變化
      this.startSessionStatusMonitoring(sessionInfo.sessionId, client);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`建立會話失敗 [${client.id}]: ${errorMsg}`);
      
      client.emit('session-error', {
        error: errorMsg,
      });
    }
  }

  @SubscribeMessage('speak')
  async handleSpeak(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const clientInfo = this.clients.get(client.id);
      if (!clientInfo?.sessionId || !clientInfo.token) {
        client.emit('speak-error', { error: '沒有活動會話' });
        return;
      }

      this.logger.log(`收到語音合成請求 [${clientInfo.sessionId}]: ${data.text}`);

      await this.heygenDirectService.speak(clientInfo.sessionId, data.text, clientInfo.token);
      
      clientInfo.lastActivity = new Date();

      client.emit('speak-started', {
        sessionId: clientInfo.sessionId,
        text: data.text,
        message: '語音合成已開始',
      });

      this.logger.log(`語音合成開始 [${clientInfo.sessionId}]`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`語音合成失敗 [${client.id}]: ${errorMsg}`);
      
      client.emit('speak-error', {
        error: errorMsg,
      });
    }
  }

  @SubscribeMessage('stop-session')
  async handleStopSession(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.clients.get(client.id);
      if (!clientInfo?.sessionId || !clientInfo.token) {
        client.emit('stop-error', { error: '沒有活動會話可停止' });
        return;
      }

      this.logger.log(`收到停止會話請求 [${clientInfo.sessionId}]`);

      await this.heygenDirectService.stopSession(clientInfo.sessionId, clientInfo.token);

      client.emit('session-stopped', {
        sessionId: clientInfo.sessionId,
        message: '會話已停止',
      });

      clientInfo.sessionId = undefined;
      clientInfo.token = undefined;
      clientInfo.lastActivity = new Date();

      this.logger.log(`會話已停止 [${client.id}]`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`停止會話失敗 [${client.id}]: ${errorMsg}`);
      
      client.emit('stop-error', {
        error: errorMsg,
      });
    }
  }

  @SubscribeMessage('get-status')
  async handleGetStatus(@ConnectedSocket() client: Socket) {
    try {
      const clientInfo = this.clients.get(client.id);
      if (!clientInfo?.sessionId || !clientInfo.token) {
        client.emit('status-response', {
          hasSession: false,
          message: '沒有活動會話',
        });
        return;
      }

      const status = await this.heygenDirectService.getSessionStatus(
        clientInfo.sessionId,
        clientInfo.token,
      );

      client.emit('status-response', {
        hasSession: true,
        sessionId: clientInfo.sessionId,
        ...status,
      });

      clientInfo.lastActivity = new Date();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`取得狀態失敗 [${client.id}]: ${errorMsg}`);
      
      client.emit('status-error', {
        error: errorMsg,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const clientInfo = this.clients.get(client.id);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  private async startSessionStatusMonitoring(sessionId: string, client: Socket) {
    // 這裡可以實作定期狀態監控，或監聽 HeyGen 事件
    // 由於 HeyGen API 的限制，目前採用簡單的定期檢查
    const interval = setInterval(async () => {
      const clientInfo = this.clients.get(client.id);
      if (!clientInfo?.sessionId || clientInfo.sessionId !== sessionId) {
        clearInterval(interval);
        return;
      }

      try {
        const status = await this.heygenDirectService.getSessionStatus(sessionId, clientInfo.token!);
        
        client.emit('session-status-update', {
          sessionId,
          ...status,
        });

        if (status.status === 'stopped' || status.status === 'error') {
          clearInterval(interval);
        }

      } catch (error) {
        this.logger.error(`監控會話狀態時發生錯誤 [${sessionId}]: ${error}`);
        clearInterval(interval);
      }
    }, 5000); // 每 5 秒檢查一次

    // 10 分鐘後自動停止監控
    setTimeout(() => {
      clearInterval(interval);
    }, 10 * 60 * 1000);
  }

  // 廣播訊息給所有客戶端的方法
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // 發送訊息給特定會話的客戶端
  sendToSession(sessionId: string, event: string, data: any) {
    for (const [clientId, clientInfo] of this.clients.entries()) {
      if (clientInfo.sessionId === sessionId) {
        clientInfo.socket.emit(event, data);
      }
    }
  }

  // 取得統計資訊
  getStats() {
    const totalClients = this.clients.size;
    const activeSessions = Array.from(this.clients.values()).filter(
      client => client.sessionId
    ).length;

    return {
      totalClients,
      activeSessions,
      timestamp: new Date().toISOString(),
    };
  }
}