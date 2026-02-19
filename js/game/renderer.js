/**
 * /scripts/game/renderer.js
 * RESPONSIBILITY: Render gameplay elements ONLY.
 * THEME: SANDCRUSH (Fixed Height, Single Danger Line, Transparent BG)
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { EventBus } from '../core/eventBus.js';

export const Renderer = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,

    // [OPTIMIZATION] Offscreen Canvas & Pixel Data
    offscreenCanvas: null,
    offscreenCtx: null,
    imageData: null,
    colorCache: {}, // Cache chuyển đổi Hex -> [r,g,b]
    dangerLineCanvas: null, // [OPTIMIZATION] Pre-rendered Danger Line
    borderGlowCanvas: null, // [OPTIMIZATION] Pre-rendered Border Glow
    
    // Trạng thái màn hình chớp trắng (Flash)
    flashState: {
        active: false,
        color: '#fff',
        opacity: 0,
        startTime: 0,
        duration: 1500
    },

    // [MỚI] Trạng thái viền phát sáng (Glow)
    borderGlow: {
        active: false,
        color: '#FFF',
        alpha: 0
    },

    init(canvas) {
        this.canvas = canvas;
        // alpha: true để nhìn xuyên thấu xuống nền gỗ của Menu
        this.ctx = canvas.getContext('2d', { alpha: true }); 
        this.dpr = Math.max(window.devicePixelRatio || 2, 2);
        
        // [OPTIMIZATION] Init Offscreen Canvas
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = CONFIG.BOARD_WIDTH;
        this.offscreenCanvas.height = CONFIG.BOARD_HEIGHT;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        this.imageData = this.offscreenCtx.createImageData(CONFIG.BOARD_WIDTH, CONFIG.BOARD_HEIGHT);

        // [OPTIMIZATION] Pre-render Static Effects
        this.preRenderStaticEffects();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        setTimeout(() => this.resize(), 50);
        this.bindEvents();
    },

    preRenderStaticEffects() {
        // 1. Danger Line (Vạch đỏ + Glow)
        this.dangerLineCanvas = document.createElement('canvas');
        this.dangerLineCanvas.width = CONFIG.BOARD_WIDTH;
        this.dangerLineCanvas.height = 20; 
        const dCtx = this.dangerLineCanvas.getContext('2d');
        dCtx.beginPath();
        dCtx.moveTo(0, 10); 
        dCtx.lineTo(CONFIG.BOARD_WIDTH, 10);
        dCtx.strokeStyle = '#FF5757';
        dCtx.lineWidth = 2;
        dCtx.shadowColor = '#FF5757';
        dCtx.shadowBlur = 10;
        dCtx.stroke();

        // 2. Border Glow (Viền phát sáng - Vẽ màu trắng để dễ tái sử dụng hoặc mặc định vàng)
        this.borderGlowCanvas = document.createElement('canvas');
        const pad = 40; // Padding cho bóng đổ
        this.borderGlowCanvas.width = CONFIG.BOARD_WIDTH + pad;
        this.borderGlowCanvas.height = CONFIG.BOARD_HEIGHT + pad;
        const bCtx = this.borderGlowCanvas.getContext('2d');
        bCtx.translate(pad/2, pad/2);
        bCtx.shadowColor = '#FFD93D'; 
        bCtx.shadowBlur = 30; 
        bCtx.strokeStyle = '#FFD93D';
        bCtx.lineWidth = 6;
        bCtx.strokeRect(-3, -3, CONFIG.BOARD_WIDTH + 6, CONFIG.BOARD_HEIGHT + 6);
    },

    bindEvents() {
        // Sự kiện chớp màn hình (Flash)
        EventBus.on('ui:flash', (data) => {
            if (STATE.settings && !STATE.settings.vfx) return;
            this.flashState.active = true;
            this.flashState.color = data.color || '#fff';
            this.flashState.opacity = 1; 
            this.flashState.startTime = Date.now();
        });

        // [MỚI] Sự kiện phát sáng viền khi ăn điểm
        EventBus.on('visuals:border_glow', (data) => {
            if (STATE.settings && !STATE.settings.vfx) return;
            
            this.borderGlow.active = true;
            this.borderGlow.color = data.color || '#FFD93D'; // Mặc định màu vàng nếu không có
            this.borderGlow.alpha = 1.5; // Bắt đầu sáng mạnh (>1 để giữ độ sáng lâu hơn một chút)
        });
    },

    resize() {
        if (!this.canvas) return;

        const totalW = CONFIG.BOARD_WIDTH || 288;
        const totalH = (CONFIG.BOARD_HEIGHT || 480) + (CONFIG.DOCK_HEIGHT || 220);
        
        const container = this.canvas.parentElement;
        const w = container.clientWidth;
        const h = container.clientHeight;

        this.dpr = Math.max(window.devicePixelRatio || 2, 2);
        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';

        // --- TÍNH TOÁN SCALE & VỊ TRÍ ---
        const paddingPercent = 0.90; 
        const scaleX = (w * this.dpr) / totalW;
        const scaleY = (h * this.dpr) / totalH;
        
        const finalScale = Math.min(scaleX, scaleY) * paddingPercent;
        const offsetX = ((w * this.dpr) - (totalW * finalScale)) / 2;
        const offsetY = ((h * this.dpr) - (totalH * finalScale)) / 2;

        // Lưu thông số để InputHandler dùng
        this.gameArea = {
            x: offsetX,
            y: offsetY,
            scale: finalScale
        };

        // Áp dụng biến hình
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); 
        this.ctx.translate(offsetX, offsetY); 
        this.ctx.scale(finalScale, finalScale);
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        // 1. Xóa Canvas để lộ nền gỗ
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        // 2. Vẽ Hốc tối (Bàn chơi)
        this.drawRecessedBoard(ctx);
        
        // 3. Vẽ vạch đỏ (Danger Line)
        this.drawDangerLine(ctx);

        this.drawFlashLayer(ctx);

        // Highlight cục tẩy
        let highlightColor = null;
        if (STATE.draggingItem === 'ERASER') {
            const mx = STATE.dragOffset?.currentX || 0;
            const my = STATE.dragOffset?.currentY || 0;
            if (my < CONFIG.BOARD_HEIGHT) {
                for (let i = STATE.particles.length - 1; i >= 0; i--) {
                    const p = STATE.particles[i];
                    if (mx >= p.x && mx < p.x + CONFIG.PARTICLE_SIZE &&
                        my >= p.y && my < p.y + CONFIG.PARTICLE_SIZE) {
                        highlightColor = p.baseColor;
                        break;
                    }
                }
            }
        }

        // 4. Nội dung game
        this.drawParticles(ctx, highlightColor);
        this.drawVortexes(ctx);
        this.drawFlyingParticles(ctx);
        this.drawEffects(ctx);

        // 5. Dock & Items (Không nền)
        this.drawDockContent(ctx);

        // 6. Overlay kéo thả
        this.drawDragOverlay(ctx);
        
        // 7. Viền trang trí (Có hiệu ứng Glow mới)
        this.drawBoardBorder(ctx);
    },

    drawRecessedBoard(ctx) {
        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;

        // Nền tối (Dark Coffee)
        ctx.fillStyle = '#261C19'; 
        ctx.fillRect(0, 0, w, h);

        // Bóng đổ trong
        const gradTop = ctx.createLinearGradient(0, 0, 0, 25);
        gradTop.addColorStop(0, 'rgba(0,0,0,0.6)');
        gradTop.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, w, 25);

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, 8, h); 
        ctx.fillRect(w - 8, 0, 8, h);
    },

    drawDangerLine(ctx) {
        // [OPTIMIZATION] Vẽ ảnh tĩnh thay vì tính toán ShadowBlur
        if (this.dangerLineCanvas) {
            ctx.drawImage(this.dangerLineCanvas, 0, (CONFIG.DANGER_Y || 100) - 10);
        }
    },

    // [MODIFIED] Hàm vẽ viền có thêm logic Glow
    drawBoardBorder(ctx) {
        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;

        ctx.save(); 

        // --- HIỆU ỨNG GLOW MỚI ---
        if (this.borderGlow.active && this.borderGlow.alpha > 0.01) {
            // Giảm dần độ sáng (Fade out)
            this.borderGlow.alpha -= 0.03;

            // [OPTIMIZATION] Vẽ Canvas đệm với Global Alpha
            const intensity = Math.min(1, this.borderGlow.alpha);
            ctx.globalAlpha = intensity;
            if (this.borderGlowCanvas) ctx.drawImage(this.borderGlowCanvas, -20, -20);
            ctx.globalAlpha = 1.0;
        } else {
            this.borderGlow.active = false;
        }

        // Reset lại các thông số để vẽ viền gốc
        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 1.0; 

        // --- VẼ VIỀN GỖ GỐC (GIỮ NGUYÊN) ---
        // Viền dưới sáng
        ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();

        // Viền trên tối
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 3; ctx.stroke();
        
        // Viền bao quanh (Gỗ đậm)
        ctx.strokeStyle = '#5C4033'; 
        ctx.lineWidth = 4;
        ctx.strokeRect(-2, -2, w + 4, h + 4);

        ctx.restore();
    },

    drawFlashLayer(ctx) {
        if (!this.flashState.active) return;
        const elapsed = Date.now() - this.flashState.startTime;
        if (elapsed > this.flashState.duration) {
            this.flashState.active = false;
            return;
        }
        const currentOpacity = this.flashState.opacity * (1 - elapsed / this.flashState.duration);
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        ctx.fillStyle = this.flashState.color;
        ctx.globalAlpha = currentOpacity;
        ctx.fillRect(0, 0, CONFIG.BOARD_WIDTH, CONFIG.BOARD_HEIGHT);
        ctx.restore();
    },

    // [OPTIMIZATION] Helper: Chuyển Hex sang RGB và Cache lại
    hexToRgb(hex) {
        if (this.colorCache[hex]) return this.colorCache[hex];
        
        // Parse hex (VD: #FF0000)
        let c = hex.substring(1).split('');
        if(c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        c = '0x' + c.join('');
        
        const rgb = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
        this.colorCache[hex] = rgb;
        return rgb;
    },

    drawParticles(ctx, highlightColor) {
        // [OPTIMIZATION] Sử dụng ImageData thay vì fillRect
        const imgData = this.imageData;
        const data = imgData.data;
        
        // 1. Xóa buffer cũ (Set toàn bộ pixel về 0 - trong suốt)
        // Sử dụng Uint32Array để xóa nhanh gấp 4 lần
        new Uint32Array(data.buffer).fill(0);

        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;
        const pSize = CONFIG.PARTICLE_SIZE;
        const bomb = STATE.bombPriming;

        // Cache highlight color nếu có
        let highlightRGB = null;
        if (highlightColor) highlightRGB = [255, 255, 255]; // Màu trắng mờ

        for (let i = 0; i < STATE.particles.length; i++) {
            const p = STATE.particles[i];
            if (p.dead) continue;

            let x = Math.floor(p.x);
            let y = Math.floor(p.y);
            
            // Logic rung lắc khi bom sắp nổ (Giữ nguyên logic cũ nhưng áp dụng cho toạ độ)
            if (bomb) {
                const dx = p.x - bomb.x;
                const dy = p.y - bomb.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONFIG.BOMB_RADIUS * 1.2) {
                    const progress = bomb.tick / bomb.duration;
                    x += Math.floor((Math.random() - 0.5) * 4 * progress);
                    y += Math.floor((Math.random() - 0.5) * 4 * progress);
                }
            }

            // Lấy màu RGB từ Cache
            let [r, g, b] = this.hexToRgb(p.color);

            // Xử lý Highlight (Eraser)
            if (highlightColor && p.baseColor === highlightColor) {
                // Blend màu trắng (đơn giản hóa bằng cách tăng sáng)
                r = Math.min(255, r + 100);
                g = Math.min(255, g + 100);
                b = Math.min(255, b + 100);
            }

            // Vẽ từng pixel của hạt cát vào buffer
            // Loop này xử lý kích thước hạt (ví dụ 4x4 hoặc 5x5)
            for (let py = 0; py < pSize; py++) {
                if (y + py >= h) break; // Check biên dưới
                for (let px = 0; px < pSize; px++) {
                    if (x + px >= w) break; // Check biên phải
                    
                    // Tính index trong mảng 1 chiều: (y * width + x) * 4 kênh màu
                    const idx = ((y + py) * w + (x + px)) * 4;
                    
                    data[idx] = r;     // Red
                    data[idx + 1] = g; // Green
                    data[idx + 2] = b; // Blue
                    data[idx + 3] = 255; // Alpha (Full opacity)
                }
            }
        }

        // 2. Đẩy dữ liệu pixel lên Offscreen Canvas
        this.offscreenCtx.putImageData(imgData, 0, 0);

        // 3. Vẽ Offscreen Canvas lên Main Canvas
        // Vì Main Canvas đã được scale/translate ở hàm draw(), ta vẽ tại (0,0)
        ctx.drawImage(this.offscreenCanvas, 0, 0);
    },

    drawFlyingParticles(ctx) {
        const pSize = CONFIG.PARTICLE_SIZE;
        for (let i = 0; i < STATE.flyingParticles.length; i++) {
            const p = STATE.flyingParticles[i];
            if (p.isVortexed) {
                ctx.fillStyle = '#9d00ff';
                let scale = Math.min(1, Math.max(0, p.dist / 100)); 
                let drawSize = pSize * scale;
                let offset = (pSize - drawSize) / 2;
                ctx.fillRect(p.x + offset, p.y + offset, drawSize, drawSize);
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, pSize, pSize);
            }
        }
    },

    drawVortexes(ctx) {
        for (const v of STATE.activeVortexes) {
            const radius = v.currentRadius;
            const gradient = ctx.createRadialGradient(v.x, v.y, 10, v.x, v.y, CONFIG.BOARD_WIDTH);
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.5, 'rgba(157, 0, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = gradient;
            ctx.beginPath(); ctx.arc(v.x, v.y, CONFIG.BOARD_WIDTH, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(v.x, v.y, radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#9d00ff'; ctx.lineWidth = 2; ctx.stroke();
        }
    },

    drawEffects(ctx) {
        for (let i = STATE.activeEffects.length - 1; i >= 0; i--) {
            let e = STATE.activeEffects[i];
            if (e.type === 'shockwave') {
                ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${e.life})`; ctx.lineWidth = 3; ctx.stroke();
            } else if (e.type === 'flash') {
                ctx.fillStyle = e.color; ctx.globalAlpha = e.life;
                ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1.0;
            } else {
                let size = CONFIG.PARTICLE_SIZE * (0.5 + e.life);
                ctx.globalAlpha = e.life; ctx.fillStyle = e.color;
                ctx.fillRect(e.x, e.y, size, size); ctx.globalAlpha = 1.0;
            }
        }
    },

    drawDockContent(ctx) {
        const boardH = CONFIG.BOARD_HEIGHT || 480;
        const boardW = CONFIG.BOARD_WIDTH || 288;

        // Bóng đổ của Board xuống nền gỗ
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, boardH - 5, boardW, 5); 
        ctx.restore();

        this.drawDockPieces(ctx, boardH, boardW);
        this.drawItems(ctx, boardH + 150, boardW);
    },

    drawDockPieces(ctx, boardH, boardW) {
        const slotW = boardW / 3;
        const piecesYStart = boardH + 20;
        const piecesHeight = 90;
        const yCenter = piecesYStart + piecesHeight / 2;

        for (let i = 0; i < 3; i++) {
            const cx = i * slotW + slotW / 2;
            const slotBoxX = cx - slotW / 2 + 8;
            const slotBoxY = piecesYStart;
            const slotBoxW = slotW - 16;
            const slotBoxH = piecesHeight;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
            this.roundRect(ctx, slotBoxX, slotBoxY, slotBoxW, slotBoxH, 12);
            ctx.fill();

            ctx.save(); ctx.clip();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; ctx.lineWidth = 3; ctx.stroke();
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1; ctx.stroke();

            if (STATE.dockPieces && STATE.dockPieces[i]) {
                const piece = STATE.dockPieces[i];
                const scale = 0.8;
                const px = cx - (piece.width * scale) / 2;
                const py = yCenter - (piece.height * scale) / 2;
                this.drawPieceShape(ctx, piece, px, py, scale);
            }
        }
    },

    drawItems(ctx, y, boardW) {
        const slotW = boardW / 3;
        const icons = ['💣', '💧', '🌀'];
        const counts = [
            STATE.inventory?.bombs || 0,
            STATE.inventory?.erasers || 0,
            STATE.inventory?.vortex || 0
        ];
        const colors = ['#ff4d00', '#00f3ff', '#9d00ff'];

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        for(let i=0; i<3; i++) {
            const cx = i * slotW + slotW/2;
            
            ctx.fillStyle = '#5C4033'; 
            this.roundRect(ctx, cx - 30, y - 30, 60, 60, 10);
            ctx.fill();
            
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 30, y + 30); ctx.lineTo(cx + 30, y + 30); ctx.lineTo(cx + 30, y - 30);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(cx - 30, y + 30); ctx.lineTo(cx - 30, y - 30); ctx.lineTo(cx + 30, y - 30);
            ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();

            ctx.font = '28px Arial'; ctx.fillStyle = colors[i]; ctx.fillText(icons[i], cx, y - 8);
            ctx.font = 'bold 12px Fredoka, sans-serif'; ctx.fillStyle = '#FFF'; ctx.fillText(counts[i] > 99 ? '99+' : counts[i], cx, y + 18);
            
            const btnX = cx + 22; const btnY = y - 22;
            ctx.fillStyle = '#D966C7'; ctx.beginPath(); ctx.arc(btnX, btnY, 9, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFF'; ctx.font = 'bold 12px Arial'; ctx.fillText('+', btnX, btnY + 1);
        }
    },

    drawDragOverlay(ctx) {
        if (STATE.draggingPiece) {
            const piece = STATE.draggingPiece;
            this.drawPieceShape(ctx, piece, piece.x, piece.y - 60, 1.1);
        }
        if (STATE.draggingItem) {
             const x = STATE.dragOffset?.currentX || 0;
             const y = STATE.dragOffset?.currentY || 0;
             const type = STATE.draggingItem;
             
             if (type === 'BOMB') {
                 ctx.fillStyle = 'rgba(255, 107, 107, 0.3)'; ctx.beginPath(); ctx.arc(x, y, CONFIG.BOMB_RADIUS, 0, Math.PI*2); ctx.fill();
                 ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(x, y, CONFIG.BLAST_RADIUS, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
             } 
             else if (type === 'VORTEX') {
                 ctx.fillStyle = 'rgba(157, 0, 255, 0.3)'; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI*2); ctx.fill();
             } 
             else if (type === 'ERASER') {
                 ctx.fillStyle = 'rgba(0, 243, 255, 0.3)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
             }
             ctx.font = '30px Arial'; ctx.fillStyle = '#FFF'; ctx.textAlign='center'; ctx.textBaseline='middle';
             ctx.fillText(type === 'BOMB' ? '💣' : (type === 'ERASER' ? '💧' : '🌀'), x, y);
        }
    },

    drawPieceShape(ctx, piece, ox, oy, scale = 1) {
        const pSize = CONFIG.PARTICLE_SIZE;
        const size = pSize * scale;
        if (!piece.parts) return;
        for (const p of piece.parts) {
            ctx.fillStyle = p.color;
            ctx.fillRect(ox + p.dx * scale, oy + p.dy * scale, size, size);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(ox + p.dx * scale, oy + p.dy * scale, size, size * 0.2);
        }
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath(); 
        ctx.moveTo(x + radius, y); 
        ctx.lineTo(x + width - radius, y); 
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius); 
        ctx.lineTo(x + width, y + height - radius); 
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); 
        ctx.lineTo(x + radius, y + height); 
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius); 
        ctx.lineTo(x, y + radius); 
        ctx.quadraticCurveTo(x, y, x + radius, y); 
        ctx.closePath();
    }
};