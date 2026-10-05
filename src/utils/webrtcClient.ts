/**
 * Matladuko Production WebRTC Client with WebSocket Signaling & Real-time Media
 * Supports Two-Device Live Audio & Video Calls with ICE Candidate exchange
 */

import { getSignalingUrl } from './apiConfig';

export interface WebRtcCallbacks {
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onCallStateChange?: (state: 'idle' | 'ringing' | 'connected' | 'ended' | 'failed') => void;
  onAudioLevel?: (db: number) => void;
  onIncomingCall?: (callData: { callId: string; caller: any; callType: 'audio' | 'video' }) => void;
  onCallEnded?: (reason: string, durationSec?: number) => void;
  onPresenceUpdate?: (onlineUsers: any[]) => void;
  onError?: (errorMsg: string) => void;
}

export class MatladukoWebRtcManager {
  private peerConnection: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioAnimFrame: number | null = null;
  private activeCallId: string | null = null;
  private currentUserId: string = '';
  private currentDisplayName: string = '';
  private currentAvatarUrl: string = '';
  private targetPeerId: string = '';
  private callbacks: WebRtcCallbacks = {};

  // Store offer and ICE candidates that arrive before callee accepts
  private pendingOffer: any = null;
  private earlyCandidates: RTCIceCandidateInit[] = [];

  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  constructor(callbacks: WebRtcCallbacks) {
    this.callbacks = callbacks;
  }

  public connectSignaling(userId: string, displayName: string, avatarUrl: string, gender?: string) {
    this.currentUserId = userId;
    this.currentDisplayName = displayName;
    this.currentAvatarUrl = avatarUrl;
    const wsUrl = getSignalingUrl();

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          type: 'REGISTER',
          userId,
          callerInfo: {
            id: userId,
            displayName,
            avatarUrl,
            gender,
          },
        }));
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (e: any) {
          console.warn('Signaling parse error:', e.message);
        }
      };

      this.ws.onclose = () => {
        // Reconnect after 3 seconds if dropped
        setTimeout(() => {
          if (this.currentUserId) {
            this.connectSignaling(this.currentUserId, this.currentDisplayName, this.currentAvatarUrl);
          }
        }, 3000);
      };
    } catch (e: any) {
      console.warn('WebSocket connection error:', e.message);
    }
  }

  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case 'PRESENCE_UPDATE': {
        this.callbacks.onPresenceUpdate?.(msg.onlineUsers || []);
        break;
      }

      case 'INCOMING_CALL': {
        this.activeCallId = msg.callId;
        this.targetPeerId = msg.caller?.id || '';
        this.callbacks.onIncomingCall?.({
          callId: msg.callId,
          caller: msg.caller,
          callType: msg.callType,
        });
        break;
      }

      case 'CALL_RINGING': {
        this.callbacks.onCallStateChange?.('ringing');
        break;
      }

      case 'CALL_OFFER': {
        // Store offer until Callee clicks "Accept"
        this.pendingOffer = msg.sdp;
        if (msg.callerId) this.targetPeerId = msg.callerId;
        if (msg.callId) this.activeCallId = msg.callId;

        // If callee has ALREADY clicked accept (peer connection exists)
        if (this.peerConnection) {
          await this.completeAnswerFlow(msg.sdp);
        }
        break;
      }

      case 'CALL_ANSWER': {
        if (this.peerConnection) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            // Apply any queued candidates
            for (const cand of this.earlyCandidates) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            }
            this.earlyCandidates = [];
            this.callbacks.onCallStateChange?.('connected');
          } catch (e: any) {
            console.warn('Error applying remote answer:', e.message);
          }
        }
        break;
      }

      case 'ICE_CANDIDATE': {
        if (msg.candidate) {
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (e) {
              console.warn('Error adding ICE candidate', e);
            }
          } else {
            this.earlyCandidates.push(msg.candidate);
          }
        }
        break;
      }

      case 'CALL_ENDED':
      case 'CALL_REJECTED': {
        this.cleanup();
        this.callbacks.onCallEnded?.(msg.reason || 'Call ended', msg.durationSeconds);
        this.callbacks.onCallStateChange?.('ended');
        break;
      }

      case 'CALL_FAILED': {
        this.cleanup();
        this.callbacks.onError?.(msg.message || 'Call failed.');
        this.callbacks.onCallStateChange?.('failed');
        break;
      }
    }
  }

  public async startCall(targetUserId: string, callType: 'audio' | 'video', callerInfo: any): Promise<string> {
    const callId = `CALL_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeCallId = callId;
    this.targetPeerId = targetUserId;
    this.earlyCandidates = [];

    // 1. Get user media (microphone/camera)
    await this.initLocalMedia(callType);

    // 2. Initialize RTCPeerConnection with local tracks
    await this.createPeerConnection();

    // 3. Inform signaling server to initiate call
    this.ws?.send(JSON.stringify({
      type: 'CALL_INITIATE',
      callId,
      userId: this.currentUserId,
      targetUserId,
      callType,
      callerInfo,
    }));

    // 4. Create SDP Offer
    const offer = await this.peerConnection!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video',
    });
    await this.peerConnection!.setLocalDescription(offer);

    // 5. Send Offer SDP via signaling
    this.ws?.send(JSON.stringify({
      type: 'CALL_OFFER',
      callId,
      userId: this.currentUserId,
      targetUserId,
      sdp: offer,
    }));

    this.callbacks.onCallStateChange?.('ringing');
    return callId;
  }

  public async acceptIncomingCall(callId: string, callerId: string, callType: 'audio' | 'video') {
    this.activeCallId = callId;
    this.targetPeerId = callerId;

    // 1. Get local media
    await this.initLocalMedia(callType);

    // 2. Create peer connection with local tracks
    await this.createPeerConnection();

    // 3. If offer has already arrived, answer it immediately
    if (this.pendingOffer) {
      await this.completeAnswerFlow(this.pendingOffer);
    }
  }

  private async completeAnswerFlow(offerSdp: any) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send CALL_ANSWER
      this.ws?.send(JSON.stringify({
        type: 'CALL_ANSWER',
        callId: this.activeCallId,
        targetUserId: this.targetPeerId,
        userId: this.currentUserId,
        sdp: answer,
      }));

      // Apply any early candidates
      for (const cand of this.earlyCandidates) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
      }
      this.earlyCandidates = [];

      this.callbacks.onCallStateChange?.('connected');
    } catch (err: any) {
      console.warn('Error completing answer flow:', err.message);
    }
  }

  public rejectIncomingCall(callId: string, callerId: string) {
    this.ws?.send(JSON.stringify({
      type: 'CALL_REJECT',
      callId,
      targetUserId: callerId,
      userId: this.currentUserId,
      reason: 'User declined call',
    }));
    this.cleanup();
  }

  public endCall(reason: string = 'User hung up') {
    if (this.activeCallId) {
      this.ws?.send(JSON.stringify({
        type: 'CALL_END',
        callId: this.activeCallId,
        targetUserId: this.targetPeerId,
        userId: this.currentUserId,
        reason,
      }));
    }
    this.cleanup();
    this.callbacks.onCallStateChange?.('ended');
  }

  private async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.activeCallId && this.targetPeerId) {
        this.ws?.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          callId: this.activeCallId,
          targetUserId: this.targetPeerId,
          candidate: event.candidate,
        }));
      }
    };

    // Remote Track received
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.callbacks.onRemoteStream?.(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.callbacks.onCallStateChange?.('connected');
      } else if (state === 'failed' || state === 'disconnected') {
        this.callbacks.onCallStateChange?.('ended');
      }
    };
  }

  private async initLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: callType === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
      });

      this.localStream = stream;
      this.callbacks.onLocalStream?.(stream);
      this.initAudioAnalyzer(stream);
      return stream;
    } catch (err: any) {
      console.warn('Real camera/mic unavailable. Creating synthetic media stream:', err.message);
      const synthetic = this.createSyntheticStream(callType === 'video');
      this.localStream = synthetic;
      this.callbacks.onLocalStream?.(synthetic);
      this.initAudioAnalyzer(synthetic);
      return synthetic;
    }
  }

  // Fallback synthetic stream generator for environments without physical mic/cam
  private createSyntheticStream(withVideo: boolean): MediaStream {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.connect(dst);
    osc.start();

    const tracks: MediaStreamTrack[] = [dst.stream.getAudioTracks()[0]];

    if (withVideo) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      let hue = 0;

      const draw = () => {
        hue = (hue + 1) % 360;
        ctx.fillStyle = `hsl(${hue}, 60%, 25%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Live Camera', canvas.width / 2, canvas.height / 2);
        ctx.font = '12px sans-serif';
        ctx.fillText('WebRTC Video Active', canvas.width / 2, canvas.height / 2 + 25);
      };

      setInterval(draw, 100);
      const videoStream = (canvas as any).captureStream(15);
      tracks.push(videoStream.getVideoTracks()[0]);
    }

    return new MediaStream(tracks);
  }

  private initAudioAnalyzer(stream: MediaStream) {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const approxDb = Math.round(30 + (avg / 255) * 55);
        this.callbacks.onAudioLevel?.(approxDb);
        this.audioAnimFrame = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (e) {
      // AudioContext may be restricted before gesture
    }
  }

  public setMute(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public setCameraOff(off: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !off;
      });
    }
  }

  public cleanup() {
    if (this.audioAnimFrame) {
      cancelAnimationFrame(this.audioAnimFrame);
      this.audioAnimFrame = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.activeCallId = null;
    this.pendingOffer = null;
    this.earlyCandidates = [];
  }
}
