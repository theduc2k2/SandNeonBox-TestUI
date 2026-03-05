/**
 * /scripts/game/input.js
 * RESPONSIBILITY: Handle user interaction (Drag & Drop Logic).
 * FIX: Synced coordinate mapping with Renderer to fix input mismatch.
 * LOGIC: Kept exactly as original.
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { SoundManager } from '../audio/soundManager.js';
import { Dock } from './dock.js';
import { Items } from './items.js';
import { Renderer } from './renderer.js'; // [MỚI] Cần import để lấy thông số Scale/Offset
<<<<<<< HEAD
=======
import { sandPool } from './pools.js';
>>>>>>> Test

export const InputHandler = {
    canvas: null,
    rect: null,

    init(canvasElement) {
        this.canvas = canvasElement;
        
        // Cập nhật vị trí khung canvas
        this.updateMetrics();
        window.addEventListener('resize', () => this.updateMetrics());

        // Gán sự kiện (Mouse & Touch)
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        window.addEventListener('mouseup', (e) => this.onPointerUp(e));

        this.canvas.addEventListener('touchstart', (e) => this.onPointerDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onPointerMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this.onPointerUp(e));
    },

    updateMetrics() {
        if (!this.canvas) return;
        this.rect = this.canvas.getBoundingClientRect();
    },

    /**
     * [ĐÃ SỬA] Chuyển đổi tọa độ chuột sang tọa độ Game
     * Đồng bộ với Renderer để không bị lệch khi game scale/căn giữa
     */
    getNormalizedPos(e) {
        // 1. Lấy tọa độ Client (Màn hình)
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Cập nhật rect
        this.rect = this.canvas.getBoundingClientRect();

        // 2. Tính tọa độ Pixel thực tế trên Canvas (nhân với DPR)
        const dpr = Renderer.dpr || 1; 
        const rawX = (clientX - this.rect.left) * dpr;
        const rawY = (clientY - this.rect.top) * dpr;

        // 3. Áp dụng phép biến đổi ngược từ Renderer (Translate & Scale)
        // Renderer lưu thông số này vào `this.gameArea`
        // Nếu Renderer chưa init hoặc lỗi, fallback về mặc định
        const area = Renderer.gameArea || { x: 0, y: 0, scale: 1 };
        
        // Công thức: (Tọa độ thô - Offset) / Scale
        const gameX = (rawX - area.x) / area.scale;
        const gameY = (rawY - area.y) / area.scale;

        return { x: gameX, y: gameY };
    },

    // --- LOGIC TƯƠNG TÁC (GIỮ NGUYÊN) ---

    onPointerDown(e) {
        if (STATE.status !== 'PLAYING') return;
        
        // Khởi tạo lại Audio Context nếu cần (Browser Policy)
        SoundManager.init();

        const pos = this.getNormalizedPos(e);
        STATE.pointer.x = pos.x;
        STATE.pointer.y = pos.y;
        STATE.pointer.isDown = true;

        // Chỉ kiểm tra click nếu bấm ở phần dưới (Dock)
        if (pos.y > CONFIG.BOARD_HEIGHT) {
            
            // 1. Kiểm tra nút Mua Item (+)
            // Tọa độ tính toán khớp với Renderer
            // [LƯU Ý]: Bạn có thể cần tinh chỉnh số 150 này cho khớp với hình vẽ trong Renderer
            const itemsYStart = CONFIG.BOARD_HEIGHT + 150; 
            const itemWidth = CONFIG.BOARD_WIDTH / 3;
            const itemTypes = ['bomb', 'eraser', 'vortex'];

            for(let i=0; i<3; i++) {
                const cx = i * itemWidth + itemWidth / 2;
                const btnX = cx + 22; 
                const btnY = itemsYStart - 22; // Dựa trên vị trí vẽ
                const dist = Math.sqrt((pos.x - btnX)**2 + (pos.y - btnY)**2);
                
                if(dist < 25) { // Bán kính click nút +
                    if (window.buyItem) window.buyItem(itemTypes[i]);
                    return; // Đã bấm nút mua thì thôi drag
                }
            }

            // 2. Kiểm tra Kéo Gạch (Dock Pieces)
            // Vùng Dock Gạch: Ngay dưới Board
            if (pos.y < CONFIG.BOARD_HEIGHT + 120) { 
                const slotW = CONFIG.BOARD_WIDTH / 3;
                const idx = Math.floor(pos.x / slotW);
                
                if (idx >= 0 && idx < 3 && STATE.dockPieces[idx]) {
                    // BẮT ĐẦU KÉO GẠCH
                    STATE.draggingPiece = STATE.dockPieces[idx];
                    STATE.dockPieces[idx] = null; // Tạm thời xóa khỏi dock
                    
                    // Tính offset để ngón tay nằm giữa miếng gạch
                    STATE.dragOffset.x = STATE.draggingPiece.width / 2;
                    STATE.dragOffset.y = STATE.draggingPiece.height / 2;
                    
                    // Cập nhật vị trí ngay lập tức
                    STATE.draggingPiece.x = pos.x - STATE.dragOffset.x;
                    STATE.draggingPiece.y = pos.y - STATE.dragOffset.y;
                    
                    SoundManager.playClick();
                }
            } 
            // 3. Kiểm tra Kéo Item (Bomb, Eraser, Vortex)
            else {
                const itemW = CONFIG.BOARD_WIDTH / 3;
                
                // Logic check cột nào
                if (pos.x < itemW) {
                    if (STATE.inventory.bombs > 0) { 
                        STATE.draggingItem = 'BOMB'; 
                    }
                } else if (pos.x < itemW * 2) {
                    if (STATE.inventory.erasers > 0) { 
                        STATE.draggingItem = 'ERASER'; 
                    }
                } else {
                    if (STATE.inventory.vortex > 0) { 
                        STATE.draggingItem = 'VORTEX'; 
                    }
                }

                // Nếu bắt được item, set vị trí vẽ
                if (STATE.draggingItem) {
                    STATE.dragOffset.currentX = pos.x;
                    STATE.dragOffset.currentY = pos.y;
                    SoundManager.playClick();
                }
            }
        }
    },

    onPointerMove(e) {
        if (STATE.status !== 'PLAYING') return;
        
        // Chặn cuộn trang nếu đang kéo thả
        if (STATE.draggingPiece || STATE.draggingItem) {
             if(e.cancelable) e.preventDefault();
        }

        const pos = this.getNormalizedPos(e);
        STATE.pointer.x = pos.x;
        STATE.pointer.y = pos.y;

        // Cập nhật vị trí Gạch đang kéo
        if (STATE.draggingPiece) {
            STATE.draggingPiece.x = pos.x - STATE.dragOffset.x;
            STATE.draggingPiece.y = pos.y - STATE.dragOffset.y;
        }

        // Cập nhật vị trí Item đang kéo
        if (STATE.draggingItem) {
            STATE.dragOffset.currentX = pos.x;
            STATE.dragOffset.currentY = pos.y;
        }
    },

    onPointerUp(e) {
        STATE.pointer.isDown = false;
        const pos = this.getNormalizedPos(e);

        // --- XỬ LÝ THẢ GẠCH ---
        if (STATE.draggingPiece) {
            const piece = STATE.draggingPiece;
            
            // Snap vào lưới (làm tròn theo kích thước hạt)
            let snapX = Math.round(piece.x / CONFIG.PARTICLE_SIZE) * CONFIG.PARTICLE_SIZE;
            let snapY = Math.round(piece.y / CONFIG.PARTICLE_SIZE) * CONFIG.PARTICLE_SIZE;

            if (this.isValidPosition(piece, snapX, snapY)) {
                // HỢP LỆ: Thả gạch xuống
                SoundManager.playDrop();
                
                // Biến gạch thành cát (Push vào mảng particles)
                for (let p of piece.parts) {
<<<<<<< HEAD
                    STATE.particles.push({
                        x: snapX + p.dx,
                        y: snapY + p.dy,
                        color: p.color,
                        baseColor: p.baseColor,
                        dead: false
                    });
=======
                    const particle = sandPool.get();
                    particle.x = snapX + p.dx;
                    particle.y = snapY + p.dy;
                    particle.color = p.color;
                    particle.baseColor = p.baseColor;
                    particle.dead = false;
                    STATE.particles.push(particle);
>>>>>>> Test
                }

                // Reset bộ đếm ổn định để kích hoạt check match
                STATE.isStable = false;
                STATE.stabilityCounter = 0;

                // Check nếu hết gạch thì spawn mới
                if (STATE.dockPieces.every(p => p === null)) {
                    Dock.spawnPieces();
                }
            } else {
                // KHÔNG HỢP LỆ: Trả gạch về chỗ cũ
                this.returnPieceToDock(piece);
            }
            
            STATE.draggingPiece = null;
        }

        // --- XỬ LÝ THẢ ITEM ---
        if (STATE.draggingItem === 'BOMB') {
            if (pos.y < CONFIG.BOARD_HEIGHT) {
                Items.startBombPrime(pos.x, pos.y);
            }
            STATE.draggingItem = null;
        }

        if (STATE.draggingItem === 'ERASER') {
            if (pos.y < CONFIG.BOARD_HEIGHT) {
                // Lưu ý: Logic lấy hạt ở đây đơn giản, Items.useEraser sẽ xử lý kỹ hơn
                const p = this.getParticleAt(pos.x, pos.y);
                if (p) {
                    // Logic Use Eraser gọi sang Items
                    Items.useEraser(pos.x, pos.y, STATE.particles);
                }
            }
            STATE.draggingItem = null;
        }

        if (STATE.draggingItem === 'VORTEX') {
            if (pos.y < CONFIG.BOARD_HEIGHT) {
                 Items.activateVortex(pos.x, pos.y, null); 
            }
            STATE.draggingItem = null;
        }
    },

    // --- HELPER FUNCTIONS ---

    /**
     * Kiểm tra xem gạch có đặt được vào vị trí đó không
     * (Không ra ngoài biên, không đè lên cát cũ)
     */
    isValidPosition(piece, bx, by) {
        if (bx < 0 || bx + piece.width > CONFIG.BOARD_WIDTH) return false;
        if (by < 0 || by + piece.height > CONFIG.BOARD_HEIGHT) return false;

        // Check va chạm với Grid
        for (let p of piece.parts) {
            let px = bx + p.dx;
            let py = by + p.dy;
            
            let c = Math.floor(px / CONFIG.PARTICLE_SIZE);
            let r = Math.floor(py / CONFIG.PARTICLE_SIZE);

            // Kiểm tra bounds mảng grid
            if (c >= 0 && c < STATE.grid.length && r >= 0 && r < STATE.grid[0].length) {
                if (STATE.grid[c][r]) return false; // Đã có cát ở đây
            }
        }
        return true;
    },

    /**
     * Trả gạch về slot trống đầu tiên (khi thả sai)
     */
    returnPieceToDock(piece) {
        // Tìm slot trống
        let emptyIdx = STATE.dockPieces.findIndex(p => p === null);
        if (emptyIdx !== -1) {
            STATE.dockPieces[emptyIdx] = piece;
        } else {
            // Fallback (ít khi xảy ra)
             for (let i = 0; i < 3; i++) {
                 if (!STATE.dockPieces[i]) { STATE.dockPieces[i] = piece; break; }
             }
        }
    },

    /**
     * Tìm hạt cát tại vị trí x,y (Dùng cho Eraser)
     */
    getParticleAt(x, y) {
        // Loop ngược để lấy hạt trên cùng
        for (let i = STATE.particles.length - 1; i >= 0; i--) {
            let p = STATE.particles[i];
            if (x >= p.x && x < p.x + CONFIG.PARTICLE_SIZE &&
                y >= p.y && y < p.y + CONFIG.PARTICLE_SIZE) {
                return p;
            }
        }
        return null;
    }
<<<<<<< HEAD
};
=======
};
>>>>>>> Test
