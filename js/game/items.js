/**
 * /scripts/game/items.js
 * RESPONSIBILITY: Manage Items Logic (Bomb, Eraser, Vortex).
 * LOGIC: Ported 1:1 from test.html (Exact Vortex Physics & Freeze Logic)
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { SoundManager } from '../audio/soundManager.js';
import { EventBus } from '../core/eventBus.js';
import { sandPool, effectPool } from './pools.js';

class ItemsSystem {
    constructor() {
        this.accumulatedScore = 0; // Dùng cho Vortex tính điểm
    }

    init() {
        STATE.bombPriming = null;
        STATE.activeVortexes = [];
        this.accumulatedScore = 0;
        console.log("[Items] System Initialized");
    }

    update(particles, effectsSystem) {
        // --- 1. BOMB LOGIC ---
        if (STATE.bombPriming) {
            STATE.bombPriming.tick++;
            if (STATE.bombPriming.tick >= STATE.bombPriming.duration) {
                this.explodeBomb(STATE.bombPriming.x, STATE.bombPriming.y);
                STATE.bombPriming = null;
            }
        }

        // --- 2. VORTEX LOGIC ---
        this.updateVortexes();
    }

    // =================================================================
    // BOM (BOMB)
    // =================================================================

    startBombPrime(x, y) {
        if (STATE.inventory.bombs <= 0) return;
        
        STATE.inventory.bombs--;
        EventBus.emit('ui:updateItems'); 

        STATE.bombPriming = {
            x: x,
            y: y,
            tick: 0,
            duration: 40
        };
        
        SoundManager.playCharge();
        EventBus.emit('ui:shake', { intensity: 5 });
    }

    explodeBomb(bx, by) {
        SoundManager.playExplosion();
        // Đóng băng vật lý 45 frames khi nổ để tạo hiệu ứng slow-motion nhẹ như bản gốc
        STATE.physicsFrozenTimer = 45; 
        
        EventBus.emit('ui:shake', { intensity: 25 });

        // Visual Effects
        if (STATE.settings.vfx) {
            const shock = effectPool.get();
            shock.x = bx; shock.y = by;
            shock.size = 10; shock.maxSize = CONFIG.BLAST_RADIUS * 1.8;
            shock.color = 'rgba(255,255,255,0.9)'; shock.type = 'shockwave'; shock.life = 1.0;
            STATE.activeEffects.push(shock);

            const flash = effectPool.get();
            flash.x = bx; flash.y = by;
            flash.size = CONFIG.BOMB_RADIUS;
            flash.color = 'rgba(255, 255, 255, 1)'; flash.type = 'flash'; flash.life = 0.2;
            STATE.activeEffects.push(flash);
        }

        let destroyedCount = 0;

        for (let i = STATE.particles.length - 1; i >= 0; i--) {
            let p = STATE.particles[i];
            let dx = p.x - bx;
            let dy = p.y - by;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.BOMB_RADIUS) {
                destroyedCount++;
                if (STATE.settings.vfx) {
                    const fx = effectPool.get();
                    fx.x = p.x; fx.y = p.y;
                    const safeDist = dist || 1;
                    fx.vx = (dx / safeDist) * (Math.random() * 8 + 2);
                    fx.vy = (dy / safeDist) * (Math.random() * 8 + 2);
                    fx.color = p.color;
                    fx.life = 1.0 + Math.random() * 0.5;
                    fx.gravity = 0.4;
                    fx.friction = 0.99;
                    fx.type = '';
                    STATE.activeEffects.push(fx);
                }
                sandPool.release(p);
                const last = STATE.particles.length - 1;
                STATE.particles[i] = STATE.particles[last];
                STATE.particles.pop();
            } else if (dist < CONFIG.BLAST_RADIUS) { 
                let angle = Math.atan2(dy, dx);
                let force = (CONFIG.BLAST_RADIUS - dist) / CONFIG.BLAST_RADIUS * 15;
                STATE.flyingParticles.push({
                    x: p.x, y: p.y,
                    vx: Math.cos(angle) * force,
                    vy: Math.sin(angle) * force - 6,
                    color: p.color,
                    baseColor: p.baseColor
                });
                sandPool.release(p);
                const last = STATE.particles.length - 1;
                STATE.particles[i] = STATE.particles[last];
                STATE.particles.pop();
            }
        }
        STATE.isStable = false; 
        STATE.stabilityCounter = 0;

        if (destroyedCount > 0) {
            let points = destroyedCount * 5;
            this.awardPoints(points, bx, by, '#ff6b6b');
            if (destroyedCount > 50) {
                let bonus = Math.floor(destroyedCount / 50);
                STATE.addDiamonds(bonus);
                EventBus.emit('ui:showFloatingText', { text: '+' + bonus + ' 💎', x: bx, y: by - 30, color: '#00e5ff' });
            }
        }
    }

    // =================================================================
    // TẨY (ERASER)
    // =================================================================

    useEraser(x, y) {
        if (STATE.inventory.erasers <= 0) return;

        let targetParticle = null;
        for (let i = STATE.particles.length - 1; i >= 0; i--) {
            let p = STATE.particles[i];
            if (x >= p.x && x < p.x + CONFIG.PARTICLE_SIZE &&
                y >= p.y && y < p.y + CONFIG.PARTICLE_SIZE) {
                targetParticle = p;
                break;
            }
        }

        if (!targetParticle) return;

        STATE.inventory.erasers--;
        EventBus.emit('ui:updateItems');
        SoundManager.playMatch(5);

        const targetColor = targetParticle.baseColor;
        const targets = [];

        for (let p of STATE.particles) {
            if (p.baseColor === targetColor && !p.dead) {
                targets.push(p);
            }
        }

        if (targets.length === 0) return;

        targets.sort((a, b) => {
            let rowA = Math.floor(a.y / CONFIG.PARTICLE_SIZE);
            let rowB = Math.floor(b.y / CONFIG.PARTICLE_SIZE);
            if (rowA !== rowB) return rowA - rowB;
            return (rowA % 2 === 0) ? a.x - b.x : b.x - a.x;
        });

        let chunks = [];
        let chunkSize = 10;
        for (let i = 0; i < targets.length; i += chunkSize) {
            chunks.push(targets.slice(i, i + chunkSize));
        }

        STATE.clearingSequences.push({ 
            groups: chunks, 
            groupIndex: 0, 
            waitTick: 0, 
            waitDelay: 2 
        });

        let points = targets.length * 2;
        this.awardPoints(points, CONFIG.BOARD_WIDTH / 2, CONFIG.BOARD_HEIGHT / 3, targetColor);
        STATE.stabilityCounter = 0;
    }

    // =================================================================
    // HỐ ĐEN (VORTEX) - COPY TỪ LOGIC GỐC TEST.HTML
    // =================================================================

    activateVortex(x, y) {
        if (STATE.inventory.vortex <= 0) return;
        STATE.inventory.vortex--;
        EventBus.emit('ui:updateItems');

        SoundManager.playVortex();
        
        if (STATE.settings.vfx) {
            const shock = effectPool.get();
            shock.x = x; shock.y = y; shock.size = 5; shock.maxSize = 60;
            shock.color = 'rgba(157, 0, 255, 0.8)'; shock.type = 'shockwave'; shock.life = 1.0;
            STATE.activeEffects.push(shock);
        }

        // 1. Initial Kill (Xóa ngay lập tức tại tâm)
        let initialKillRadius = 45;
        let killCount = 0;

        for (let i = STATE.particles.length - 1; i >= 0; i--) {
            const p = STATE.particles[i];
            let dist = Math.sqrt((p.x - x)**2 + (p.y - y)**2);
            if (dist < initialKillRadius) {
                killCount++;
                // Clear grid slot
                let c = Math.floor(p.x / CONFIG.PARTICLE_SIZE);
                let r = Math.floor(p.y / CONFIG.PARTICLE_SIZE);
                if (STATE.grid[c] && STATE.grid[c][r]) STATE.grid[c][r] = null;

                sandPool.release(p);
                const last = STATE.particles.length - 1;
                STATE.particles[i] = STATE.particles[last];
                STATE.particles.pop();
            }
        }
        
        if (killCount > 0) {
            this.awardPoints(killCount * 5, x, y, '#9d00ff');
        }

        // 2. Thêm vào activeVortexes
        STATE.activeVortexes.push({
            x: x, y: y,
            currentRadius: 0,
            targetRadius: 40,
            state: 'growing',
            suckTimer: 240, // CONFIG.vortexDuration
            killRadius: 15,
            pullRadius: 150,
            suckedCount: 0,
            maxCapacity: 2000
        });
        this.accumulatedScore = 0;
    }

    updateVortexes() {
        if (STATE.activeVortexes.length === 0) return;

        // [QUAN TRỌNG TỪ FILE GỐC]
        // Đóng băng vật lý trọng lực thông thường để cát không rơi hỗn loạn khi đang bị hút
        STATE.physicsFrozenTimer = 2; 

        let survivors = [];
        
        for (let v of STATE.activeVortexes) {
            // GROWING
            if (v.state === 'growing') {
                v.currentRadius += 1.5;
                if (v.currentRadius >= v.targetRadius) {
                    v.currentRadius = v.targetRadius;
                    v.state = 'sucking';
                }
                survivors.push(v);
            } 
            // SUCKING
            else if (v.state === 'sucking') {
                v.suckTimer--;
                v.currentRadius = v.targetRadius + Math.sin(Date.now() / 100) * 5;
                
                if (STATE.settings.vfx && Math.random() < 0.2) EventBus.emit('ui:shake', { intensity: 2 });

                // --- LOGIC HÚT CÁT CHUẨN TEST.HTML ---
                
                // 1. Tìm danh sách hạt có thể hút (nằm trong pullRadius)
                let availableIndices = [];
                for (let i = 0; i < STATE.particles.length; i++) {
                    let p = STATE.particles[i];
                    if (!p.dead) {
                        let distSq = (p.x - v.x)**2 + (p.y - v.y)**2;
                        if (distSq < v.pullRadius * v.pullRadius) {
                            availableIndices.push(i);
                        }
                    }
                }

                // 2. Hút ngẫu nhiên (3 hạt/frame)
                let suckRate = 3;
                for (let k = 0; k < suckRate; k++) {
                    if (availableIndices.length === 0) break;
                    if (v.suckedCount >= v.maxCapacity) break;
                    
                    // Chọn ngẫu nhiên từ availableIndices
                    let randIndexInArray = Math.floor(Math.random() * availableIndices.length);
                    let idx = availableIndices[randIndexInArray];
                    
                    // Logic swap & pop để xóa phần tử khỏi mảng nhanh
                    availableIndices[randIndexInArray] = availableIndices[availableIndices.length - 1];
                    availableIndices.pop();
                    
                    let p = STATE.particles[idx];
                    
                    // Xóa khỏi Grid
                    let c = Math.floor(p.x / CONFIG.PARTICLE_SIZE);
                    let r = Math.floor(p.y / CONFIG.PARTICLE_SIZE);
                    if(STATE.grid[c] && STATE.grid[c][r]) STATE.grid[c][r] = null;

                    // Đánh dấu chết
                    p.dead = true; 
                    v.suckedCount++;
                    this.accumulatedScore += 2;
                    
                    // Biến thành FlyingParticle (bay vào tâm)
                    STATE.flyingParticles.push({
                        x: p.x, y: p.y,
                        color: p.color,
                        isVortexed: true, // Cờ quan trọng
                        targetX: v.x, targetY: v.y,
                        angle: Math.atan2(p.y - v.y, p.x - v.x),
                        dist: Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2),
                        speed: 4 + Math.random() * 6
                    });
                }

                if (v.suckTimer <= 0) {
                    v.state = 'shrinking';
                }
                survivors.push(v);
            }
            // SHRINKING
            else if (v.state === 'shrinking') {
                v.currentRadius -= 4;
                if (v.currentRadius <= 0) {
                    if (this.accumulatedScore > 0) {
                        this.awardPoints(this.accumulatedScore, v.x, v.y, '#9d00ff');
                        if (STATE.settings.vfx) {
                            const shock = effectPool.get();
                            shock.x = v.x; shock.y = v.y; shock.size = 10; shock.maxSize = 80;
                            shock.color = 'rgba(255, 255, 255, 0.6)'; shock.type = 'shockwave'; shock.life = 0.8;
                            STATE.activeEffects.push(shock);
                        }
                    }
                    STATE.physicsFrozenTimer = 60; // Dừng vật lý thêm 1 chút sau khi nổ xong
                } else {
                    survivors.push(v);
                }
            }
        }
        
        STATE.activeVortexes = survivors;
        
        // [QUAN TRỌNG] Lọc bỏ hạt chết NGAY LẬP TỨC để tránh Grid/Physics xử lý nhầm
        // Logic này trong test.html nằm ở cuối updatePhysics (phần vortex)
        for (let i = STATE.particles.length - 1; i >= 0; i--) {
            if (STATE.particles[i].dead) {
                sandPool.release(STATE.particles[i]);
                const last = STATE.particles.length - 1;
                STATE.particles[i] = STATE.particles[last];
                STATE.particles.pop();
            }
        }
    }

    awardPoints(points, x, y, color) {
        STATE.currentScore += points;
        EventBus.emit('ui:updateScore', { score: STATE.currentScore });
        EventBus.emit('ui:showFloatingText', { text: '+' + points, x, y, color });
    }
}

export const Items = new ItemsSystem();
