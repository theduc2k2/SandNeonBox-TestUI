/**
 * /js/ui/hud.js
 * RESPONSIBILITY: Update persistent UI elements (Score, Diamonds, Danger Line).
 * FIX: Synced variable names for Diamond displays.
 */

import { EventBus, EVENTS } from '../core/eventBus.js';
import { STATE } from '../core/state.js';

export const HUD = {
    scoreEl: null,
    diamondElGame: null, // [FIX] Đổi tên cho khớp logic update
    diamondElMenu: null, // [FIX] Thêm biến này để update ở Shop
    finalScoreEl: null,
    dangerLine: null,

    init() {
        // Cache DOM elements
        this.scoreEl = document.getElementById('game-score');

        // [FIX] Lấy cả 2 thẻ hiển thị kim cương (Trong game và Ngoài menu)
        this.diamondElGame = document.getElementById('game-diamond-display');
        this.diamondElMenu = document.getElementById('menu-diamond-display');

        this.finalScoreEl = document.getElementById('final-score');
        this.dangerLine = document.getElementById('danger-line');

        // Initial render (Vẽ lại ngay lập tức giá trị hiện tại)
        this.updateScore(0);
        this.updateDiamonds(STATE.diamonds);

        this.bindEvents();
        console.log("[UI] HUD System Initialized");
    },

    bindEvents() {
        // Lắng nghe cập nhật điểm số (Updated to use constant)
        EventBus.on(EVENTS.SCORE_UPDATED, (data) => {
            // Unpack object payload from Physics.js
            const score = typeof data === 'number' ? data : data.score;
            this.updateScore(score);
        });

        // Lắng nghe cập nhật kim cương
        EventBus.on('ui:updateDiamonds', ({ diamonds }) => {
            this.updateDiamonds(diamonds);
        });

        // Lắng nghe Game Over để hiện điểm cuối cùng
        EventBus.on('GAME_OVER', () => {
            if (this.finalScoreEl) {
                this.finalScoreEl.innerText = this.formatNumber(STATE.currentScore);
            }
        });
    },

    updateScore(score) {
        if (this.scoreEl) {
            this.scoreEl.innerText = this.formatNumber(score);
        }
    },

    updateDiamonds(diamonds) {
        // [FIX] Bây giờ các biến này đã được định nghĩa ở init() nên sẽ chạy đúng
        const formatted = this.formatNumber(diamonds);

        if (this.diamondElGame) {
            this.diamondElGame.innerText = formatted;
        }

        if (this.diamondElMenu) {
            this.diamondElMenu.innerText = formatted;
        }
    },

    formatNumber(num) {
        if (!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    }
};