export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    // Harmonic double chime (C5 followed by E5)
    playTone(523.25, now, 0.25);        // C5
    playTone(659.25, now + 0.12, 0.35);  // E5
  } catch (e) {
    console.error('Failed to play notification chime:', e);
  }
}
