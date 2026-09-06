/**
 * Audio chime synthesizer using Web Audio API (no external sound files required)
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    
    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.14, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Note 3: E6 (1318.51 Hz) - High sparkly chime
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.24);
    gain3.gain.setValueAtTime(0.15, now + 0.24);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.8);
  } catch {
    // Audio context may require user interaction first
  }
}

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  type?: 'success' | 'info' | 'warning';
  previewUrl?: string;
  duration?: number;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const setting = localStorage.getItem('aikotools_notifications');
  if (setting === 'disabled') return false;
  return true;
}

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aikotools_notifications', enabled ? 'enabled' : 'disabled');
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission as NotificationPermissionState;
  }
}

export function notifyUser(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  playSound?: boolean;
  previewUrl?: string;
  type?: 'success' | 'info' | 'warning';
}) {
  const { title, body, icon = '/favicon.ico', tag, playSound = true, previewUrl, type = 'success' } = options;

  if (!areNotificationsEnabled()) {
    return;
  }

  if (playSound) {
    playSuccessChime();
  }

  // 1. Dispatch custom in-app toast event (works seamlessly in iframes & mobile viewports)
  if (typeof window !== 'undefined') {
    const toastEvent = new CustomEvent<ToastNotification>('aikotools:toast', {
      detail: {
        id: 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title,
        body,
        type,
        previewUrl,
        duration: 4000
      }
    });
    window.dispatchEvent(toastEvent);
  }

  // 2. Native Web Notification if available and granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        tag: tag || 'aikotools-notification',
        badge: icon,
        silent: !playSound
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {
      // Fallback
    }
  }
}
