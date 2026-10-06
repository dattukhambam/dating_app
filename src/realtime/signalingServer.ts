import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { dbQuery } from '../db/postgres';

interface RegisteredClient {
  userId: string;
  ws: WebSocket;
  userName?: string;
  avatarUrl?: string;
  gender?: string;
  isBusy: boolean;
  connectedAt: Date;
}

export interface SignalingMessage {
  type: 
    | 'REGISTER' 
    | 'CALL_INITIATE' 
    | 'CALL_OFFER' 
    | 'CALL_ANSWER' 
    | 'ICE_CANDIDATE' 
    | 'CALL_REJECT' 
    | 'CALL_END' 
    | 'HEARTBEAT'
    | 'GET_ONLINE_USERS';
  userId?: string;
  targetUserId?: string;
  callId?: string;
  callType?: 'audio' | 'video';
  sdp?: any;
  candidate?: any;
  reason?: string;
  callerInfo?: {
    id: string;
    displayName: string;
    avatarUrl: string;
    gender?: string;
    phoneNumber?: string;
  };
}

class SignalingService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, RegisteredClient>();
  private activeCalls = new Map<string, {
    callId: string;
    callerId: string;
    calleeId: string;
    callType: 'audio' | 'video';
    startedAt: number;
    connectedAt?: number;
  }>();
  private presenceCallback: ((userId: string, isOnline: boolean, callerInfo?: any) => void) | null = null;

  public onPresenceChange(cb: (userId: string, isOnline: boolean, callerInfo?: any) => void) {
    this.presenceCallback = cb;
  }

  public init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws/signaling' });
    console.log('📡 [WebRTC Signaling Server] Mounted at ws://localhost:3000/ws/signaling');

    this.wss.on('connection', (ws: WebSocket, req) => {
      let registeredUserId: string | null = null;

      ws.on('message', async (data: string) => {
        try {
          const msg: SignalingMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, msg, (uid) => { registeredUserId = uid; });
        } catch (err: any) {
          console.error('Error handling signaling message:', err.message);
        }
      });

      ws.on('close', () => {
        if (registeredUserId) {
          this.handleDisconnect(registeredUserId);
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err.message);
      });

      // Send initial welcome
      ws.send(JSON.stringify({
        type: 'SERVER_READY',
        timestamp: Date.now(),
        message: 'Connected to Matladuko Realtime WebRTC Signaling Server',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      }));
    });
  }

  private async handleMessage(ws: WebSocket, msg: SignalingMessage, setRegisteredUserId: (uid: string) => void) {
    switch (msg.type) {
      case 'REGISTER': {
        if (!msg.userId) return;
        setRegisteredUserId(msg.userId);
        this.clients.set(msg.userId, {
          userId: msg.userId,
          ws,
          userName: msg.callerInfo?.displayName,
          avatarUrl: msg.callerInfo?.avatarUrl,
          gender: msg.callerInfo?.gender,
          isBusy: false,
          connectedAt: new Date(),
        });

        // Update database presence
        dbQuery(`
          UPDATE user_profiles
          SET is_online = true, last_seen_at = NOW()
          WHERE user_id = $1;
        `, [msg.userId]).catch(() => {});

        this.presenceCallback?.(msg.userId, true, msg.callerInfo);

        ws.send(JSON.stringify({
          type: 'REGISTERED_SUCCESS',
          userId: msg.userId,
          onlineCount: this.clients.size,
        }));

        this.broadcastPresence();
        break;
      }

      case 'CALL_INITIATE': {
        const { targetUserId, callType, callId, callerInfo } = msg;
        if (!targetUserId || !callId) return;

        // Persist signal in DB
        dbQuery(`
          INSERT INTO call_signals (call_id, from_user_id, to_user_id, type, payload)
          VALUES ($1, $2, $3, 'CALL_INITIATE', $4);
        `, [callId, msg.userId || '', targetUserId, JSON.stringify({ callType, callerInfo })]).catch(() => {});

        const callee = this.clients.get(targetUserId);

        // Record active call in memory & DB
        this.activeCalls.set(callId, {
          callId,
          callerId: msg.userId || 'caller',
          calleeId: targetUserId,
          callType: callType || 'video',
          startedAt: Date.now(),
        });

        // Set busy flags
        const callerClient = msg.userId ? this.clients.get(msg.userId) : null;
        if (callerClient) callerClient.isBusy = true;
        if (callee) callee.isBusy = true;

        // Persist session to PostgreSQL
        try {
          await dbQuery(`
            INSERT INTO call_sessions (id, caller_id, callee_id, type, status, ringing_started_at)
            VALUES ($1, $2, $3, $4, 'ringing', NOW())
            ON CONFLICT (id) DO NOTHING;
          `, [callId, msg.userId, targetUserId, callType || 'video']);
        } catch (dbErr: any) {
          console.warn('PostgreSQL record call error (non-fatal):', dbErr.message);
        }

        // Notify callee with INCOMING_CALL if connected via WS
        if (callee && callee.ws.readyState === WebSocket.OPEN) {
          callee.ws.send(JSON.stringify({
            type: 'INCOMING_CALL',
            callId,
            callType: callType || 'video',
            caller: callerInfo || { id: msg.userId, displayName: 'Telugu Caller' },
          }));
        }

        // Notify caller that ringing has started
        ws.send(JSON.stringify({
          type: 'CALL_RINGING',
          callId,
          targetUserId,
        }));

        this.broadcastPresence();
        break;
      }

      case 'CALL_OFFER': {
        const { targetUserId, callId, sdp } = msg;
        if (targetUserId && callId) {
          dbQuery(`
            INSERT INTO call_signals (call_id, from_user_id, to_user_id, type, payload)
            VALUES ($1, $2, $3, 'CALL_OFFER', $4);
          `, [callId, msg.userId || '', targetUserId, JSON.stringify({ sdp })]).catch(() => {});
        }
        const target = targetUserId ? this.clients.get(targetUserId) : null;
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'CALL_OFFER',
            callId,
            callerId: msg.userId,
            sdp,
          }));
        }
        break;
      }

      case 'CALL_ANSWER': {
        const { targetUserId, callId, sdp } = msg;
        const call = callId ? this.activeCalls.get(callId) : null;
        if (call) {
          call.connectedAt = Date.now();
        }

        if (targetUserId && callId) {
          dbQuery(`
            INSERT INTO call_signals (call_id, from_user_id, to_user_id, type, payload)
            VALUES ($1, $2, $3, 'CALL_ANSWER', $4);
          `, [callId, msg.userId || '', targetUserId, JSON.stringify({ sdp })]).catch(() => {});
        }

        // Update database status to 'connected'
        if (callId) {
          try {
            await dbQuery(`
              UPDATE call_sessions 
              SET status = 'connected', connected_at = NOW() 
              WHERE id = $1;
            `, [callId]);
          } catch (e: any) {
            console.warn('DB update error on connect:', e.message);
          }
        }

        const target = targetUserId ? this.clients.get(targetUserId) : null;
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'CALL_ANSWER',
            callId,
            calleeId: msg.userId,
            sdp,
          }));
        }
        break;
      }

      case 'ICE_CANDIDATE': {
        const { targetUserId, callId, candidate } = msg;
        const target = targetUserId ? this.clients.get(targetUserId) : null;
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            callId,
            candidate,
          }));
        }
        break;
      }

      case 'CALL_REJECT': {
        const { targetUserId, callId, reason } = msg;
        this.cleanupCall(callId, reason || 'REJECTED');

        const target = targetUserId ? this.clients.get(targetUserId) : null;
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'CALL_REJECTED',
            callId,
            reason: reason || 'Callee declined call.',
          }));
        }
        break;
      }

      case 'CALL_END': {
        const { callId, targetUserId, reason } = msg;
        const durationSec = this.cleanupCall(callId, reason || 'USER_HUNG_UP');

        const target = targetUserId ? this.clients.get(targetUserId) : null;
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'CALL_ENDED',
            callId,
            reason: reason || 'Call ended.',
            durationSeconds: durationSec,
          }));
        }

        ws.send(JSON.stringify({
          type: 'CALL_ENDED',
          callId,
          reason: 'Call ended by you.',
          durationSeconds: durationSec,
        }));
        break;
      }

      case 'HEARTBEAT': {
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
        break;
      }
    }
  }

  private cleanupCall(callId?: string, reason: string = 'NORMAL'): number {
    if (!callId) return 0;
    const call = this.activeCalls.get(callId);
    let durationSec = 0;

    if (call) {
      if (call.connectedAt) {
        durationSec = Math.max(1, Math.round((Date.now() - call.connectedAt) / 1000));
      }

      // Reset busy states
      const caller = this.clients.get(call.callerId);
      const callee = this.clients.get(call.calleeId);
      if (caller) caller.isBusy = false;
      if (callee) callee.isBusy = false;

      // Update call_sessions in PostgreSQL
      dbQuery(`
        UPDATE call_sessions 
        SET 
          status = 'ended',
          ended_at = NOW(),
          duration_seconds = $2,
          end_reason = $3
        WHERE id = $1;
      `, [callId, durationSec, reason]).catch((e) => console.warn('DB update call_sessions ended error:', e.message));

      this.activeCalls.delete(callId);
      this.broadcastPresence();
    }

    return durationSec;
  }

  private handleDisconnect(userId: string) {
    // End any active calls for this user
    for (const [callId, call] of this.activeCalls.entries()) {
      if (call.callerId === userId || call.calleeId === userId) {
        const peerId = call.callerId === userId ? call.calleeId : call.callerId;
        const peer = this.clients.get(peerId);
        if (peer && peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(JSON.stringify({
            type: 'CALL_ENDED',
            callId,
            reason: 'PEER_DISCONNECTED',
          }));
        }
        this.cleanupCall(callId, 'NETWORK_DISCONNECT');
      }
    }

    this.clients.delete(userId);
    dbQuery(`
      UPDATE user_profiles
      SET is_online = false, last_seen_at = NOW()
      WHERE user_id = $1;
    `, [userId]).catch(() => {});
    this.presenceCallback?.(userId, false);
    this.broadcastPresence();
  }

  private broadcastPresence() {
    const onlineList = Array.from(this.clients.values()).map((c) => ({
      userId: c.userId,
      userName: c.userName || 'Telugu User',
      avatarUrl: c.avatarUrl || '',
      gender: c.gender || '',
      isBusy: c.isBusy,
    }));

    const payload = JSON.stringify({
      type: 'PRESENCE_UPDATE',
      onlineUsers: onlineList,
      count: onlineList.length,
    });

    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  public getLiveCallsCount(): number {
    return this.activeCalls.size;
  }

  public getOnlineUsersCount(): number {
    return this.clients.size;
  }

  public getActiveCallsList() {
    return Array.from(this.activeCalls.values());
  }

  public forceTerminateCall(callId: string, reason: string = 'Terminated by Admin') {
    const call = this.activeCalls.get(callId);
    if (!call) return;

    const caller = this.clients.get(call.callerId);
    const callee = this.clients.get(call.calleeId);

    const endMsg = JSON.stringify({
      type: 'CALL_ENDED',
      callId,
      reason,
      durationSeconds: call.connectedAt ? Math.round((Date.now() - call.connectedAt) / 1000) : 0,
    });

    if (caller && caller.ws.readyState === WebSocket.OPEN) {
      caller.ws.send(endMsg);
    }
    if (callee && callee.ws.readyState === WebSocket.OPEN) {
      callee.ws.send(endMsg);
    }

    this.cleanupCall(callId, reason);
  }

  public deliverToUser(targetUserId: string, message: any): boolean {
    const client = this.clients.get(targetUserId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
}

export const signalingService = new SignalingService();
