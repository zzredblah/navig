/**
 * Supabase Realtime Provider for Yjs
 *
 * Yjs 문서와 Supabase Realtime 채널을 연결하여
 * 실시간 협업 기능을 제공합니다.
 *
 * 기능:
 * - 자동 재연결 (지수 백오프)
 * - 에러 핸들링
 * - 오프라인 감지
 */

import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export interface CollaboratorState {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    color: string;
  };
  cursor: { x: number; y: number } | null;
  selection: string[];
}

interface SupabaseProviderOptions {
  awareness?: boolean;
  /** 자동 재연결 활성화 (기본: true) */
  autoReconnect?: boolean;
  /** 최대 재연결 시도 횟수 (기본: 5) */
  maxReconnectAttempts?: number;
  /** 초기 재연결 대기 시간 (ms, 기본: 1000) */
  initialReconnectDelay?: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export class SupabaseProvider {
  private doc: Y.Doc;
  private awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private supabase: SupabaseClient;
  private roomName: string;
  private options: Required<SupabaseProviderOptions>;

  private _status: ConnectionStatus = 'connecting';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private awarenessListeners: Set<(states: Map<number, CollaboratorState>) => void> = new Set();

  // 재연결 관련
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  // 로컬 상태 캐시 (재연결 시 복원용)
  private cachedLocalState: Partial<CollaboratorState> | null = null;

  constructor(
    roomName: string,
    doc: Y.Doc,
    options?: SupabaseProviderOptions
  ) {
    this.doc = doc;
    this.roomName = roomName;
    this.supabase = createClient();
    this.awareness = new Awareness(doc);

    // 옵션 기본값 설정
    this.options = {
      awareness: options?.awareness ?? true,
      autoReconnect: options?.autoReconnect ?? true,
      maxReconnectAttempts: options?.maxReconnectAttempts ?? 5,
      initialReconnectDelay: options?.initialReconnectDelay ?? 1000,
    };

    // 초기 연결
    this.connect();

    // 문서 변경 구독
    this.doc.on('update', this.handleDocUpdate.bind(this));

    // Awareness 변경 구독
    if (this.options.awareness) {
      this.awareness.on('change', this.handleAwarenessChange.bind(this));
    }

    // 브라우저 온라인/오프라인 이벤트 리스너
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * 채널 연결
   */
  private connect() {
    if (this.isDestroyed) return;

    this.setStatus('connecting');

    // Realtime 채널 설정
    this.channel = this.supabase.channel(`yjs:${this.roomName}`, {
      config: {
        broadcast: { self: false },
        presence: { key: String(this.awareness.clientID) },
      },
    });

    // 채널 이벤트 핸들러
    this.channel
      .on('broadcast', { event: 'sync' }, this.handleSync.bind(this))
      .on('broadcast', { event: 'update' }, this.handleUpdate.bind(this))
      .on('broadcast', { event: 'awareness' }, this.handleRemoteAwareness.bind(this))
      .on('presence', { event: 'sync' }, this.handlePresenceSync.bind(this))
      .on('presence', { event: 'join' }, this.handlePresenceJoin.bind(this))
      .on('presence', { event: 'leave' }, this.handlePresenceLeave.bind(this))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected');
          this.reconnectAttempts = 0; // 성공 시 카운터 리셋
          this.requestSync();

          // 캐시된 로컬 상태 복원
          if (this.cachedLocalState) {
            this.setLocalState(this.cachedLocalState);
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      });
  }

  /**
   * 재연결 스케줄링 (지수 백오프)
   */
  private scheduleReconnect() {
    if (this.isDestroyed || !this.options.autoReconnect) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.warn('[SupabaseProvider] 최대 재연결 시도 횟수 초과');
      return;
    }

    // 지수 백오프: 1초, 2초, 4초, 8초, 16초...
    const delay = this.options.initialReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[SupabaseProvider] ${delay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (this.channel) {
        this.channel.unsubscribe();
      }
      this.connect();
    }, delay);
  }

  /**
   * 브라우저 온라인 이벤트 핸들러
   */
  private handleOnline() {
    console.log('[SupabaseProvider] 네트워크 복구, 재연결 시도');
    this.reconnectAttempts = 0;
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.connect();
  }

  /**
   * 브라우저 오프라인 이벤트 핸들러
   */
  private handleOffline() {
    console.log('[SupabaseProvider] 네트워크 연결 끊김');
    this.setStatus('disconnected');
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  // 문서 변경 시 브로드캐스트
  private handleDocUpdate(update: Uint8Array, origin: unknown) {
    if (origin === this) return; // 자신의 업데이트는 무시

    this.channel.send({
      type: 'broadcast',
      event: 'update',
      payload: { update: Array.from(update) },
    });
  }

  // 원격 업데이트 수신
  private handleUpdate(payload: { payload: { update: number[] } }) {
    try {
      const update = new Uint8Array(payload.payload.update);
      Y.applyUpdate(this.doc, update, this);
    } catch (error) {
      console.error('[SupabaseProvider] Update error:', error);
    }
  }

  // 동기화 요청
  private requestSync() {
    const state = Y.encodeStateAsUpdate(this.doc);
    this.channel.send({
      type: 'broadcast',
      event: 'sync',
      payload: { state: Array.from(state) },
    });
  }

  // 동기화 수신
  private handleSync(payload: { payload: { state: number[] } }) {
    try {
      const state = new Uint8Array(payload.payload.state);
      Y.applyUpdate(this.doc, state, this);
    } catch (error) {
      console.error('[SupabaseProvider] Sync error:', error);
    }
  }

  // Awareness 변경 시 브로드캐스트
  private handleAwarenessChange() {
    const localState = this.awareness.getLocalState();
    if (localState) {
      this.channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: {
          clientId: this.awareness.clientID,
          state: localState,
        },
      });
    }

    // 리스너들에게 알림
    const states = this.awareness.getStates() as Map<number, CollaboratorState>;
    this.awarenessListeners.forEach((listener) => listener(states));
  }

  // 원격 Awareness 수신
  private handleRemoteAwareness(payload: { payload: { clientId: number; state: CollaboratorState } }) {
    const { clientId, state } = payload.payload;
    if (clientId !== this.awareness.clientID) {
      this.awareness.setLocalStateField(String(clientId), state);
      // 리스너들에게 알림
      const states = this.awareness.getStates() as Map<number, CollaboratorState>;
      this.awarenessListeners.forEach((listener) => listener(states));
    }
  }

  // Presence 동기화
  private handlePresenceSync() {
    // Presence 상태가 동기화됨
    const states = this.awareness.getStates() as Map<number, CollaboratorState>;
    this.awarenessListeners.forEach((listener) => listener(states));
  }

  // 새 사용자 참여
  private handlePresenceJoin({ newPresences }: { newPresences: Array<{ key: string }> }) {
    console.log('[SupabaseProvider] Users joined:', newPresences.map((p) => p.key));
  }

  // 사용자 퇴장
  private handlePresenceLeave({ leftPresences }: { leftPresences: Array<{ key: string }> }) {
    console.log('[SupabaseProvider] Users left:', leftPresences.map((p) => p.key));
    // 퇴장한 사용자의 Awareness 상태 제거
    leftPresences.forEach((presence) => {
      const clientId = parseInt(presence.key, 10);
      if (!isNaN(clientId)) {
        this.awareness.setLocalStateField(String(clientId), null);
      }
    });
    // 리스너들에게 알림
    const states = this.awareness.getStates() as Map<number, CollaboratorState>;
    this.awarenessListeners.forEach((listener) => listener(states));
  }

  /**
   * 로컬 상태 설정 (커서, 선택 등)
   */
  setLocalState(state: Partial<CollaboratorState>) {
    const currentState = this.awareness.getLocalState() || {};
    const newState = { ...currentState, ...state };

    // 재연결 시 복원을 위해 캐시
    this.cachedLocalState = { ...this.cachedLocalState, ...state };

    this.awareness.setLocalState(newState);
  }

  /**
   * 상태 변경 리스너 등록
   */
  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Awareness 변경 리스너 등록
   */
  onAwarenessChange(listener: (states: Map<number, CollaboratorState>) => void) {
    this.awarenessListeners.add(listener);
    return () => this.awarenessListeners.delete(listener);
  }

  /**
   * 현재 협업자 목록 가져오기
   */
  getCollaborators(): CollaboratorState[] {
    const states = this.awareness.getStates() as Map<number, CollaboratorState>;
    const collaborators: CollaboratorState[] = [];

    states.forEach((state, clientId) => {
      if (clientId !== this.awareness.clientID && state?.user) {
        collaborators.push(state);
      }
    });

    return collaborators;
  }

  /**
   * 연결 해제 및 정리
   */
  destroy() {
    this.isDestroyed = true;

    // 재연결 타이머 정리
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // 브라우저 이벤트 리스너 제거
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }

    // Yjs 이벤트 리스너 제거
    this.doc.off('update', this.handleDocUpdate.bind(this));
    this.awareness.off('change', this.handleAwarenessChange.bind(this));
    this.awareness.destroy();

    // 채널 정리
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    this.statusListeners.clear();
    this.awarenessListeners.clear();
  }
}
