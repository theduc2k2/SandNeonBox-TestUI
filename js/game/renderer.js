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
    colorCache: {}, // Cache chuyá»ƒn Ä‘á»•i Hex -> [r,g,b]
    dangerLineCanvas: null, // [OPTIMIZATION] Pre-rendered Danger Line
    borderGlowCanvas: null, // [OPTIMIZATION] Pre-rendered Border Glow
    
    // Tráº¡ng thÃ¡i mÃ n hÃ¬nh chá»›p tráº¯ng (Flash)
    flashState: {
        active: false,
        color: '#fff',
        opacity: 0,
        startTime: 0,
        duration: 1500
    },

    // [Má»šI] Tráº¡ng thÃ¡i viá»n phÃ¡t sÃ¡ng (Glow)
    borderGlow: {
        active: false,
        color: '#FFF',
        alpha: 0
    },

    // Preloaded item icon images (bomb/eraser/vortex)
    itemIcons: {},

    init(canvas) {
        this.canvas = canvas;
        // alpha: true Ä‘á»ƒ nhÃ¬n xuyÃªn tháº¥u xuá»‘ng ná»n gá»— cá»§a Menu
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

        // Preload UI item icons from /Asset
        this.loadItemIcons();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        setTimeout(() => this.resize(), 50);
        this.bindEvents();
    },

    preRenderStaticEffects() {
        // 1. Danger Line (Váº¡ch Ä‘á» + Glow)
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

        // 2. Border Glow (Viá»n phÃ¡t sÃ¡ng - Váº½ mÃ u tráº¯ng Ä‘á»ƒ dá»… tÃ¡i sá»­ dá»¥ng hoáº·c máº·c Ä‘á»‹nh vÃ ng)
        this.borderGlowCanvas = document.createElement('canvas');
        const pad = 40; // Padding cho bÃ³ng Ä‘á»•
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

    loadItemIcons() {
        const makeImg = (src) => {
            const img = new Image();
            img.src = src;
            return img;
        };

        this.itemIcons = {
            bomb: makeImg('Asset/IconGame/Bom/Bomp.png'),
            vortex: makeImg('Asset/IconGame/Votex/Votex.png'),
            // If eraser image is absent, we will fall back to emoji rendering
            eraser: makeImg('Asset/IconGame/Eraser/Eraser.png')
        };
    },

    bindEvents() {
        // Sá»± kiá»‡n chá»›p mÃ n hÃ¬nh (Flash)
        EventBus.on('ui:flash', (data) => {
            if (STATE.settings && !STATE.settings.vfx) return;
            this.flashState.active = true;
            this.flashState.color = data.color || '#fff';
            this.flashState.opacity = 1; 
            this.flashState.startTime = Date.now();
        });

        // [Má»šI] Sá»± kiá»‡n phÃ¡t sÃ¡ng viá»n khi Äƒn Ä‘iá»ƒm
        EventBus.on('visuals:border_glow', (data) => {
            if (STATE.settings && !STATE.settings.vfx) return;
            
            this.borderGlow.active = true;
            this.borderGlow.color = data.color || '#FFD93D'; // Máº·c Ä‘á»‹nh mÃ u vÃ ng náº¿u khÃ´ng cÃ³
            this.borderGlow.alpha = 1.5; // Báº¯t Ä‘áº§u sÃ¡ng máº¡nh (>1 Ä‘á»ƒ giá»¯ Ä‘á»™ sÃ¡ng lÃ¢u hÆ¡n má»™t chÃºt)
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

        // --- TÃNH TOÃN SCALE & Vá»Š TRÃ ---
        const paddingPercent = 0.90; 
        const scaleX = (w * this.dpr) / totalW;
        const scaleY = (h * this.dpr) / totalH;
        
        const finalScale = Math.min(scaleX, scaleY) * paddingPercent;
        const offsetX = ((w * this.dpr) - (totalW * finalScale)) / 2;
        const offsetY = ((h * this.dpr) - (totalH * finalScale)) / 2;

        // LÆ°u thÃ´ng sá»‘ Ä‘á»ƒ InputHandler dÃ¹ng
        this.gameArea = {
            x: offsetX,
            y: offsetY,
            scale: finalScale
        };

        // Ãp dá»¥ng biáº¿n hÃ¬nh
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); 
        this.ctx.translate(offsetX, offsetY); 
        this.ctx.scale(finalScale, finalScale);
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;

        // 1. XÃ³a Canvas Ä‘á»ƒ lá»™ ná»n gá»—
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        // 2. Váº½ Há»‘c tá»‘i (BÃ n chÆ¡i)
        this.drawRecessedBoard(ctx);
        
        // 3. Váº½ váº¡ch Ä‘á» (Danger Line)
        this.drawDangerLine(ctx);

        this.drawFlashLayer(ctx);

        // Highlight cá»¥c táº©y
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

        // 4. Ná»™i dung game
        this.drawParticles(ctx, highlightColor);
        this.drawVortexes(ctx);
        this.drawFlyingParticles(ctx);
        this.drawEffects(ctx);

        // 5. Dock & Items (KhÃ´ng ná»n)
        this.drawDockContent(ctx);

        // 6. Overlay kÃ©o tháº£
        this.drawDragOverlay(ctx);
        
        // 7. Viá»n trang trÃ­ (CÃ³ hiá»‡u á»©ng Glow má»›i)
        this.drawBoardBorder(ctx);
    },

    drawRecessedBoard(ctx) {
        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;

        // Ná»n tá»‘i (Dark Coffee)
        ctx.fillStyle = '#261C19'; 
        ctx.fillRect(0, 0, w, h);

        // BÃ³ng Ä‘á»• trong
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
        // [OPTIMIZATION] Váº½ áº£nh tÄ©nh thay vÃ¬ tÃ­nh toÃ¡n ShadowBlur
        if (this.dangerLineCanvas) {
            ctx.drawImage(this.dangerLineCanvas, 0, (CONFIG.DANGER_Y || 100) - 10);
        }
    },

    // [MODIFIED] HÃ m váº½ viá»n cÃ³ thÃªm logic Glow
    drawBoardBorder(ctx) {
        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;

        ctx.save(); 

        // --- HIá»†U á»¨NG GLOW Má»šI ---
        if (this.borderGlow.active && this.borderGlow.alpha > 0.01) {
            // Giáº£m dáº§n Ä‘á»™ sÃ¡ng (Fade out)
            this.borderGlow.alpha -= 0.03;

            // [OPTIMIZATION] Váº½ Canvas Ä‘á»‡m vá»›i Global Alpha
            const intensity = Math.min(1, this.borderGlow.alpha);
            ctx.globalAlpha = intensity;
            if (this.borderGlowCanvas) ctx.drawImage(this.borderGlowCanvas, -20, -20);
            ctx.globalAlpha = 1.0;
        } else {
            this.borderGlow.active = false;
        }

        // Reset láº¡i cÃ¡c thÃ´ng sá»‘ Ä‘á»ƒ váº½ viá»n gá»‘c
        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 1.0; 

        // --- Váº¼ VIá»€N Gá»– Gá»C (GIá»® NGUYÃŠN) ---
        // Viá»n dÆ°á»›i sÃ¡ng
        ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 2; ctx.stroke();

        // Viá»n trÃªn tá»‘i
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'; ctx.lineWidth = 3; ctx.stroke();
        
        // Viá»n bao quanh (Gá»— Ä‘áº­m)
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

    // [OPTIMIZATION] Helper: Chuyá»ƒn Hex sang RGB vÃ  Cache láº¡i
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
        // [OPTIMIZATION] Sá»­ dá»¥ng ImageData thay vÃ¬ fillRect
        const imgData = this.imageData;
        const data = imgData.data;
        
        // 1. XÃ³a buffer cÅ© (Set toÃ n bá»™ pixel vá» 0 - trong suá»‘t)
        // Sá»­ dá»¥ng Uint32Array Ä‘á»ƒ xÃ³a nhanh gáº¥p 4 láº§n
        new Uint32Array(data.buffer).fill(0);

        const w = CONFIG.BOARD_WIDTH;
        const h = CONFIG.BOARD_HEIGHT;
        const pSize = CONFIG.PARTICLE_SIZE;
        const bomb = STATE.bombPriming;

        // Cache highlight color náº¿u cÃ³
        let highlightRGB = null;
        if (highlightColor) highlightRGB = [255, 255, 255]; // MÃ u tráº¯ng má»

        for (let i = 0; i < STATE.particles.length; i++) {
            const p = STATE.particles[i];
            if (p.dead) continue;

            let x = Math.floor(p.x);
            let y = Math.floor(p.y);
            
            // Logic rung láº¯c khi bom sáº¯p ná»• (Giá»¯ nguyÃªn logic cÅ© nhÆ°ng Ã¡p dá»¥ng cho toáº¡ Ä‘á»™)
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

            // Láº¥y mÃ u RGB tá»« Cache
            let [r, g, b] = this.hexToRgb(p.color);

            // Xá»­ lÃ½ Highlight (Eraser)
            if (highlightColor && p.baseColor === highlightColor) {
                // Blend mÃ u tráº¯ng (Ä‘Æ¡n giáº£n hÃ³a báº±ng cÃ¡ch tÄƒng sÃ¡ng)
                r = Math.min(255, r + 100);
                g = Math.min(255, g + 100);
                b = Math.min(255, b + 100);
            }

            // Váº½ tá»«ng pixel cá»§a háº¡t cÃ¡t vÃ o buffer
            // Loop nÃ y xá»­ lÃ½ kÃ­ch thÆ°á»›c háº¡t (vÃ­ dá»¥ 4x4 hoáº·c 5x5)
            for (let py = 0; py < pSize; py++) {
                if (y + py >= h) break; // Check biÃªn dÆ°á»›i
                for (let px = 0; px < pSize; px++) {
                    if (x + px >= w) break; // Check biÃªn pháº£i
                    
                    // TÃ­nh index trong máº£ng 1 chiá»u: (y * width + x) * 4 kÃªnh mÃ u
                    const idx = ((y + py) * w + (x + px)) * 4;
                    
                    data[idx] = r;     // Red
                    data[idx + 1] = g; // Green
                    data[idx + 2] = b; // Blue
                    data[idx + 3] = 255; // Alpha (Full opacity)
                }
            }
        }

        // 2. Äáº©y dá»¯ liá»‡u pixel lÃªn Offscreen Canvas
        this.offscreenCtx.putImageData(imgData, 0, 0);

        // 3. Váº½ Offscreen Canvas lÃªn Main Canvas
        // VÃ¬ Main Canvas Ä‘Ã£ Ä‘Æ°á»£c scale/translate á»Ÿ hÃ m draw(), ta váº½ táº¡i (0,0)
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

        // BÃ³ng Ä‘á»• cá»§a Board xuá»‘ng ná»n gá»—
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
        const iconKeys = ['bomb', 'eraser', 'vortex'];
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

            const key = iconKeys[i];
            const img = this.itemIcons ? this.itemIcons[key] : null;
            const hasImg = img && img.complete && img.naturalWidth > 0;

            if (hasImg) {
                const iconSize = 36;
                ctx.drawImage(img, cx - iconSize / 2, y - iconSize / 2 - 6, iconSize, iconSize);
            } else {
                const fallbackIcons = ['💣', '💧', '🌌'];
                ctx.font = '28px Arial'; ctx.fillStyle = colors[i]; ctx.fillText(fallbackIcons[i], cx, y - 8);
            }
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

             const iconKey = type.toLowerCase();
             const img = this.itemIcons ? this.itemIcons[iconKey] : null;
             const hasImg = img && img.complete && img.naturalWidth > 0;

             if (hasImg) {
                 const iconSize = 32;
                 ctx.drawImage(img, x - iconSize / 2, y - iconSize / 2, iconSize, iconSize);
             } else {
                 ctx.font = '30px Arial'; ctx.fillStyle = '#FFF'; ctx.textAlign='center'; ctx.textBaseline='middle';
                 ctx.fillText(type === 'BOMB' ? '💣' : (type === 'ERASER' ? '💧' : '🌌'), x, y);
             }
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
