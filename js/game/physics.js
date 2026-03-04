/**
 * /scripts/game/physics.js
 * RESPONSIBILITY: Handle sand movement (Gravity), Collision, Game Over.
 * LOGIC: Ported 1:1 from test.html (Fixed Freeze Logic & Added Flash Effect)
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { SoundManager } from '../audio/soundManager.js';
import { EventBus, EVENTS } from '../core/eventBus.js';
import { sandPool, effectPool } from './pools.js';

// [OPTIMIZATION] Random Lookup Table (Tránh gọi Math.random quá nhiều)
const RANDOM_LUT = new Float32Array(4096);
for(let i=0; i<4096; i++) RANDOM_LUT[i] = Math.random();
let lutIdx = 0;
const fastRand = () => RANDOM_LUT[lutIdx++ & 4095];

export const Physics = {
    /**
     * Main Physics Loop
     */
    update() {
        // 1. Luôn cập nhật trạng thái xóa hàng (Eraser animation)
        this.updateClearingSequences();

        // 2. Luôn cập nhật hạt bay (Flying Particles - Bom nổ, Vortex hút)
        // Hạt bay KHÔNG BỊ ẢNH HƯỞNG bởi đóng băng trọng lực
        this.updateFlyingParticles();

        // [LOGIC GỐC] Kiểm tra điều kiện dừng trọng lực
        // Nếu đang xóa hàng HOẶC đang bị đóng băng bởi Bom/Vortex
        if (STATE.clearingSequences.length > 0 || (STATE.physicsFrozenTimer && STATE.physicsFrozenTimer > 0)) {
            if (STATE.physicsFrozenTimer > 0) {
                STATE.physicsFrozenTimer--;
            }
            // RETURN SỚM: Bỏ qua phần tính toán rơi cát (Gravity) bên dưới
            return;
        }

        // 3. Logic Cát Rơi (Chỉ chạy khi không bị đóng băng)
        const iterations = CONFIG.SAND_UPDATES_PER_FRAME || 1;
        for (let i = 0; i < iterations; i++) {
            this.updateSandParticles();
        }
    },

    updateSandParticles() {
        const cols = STATE.grid.length;
        const rows = STATE.grid[0].length;
        const pSize = CONFIG.PARTICLE_SIZE;
        let anyMoved = false;
        
        // [OPTIMIZATION] Theo dõi độ cao hạt cát để check Game Over
        let minY = CONFIG.BOARD_HEIGHT;

        // 1. [SYNC] Reset Grid & Rebuild
        // Cần thiết để đồng bộ hạt từ STATE.particles (Input/Dock) vào STATE.grid
        for (let c = 0; c < cols; c++) {
            if (STATE.grid[c]) STATE.grid[c].fill(null);
        }

        let activeCount = 0;
        for (let i = 0; i < STATE.particles.length; i++) {
            let p = STATE.particles[i];
            if (p.dead) {
                sandPool.release(p);
                continue;
            }

            let c = Math.floor(p.x / pSize);
            let r = Math.floor(p.y / pSize);
            if (c < 0) c = 0; if (c >= cols) c = cols - 1;
            if (r < 0) r = 0; if (r >= rows) r = rows - 1;
            
            p.x = c * pSize;
            p.y = r * pSize;

            STATE.grid[c][r] = p;
            STATE.particles[activeCount++] = p;
            
            if (p.y < minY) minY = p.y;
        }
        STATE.particles.length = activeCount;

        // 2. [PHYSICS] Loop Tối ưu (Bottom-Up + Anti-Bias + Probability)
        const isEvenFrame = (STATE.frameCount || 0) % 2 === 0;

        // Duyệt từ hàng gần cuối ngược lên trên
        for (let r = rows - 2; r >= 0; r--) {
            
            // Kỹ thuật Anti-Bias: Đảo chiều quét mỗi frame
            const startC = isEvenFrame ? 0 : cols - 1;
            const endC = isEvenFrame ? cols : -1;
            const stepC = isEvenFrame ? 1 : -1;

            for (let c = startC; c !== endC; c += stepC) {
                let p = STATE.grid[c][r];
                if (!p || p.dead) continue;

                // 1. Kiểm tra RƠI THẲNG (Down)
                if (!STATE.grid[c][r + 1]) {
                    this.moveParticleInGrid(p, c, r, c, r + 1);
                    anyMoved = true;
                } 
                // 2. Kiểm tra TRƯỢT (Slide) - Có ma sát (Probability)
                else {
                    let leftEmpty = (c > 0 && !STATE.grid[c - 1][r + 1]);
                    let rightEmpty = (c < cols - 1 && !STATE.grid[c + 1][r + 1]);

                    if (leftEmpty && rightEmpty) {
                        // Cả 2 bên đều trống: Random 50/50
                        if (Math.random() < 0.5) {
                            this.moveParticleInGrid(p, c, r, c - 1, r + 1);
                        } else {
                            this.moveParticleInGrid(p, c, r, c + 1, r + 1);
                        }
                        anyMoved = true;
                    } else if (leftEmpty && Math.random() < 0.9) { 
                        // Chỉ bên trái trống + 90% cơ hội trượt (tạo độ ma sát)
                        this.moveParticleInGrid(p, c, r, c - 1, r + 1);
                        anyMoved = true;
                    } else if (rightEmpty && Math.random() < 0.9) {
                        // Chỉ bên phải trống + 90% cơ hội trượt
                        this.moveParticleInGrid(p, c, r, c + 1, r + 1);
                        anyMoved = true;
                    }
                }
            }
        }

        // Logic Ổn định & Check Match
        if (!anyMoved && STATE.flyingParticles.length === 0) {
            STATE.stabilityCounter++;
        } else {
            STATE.stabilityCounter = 0;
        }

        if (STATE.stabilityCounter > 15) {
            this.checkMatches();
        }

        // [OPTIMIZATION] Check Game Over ngay tại đây (Không cần quét lại Grid)
        if (STATE.stabilityCounter > 60) {
            const dangerY = CONFIG.DANGER_Y || 100;
            if (minY <= dangerY) {
                STATE.gameOverCounter++;
                if (STATE.gameOverCounter > 120) {
                    EventBus.emit(EVENTS.GAME_OVER);
                }
            } else {
                STATE.gameOverCounter = 0;
            }
        }
    },

    // Hàm phụ trợ giúp di chuyển hạt trong Grid an toàn
    moveParticleInGrid(p, oldC, oldR, newC, newR) {
        // 1. Cập nhật dữ liệu Grid
        STATE.grid[newC][newR] = p; // Chuyển hạt sang ô mới
        STATE.grid[oldC][oldR] = null; // Xóa hạt ở ô cũ

        // 2. Cập nhật tọa độ hạt (để Renderer vẽ đúng vị trí)
        p.x = newC * CONFIG.PARTICLE_SIZE;
        p.y = newR * CONFIG.PARTICLE_SIZE;
    },

    updateFlyingParticles() {
        const boardW = CONFIG.BOARD_WIDTH;
        const boardH = CONFIG.BOARD_HEIGHT;
        const pSize = CONFIG.PARTICLE_SIZE;
        const cols = STATE.grid.length;
        const rows = STATE.grid[0].length;

        for (let i = STATE.flyingParticles.length - 1; i >= 0; i--) {
            let p = STATE.flyingParticles[i];

            if (p.isVortexed) {
                p.dist -= p.speed;
                p.speed += 0.5;
                p.angle += 0.3;
                p.x = p.targetX + Math.cos(p.angle) * p.dist;
                p.y = p.targetY + Math.sin(p.angle) * p.dist;
                if (p.dist < 5) STATE.flyingParticles.splice(i, 1);
                continue;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.vx *= 0.99;

            if (p.x < 0 || p.x > boardW) {
                p.vx *= -0.6;
                p.x = Math.max(0, Math.min(boardW, p.x));
            }

            if (p.y > boardH - pSize) {
                p.y = boardH - pSize;
                this.reintegrateParticle(p);
                STATE.flyingParticles.splice(i, 1);
                continue;
            }

            let c = Math.floor(p.x / pSize);
            let r = Math.floor(p.y / pSize);
            if (c >= 0 && c < cols && r >= 0 && r < rows && STATE.grid[c][r]) {
                p.y = (r - 1) * pSize;
                this.reintegrateParticle(p);
                STATE.flyingParticles.splice(i, 1);
            }
        }
    },

    reintegrateParticle(p) {
        const particle = sandPool.get();
        particle.x = p.x;
        particle.y = p.y;
        particle.color = p.color;
        particle.baseColor = p.baseColor || p.color;
        particle.dead = false;
        STATE.particles.push(particle);
        STATE.isStable = false;
        STATE.stabilityCounter = 0;
    },

    updateClearingSequences() {
        for (let i = STATE.clearingSequences.length - 1; i >= 0; i--) {
            let seq = STATE.clearingSequences[i];

            if (seq.waitTick < seq.waitDelay) {
                seq.waitTick++;
                continue;
            }

            let group = seq.groups[seq.groupIndex];
            if (group) {
                for (let p of group) {
                    p.dead = true;
                    const fx = effectPool.get();
                    fx.x = p.x; fx.y = p.y;
                    fx.vx = (fastRand() - 0.5) * 2;
                    fx.vy = -(fastRand() * 2 + 1);
                    fx.color = p.color;
                    fx.life = 1.0;
                    fx.friction = 0.96;
                    fx.gravity = 0.05;
                    fx.type = '';
                    STATE.activeEffects.push(fx);
                }
                seq.groupIndex++;
            } else {
                STATE.clearingSequences.splice(i, 1);
                STATE.physicsFrozenTimer = 5;
            }
        }
    },

    checkMatches() {
        const cols = STATE.grid.length;
        const rows = STATE.grid[0].length;
        let matchedParticles = new Set();
        let visited = new Uint8Array(cols * rows);

        for (let r = 0; r < rows; r++) {
            let startP = STATE.grid[0][r];
            if (startP && !matchedParticles.has(startP)) {
                let baseColorToMatch = startP.baseColor;
                let queue = [{ c: 0, r: r }];
                let currentCluster = [];
                let reachedRightWall = false;

                let startIdx = r * cols + 0;
                visited[startIdx] = 1;
                let head = 0;

                while (head < queue.length) {
                    let { c, r } = queue[head++];
                    let p = STATE.grid[c][r];
                    currentCluster.push(p);

                    if (c === cols - 1) reachedRightWall = true;

                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
                    for (let d of dirs) {
                        let nc = c + d[0];
                        let nr = r + d[1];
                        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
                            let idx = nr * cols + nc;
                            if (visited[idx] === 0) {
                                let neighbor = STATE.grid[nc][nr];
                                if (neighbor && neighbor.baseColor === baseColorToMatch) {
                                    visited[idx] = 1;
                                    queue.push({ c: nc, r: nr });
                                }
                            }
                        }
                    }
                }

                if (reachedRightWall) {
                    for (let p of currentCluster) matchedParticles.add(p);
                }
            }
        }

        if (matchedParticles.size > 0) {
            this.processClear(Array.from(matchedParticles));
        } else {
            if (STATE.currentCombo > STATE.maxCombo) STATE.maxCombo = STATE.currentCombo;
            STATE.currentCombo = 0;

            // [MỚI] Bắn sự kiện bảo UI tắt chữ Combo đi
            EventBus.emit('ui:hideCombo');
        }
    },

    processClear(particlesToClear) {
        STATE.currentCombo++;
        SoundManager.playMatch(STATE.currentCombo);

        let points = particlesToClear.length * 10 * STATE.currentCombo;
        STATE.currentScore += points;

        // Capture the color of the first particle being cleared
        const clearColor = particlesToClear.length > 0 ? particlesToClear[0].color : '#FFD93D';

        EventBus.emit(EVENTS.SCORE_UPDATED, {
            score: STATE.currentScore,
            combo: STATE.currentCombo,
            points: points,
            color: clearColor
        });

        // [MỚI THÊM] Phát sự kiện Flash màn hình theo màu (Logic giống test.html)
        if (particlesToClear.length > 0) {
            const flashColor = particlesToClear[0].color;
            EventBus.emit('ui:flash', { color: flashColor });
        }

        // Logic Kim cương
        let earnedDiamonds = Math.ceil(STATE.currentCombo * 1.5);
        STATE.addDiamonds(earnedDiamonds);
        STATE.runDiamonds += earnedDiamonds;
        EventBus.emit('ui:updateDiamonds', { diamonds: STATE.diamonds });

        // Logic Chữ bay
        let sumX = 0, sumY = 0;
        particlesToClear.forEach(p => { sumX += p.x; sumY += p.y; });
        EventBus.emit('ui:showFloatingText', {
            text: "+" + points,
            x: sumX / particlesToClear.length,
            y: sumY / particlesToClear.length,
            color: '#fff'
        });

        // Logic Rung
        if (STATE.currentCombo >= 2) EventBus.emit('ui:shake', { intensity: 5 });
        if (STATE.currentCombo >= 3) {
            EventBus.emit('ui:shake', { intensity: 10 });
            EventBus.emit('ui:showFloatingText', {
                text: "+" + earnedDiamonds + ' 💎',
                x: CONFIG.BOARD_WIDTH / 2,
                y: CONFIG.BOARD_HEIGHT / 2 - 50,
                color: '#00e5ff'
            });
        }

        // Logic Xóa dần (Snake)
        let groups = {};
        particlesToClear.forEach(p => {
            let xKey = Math.floor(p.x);
            if (!groups[xKey]) groups[xKey] = [];
            groups[xKey].push(p);
        });

        let sortedKeys = Object.keys(groups).sort((a, b) => parseFloat(a) - parseFloat(b));
        STATE.clearingSequences.push({
            groups: sortedKeys.map(k => groups[k]),
            groupIndex: 0,
            waitTick: 0,
            waitDelay: 2
        });

        STATE.stabilityCounter = 0;
    }
};
