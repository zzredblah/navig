/**
 * 알림음 유틸리티
 *
 * Web Audio API를 사용하여 알림음 생성
 * 별도의 오디오 파일 없이 프로그래밍으로 소리 생성
 */

type SoundType = 'notification' | 'chat' | 'urgent';

// AudioContext 싱글톤 (브라우저 정책상 사용자 인터랙션 후에만 생성 가능)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('[Sounds] AudioContext 생성 실패:', e);
      return null;
    }
  }

  // suspended 상태면 resume 시도
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

/**
 * 알림음 재생
 */
export function playSound(type: SoundType = 'notification'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'notification':
        // 일반 알림: 부드러운 딩동 (2음)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, now); // A5
        oscillator.frequency.setValueAtTime(1108.73, now + 0.1); // C#6
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'chat':
        // 채팅 알림: 짧고 가벼운 팝 (1음)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1318.51, now); // E6
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;

      case 'urgent':
        // 긴급 알림: 강한 경고음 (3음, 빠르게)
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, now); // A5
        oscillator.frequency.setValueAtTime(988, now + 0.08); // B5
        oscillator.frequency.setValueAtTime(880, now + 0.16); // A5
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;
    }
  } catch (e) {
    console.warn('[Sounds] 알림음 재생 실패:', e);
  }
}

/**
 * 알림음 활성화 (사용자 인터랙션 시 호출)
 * 브라우저 정책상 첫 번째 사용자 인터랙션 후에 AudioContext 활성화 필요
 */
export function enableSounds(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * 알림 타입에 따른 소리 재생
 */
export function playSoundForNotificationType(type: string): void {
  switch (type) {
    case 'urgent_feedback':
    case 'deadline_reminder':
      playSound('urgent');
      break;
    case 'chat_message':
      playSound('chat');
      break;
    default:
      playSound('notification');
      break;
  }
}
