// PWA & Push Notification Types

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface PushNotificationLog {
  id: string;
  subscription_id: string | null;
  user_id: string;
  notification_type: 'feedback' | 'chat' | 'project' | 'system';
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed' | 'clicked';
  error_message: string | null;
  sent_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export interface PushNotificationSettings {
  user_id: string;
  enabled: boolean;
  feedback_enabled: boolean;
  chat_enabled: boolean;
  project_enabled: boolean;
  system_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// Push API Request/Response types
export interface SubscribePushRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  device_name?: string;
}

export interface SendPushRequest {
  user_id: string;
  notification_type: 'feedback' | 'chat' | 'project' | 'system';
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  url?: string; // URL to open when clicked
}

// BeforeInstallPromptEvent type for PWA install prompt
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// PWA install state
export type PWAInstallState = 'idle' | 'installable' | 'installed' | 'unsupported';

// Service Worker message types
export interface ServiceWorkerMessage {
  type: 'SKIP_WAITING' | 'CACHE_URLS' | 'CLEAR_CACHE';
  payload?: unknown;
}

// Notification payload from Service Worker
export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}
