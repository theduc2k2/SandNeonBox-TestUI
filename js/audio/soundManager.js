/**
 * /scripts/audio/soundManager.js
 * RESPONSIBILITY: Handle all audio synthesis and playback.
 * Logic ported directly from test.html to fix missing functions.
 */

import { STATE } from '../core/state.js';
import { EventBus, EVENTS } from '../core/eventBus.js';

class SoundManagerClass {
    constructor() {
        this.ctx = null;
        this.isPlayingBGM = false;
        this.nextNoteTime = 0;
        this.beatCount = 0;
        this.tempo = 110;

        // Nhạc nền từ test.html
        this.sequence = [
            [261.63, null], [null, 523.25], 
            [196.00, null], [null, 659.25], 
            [261.63, null], [null, 523.25], 
            [196.00, null], [null, 587.33]
        ];
    }

    /* ================= INIT ================= */
    init() {
        // Kiểm tra setting từ STATE (nếu có)
        if (STATE.settings && !STATE.settings.sound) return;

        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume nếu bị browser chặn (User Interaction Policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Bắt đầu nhạc nền
        if (!this.isPlayingBGM) {
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduleBGM();
            this.isPlayingBGM = true;
        }
    }

    stopBGM() {
        this.isPlayingBGM = false;
    }

    /* ================= CORE AUDIO ENGINE (From test.html) ================= */

    scheduleBGM() {
        if (STATE.settings && !STATE.settings.sound) return;
        if (!this.ctx) return;

        const secondsPerBeat = 60.0 / this.tempo;
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.playBeat(this.nextNoteTime);
            this.nextNoteTime += secondsPerBeat / 2;
            this.beatCount = (this.beatCount + 1) % this.sequence.length;
        }
        if (this.isPlayingBGM) {
            requestAnimationFrame(this.scheduleBGM.bind(this));
        }
    }

    playBeat(time) {
        if (STATE.settings && !STATE.settings.sound) return;
        const notes = this.sequence[this.beatCount];
        if (!notes) return;
        
        if (notes[0]) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = notes[0] / 2;
            
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(time);
            osc.stop(time + 0.25);
        }
    }

    playTone(freq, type, duration, vol = 0.1, delay = 0) {
        if (STATE.settings && !STATE.settings.sound) return;
        if (!this.ctx) return;

        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + duration + 0.1);
    }

    playNoise(duration, vol = 0.2) {
        if (STATE.settings && !STATE.settings.sound) return;
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start();
    }

    /* ================= GAMEPLAY SFX (Direct mapping from test.html) ================= */

    // [FIX] Thêm hàm này cho BOM (Bomb Item)
    playCharge() {
        if (STATE.settings && !STATE.settings.sound) return;
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.6); // Rising pitch
        
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.65);
    }

    // [FIX] Thêm hàm này cho VORTEX (Hố đen)
    playVortex() {
        if (STATE.settings && !STATE.settings.sound) return;
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.linearRampToValueAtTime(10, t + 3.0); // Deep rumble
        
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 2.0);
        gain.gain.linearRampToValueAtTime(0.0, t + 4.0);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 4.1);
    }

    playDrop() { 
        this.playTone(150, 'triangle', 0.1, 0.1); 
    }

    playMatch(combo) { 
        this.playTone(261.63 * (1 + combo * 0.1), 'sine', 0.4, 0.2); 
    }

    playExplosion() { 
        this.playNoise(0.6, 0.4); 
        this.playTone(40, 'sawtooth', 0.6, 0.5); 
    }

    playClick() { 
        this.playTone(1200, 'sine', 0.05, 0.05); 
    }

    playPurchase() { 
        this.playTone(880, 'sine', 0.1, 0.3); 
        this.playTone(1760, 'sine', 0.2, 0.1, 0.1); 
    }

    playGameOver() { 
        this.stopBGM(); 
        this.playTone(300, 'triangle', 1.0, 0.3); 
        this.playTone(250, 'triangle', 1.0, 0.3, 0.2); 
        this.playTone(200, 'sawtooth', 1.5, 0.3, 0.4); 
    }
}

// Export instance duy nhất
export const SoundManager = new SoundManagerClass();