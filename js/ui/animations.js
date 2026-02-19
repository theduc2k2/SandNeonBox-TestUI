/**
 * /scripts/ui/animations.js
 * RESPONSIBILITY: Handle Visual Feedback (Shake, Floating Text, COMBO text).
 * NOTE: Flash effect is handled in renderer.js to render behind particles.
 */

import { EventBus, EVENTS } from '../core/eventBus.js';
import { CONFIG } from '../core/config.js';
import { STATE } from '../core/state.js';

export const UIAnimations = {
    hudLayer: null,
    innerScreen: null,
    comboEl: null,

    init() {
        this.innerScreen = document.getElementById('inner-screen');
        // Fallback nếu không có hud-layer
        this.hudLayer = document.getElementById('hud-layer') || this.innerScreen;

        // Lấy thẻ hiển thị Combo
        this.comboEl = document.getElementById('combo-display');

        this.bindEvents();
        console.log("[UI] Animations System Initialized");
    },

    bindEvents() {
        // 1. Rung màn hình
        EventBus.on('ui:shake', (data) => {
            this.triggerShake(data.intensity);
        });

        // 2. Chữ bay (Điểm số, Kim cương)
        EventBus.on('ui:showFloatingText', (data) => {
            this.showFloatingText(data.text, data.x, data.y, data.color);
        });

        // 3. [MỚI] Hiển thị Combo
        EventBus.on(EVENTS.SCORE_UPDATED, (data) => {
            // Chỉ hiện khi combo > 1
            if (data.combo > 1) {
                this.showCombo(data.combo);
            }
        });

        // 4. [MỚI] Ẩn Combo khi đứt chuỗi
        EventBus.on('ui:hideCombo', () => {
            this.hideCombo();
        });

        // LƯU Ý: Không lắng nghe 'ui:flash' ở đây nữa vì Renderer.js đã xử lý vẽ lên Canvas
    },

    triggerShake(intensity) {
        if (STATE.settings && !STATE.settings.vfx) return;
        if (!this.innerScreen) return;

        // Reset animation
        this.innerScreen.classList.remove('shake');
        void this.innerScreen.offsetWidth; // Trigger Reflow
        this.innerScreen.classList.add('shake');
    },

    showFloatingText(text, x, y, color) {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.innerHTML = text;

        const totalW = CONFIG.BOARD_WIDTH;
        const totalH = CONFIG.BOARD_HEIGHT + CONFIG.DOCK_HEIGHT;

        el.style.left = (x / totalW * 100) + '%';
        el.style.top = (y / totalH * 100) + '%';
        el.style.color = color;
        el.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 10 - 5}deg)`;

        if (this.hudLayer) {
            this.hudLayer.appendChild(el);
            setTimeout(() => {
                if (el.parentNode) el.remove();
            }, 1000);
        }
    },

    // --- LOGIC COMBO MỚI ---
    showCombo(count) {
        if (!this.comboEl) return;

        this.comboEl.innerText = "COMBO x" + count + "!";
        this.comboEl.classList.add('show');

        // Reset animation nảy nhẹ
        this.comboEl.style.animation = 'none';
        this.comboEl.offsetHeight;
        this.comboEl.style.animation = '';
    },

    hideCombo() {
        if (!this.comboEl) return;
        this.comboEl.classList.remove('show');
    }
};