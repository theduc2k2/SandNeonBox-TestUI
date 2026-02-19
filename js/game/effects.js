/**
 * /scripts/game/effects.js
 * RESPONSIBILITY:
 * Manage visual-only effects (Sparkles, Shockwaves, Flying Particles).
 * Updates STATE.activeEffects and STATE.flyingParticles.
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';

export const Effects = {
    bgCanvas: null,
    bgCtx: null,
    sparkles: [],
    width: 0,
    height: 0,

    init() {
        this.bgCanvas = document.getElementById('bg-canvas');
        if (this.bgCanvas) {
            this.bgCtx = this.bgCanvas.getContext('2d');
            this.resizeBg();
            window.addEventListener('resize', () => this.resizeBg());
            
            this.sparkles = [];
            for (let i = 0; i < 40; i++) {
                this.sparkles.push(this.createSparkle());
            }
            this.animateBg();
            console.log("Effects System Initialized");
        }
    },

    resizeBg() {
        if (!this.bgCanvas || !this.bgCanvas.parentElement) return;
        this.width = this.bgCanvas.parentElement.offsetWidth;
        this.height = this.bgCanvas.parentElement.offsetHeight;
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
    },

    createSparkle() {
        return {
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            size: Math.random() * 3 + 1,
            alpha: Math.random(),
            alphaSpeed: (Math.random() * 0.03 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() * 0.02 - 0.01),
            color: CONFIG.COLORS ? CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)] : '#FFD93D'
        };
    },

    addEffect(effectData) {
        STATE.activeEffects.push(effectData);
    },

    addFlyingParticle(particleData) {
        STATE.flyingParticles.push(particleData);
    },

    /**
     * Main update loop called by GameLoop
     */
    update() {
        // --- 1. VISUAL EFFECTS ---
        for (let i = STATE.activeEffects.length - 1; i >= 0; i--) {
            let e = STATE.activeEffects[i];
            
            if (e.type === 'shockwave') {
                e.size += 0.5; e.life -= 0.005;
            } else if (e.type === 'flash') {
                e.life -= 0.1;
            } else {
                if (e.size && !e.type) { e.life -= 0.05; }
                else {
                    e.x += (e.vx || 0); e.y += (e.vy || 0);
                    e.vy = (e.vy || 0) + (e.gravity || 0.25);
                    e.vx = (e.vx || 0) * (e.friction || 0.99);
                    e.life -= 0.01;
                }
            }
            if (e.life <= 0 || e.y > CONFIG.BOARD_HEIGHT + CONFIG.DOCK_HEIGHT + 50) {
                STATE.activeEffects.splice(i, 1);
            }
        }

        // --- 2. FLYING PARTICLES (Physics) ---
        const cols = STATE.grid.length;
        const rows = (STATE.grid[0] && STATE.grid[0].length) || 0;

        for (let i = STATE.flyingParticles.length - 1; i >= 0; i--) {
            let p = STATE.flyingParticles[i];

            if (p.isVortexed) {
                // Vortex suction
                p.dist -= p.speed;
                p.speed += 0.5;
                p.angle += 0.3;
                p.x = p.targetX + Math.cos(p.angle) * p.dist;
                p.y = p.targetY + Math.sin(p.angle) * p.dist;
                if (p.dist < 5) STATE.flyingParticles.splice(i, 1);
            } else {
                // Normal ballistic physics
                p.x += p.vx; 
                p.y += p.vy; 
                p.vy += 0.3; 
                p.vx *= 0.99;
                
                if (p.x < 0 || p.x > CONFIG.BOARD_WIDTH) { 
                    p.vx *= -0.6; 
                    p.x = Math.max(0, Math.min(CONFIG.BOARD_WIDTH, p.x)); 
                }
                
                // [FIX] Hit Bottom Logic
                if (p.y > CONFIG.BOARD_HEIGHT - CONFIG.PARTICLE_SIZE) {
                    p.y = CONFIG.BOARD_HEIGHT - CONFIG.PARTICLE_SIZE;
                    this.reintegrateParticle(p);
                    STATE.flyingParticles.splice(i, 1);
                    continue;
                }

                // [FIX] Hit Grid Particles Logic (Logic còn thiếu ở bản trước)
                let c = Math.floor(p.x / CONFIG.PARTICLE_SIZE);
                let r = Math.floor(p.y / CONFIG.PARTICLE_SIZE);

                if (c >= 0 && c < cols && r >= 0 && r < rows && STATE.grid[c][r]) {
                    p.y = (r - 1) * CONFIG.PARTICLE_SIZE;
                    this.reintegrateParticle(p);
                    STATE.flyingParticles.splice(i, 1);
                }
            }
        }
    },

    reintegrateParticle(p) {
        STATE.particles.push({ 
            x: p.x, 
            y: p.y, 
            color: p.color, 
            baseColor: p.baseColor || p.color, 
            dead: false 
        });
        // Reset stability để physics chạy lại
        STATE.isStable = false;
        STATE.stabilityCounter = 0;
    },

    animateBg() {
        if (!this.bgCtx) return;
        this.bgCtx.clearRect(0, 0, this.width, this.height);
        
        this.sparkles.forEach(s => {
            s.alpha += s.alphaSpeed;
            if (s.alpha > 1 || s.alpha < 0.3) s.alphaSpeed *= -1;
            s.y += 0.3; if (s.y > this.height) s.y = -10;
            s.rotation += s.rotationSpeed;
            
            this.bgCtx.save();
            this.bgCtx.translate(s.x, s.y);
            this.bgCtx.rotate(s.rotation);
            this.bgCtx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
            this.bgCtx.fillStyle = s.color;
            this.bgCtx.beginPath();
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 2) * i;
                const x = Math.cos(angle) * s.size;
                const y = Math.sin(angle) * s.size;
                if (i === 0) this.bgCtx.moveTo(x, y); else this.bgCtx.lineTo(x, y);
            }
            this.bgCtx.closePath(); this.bgCtx.fill();
            this.bgCtx.restore();
        });
        
        this.bgCtx.globalAlpha = 1.0;
        requestAnimationFrame(() => this.animateBg());
    }
};