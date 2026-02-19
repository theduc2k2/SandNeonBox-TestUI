/**
 * /scripts/game/gameLoop.js
 * RESPONSIBILITY: Main Game Cycle.
 * UPDATES: Physics, Items, Effects AND Checks for Game Over.
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js'; // Cần để biết giới hạn màn hình
import { EventBus, EVENTS } from '../core/eventBus.js';
import { Renderer } from './renderer.js';
import { Items } from './items.js';
import { Effects } from './effects.js';
import { Physics } from './physics.js';
import { Grid } from './grid.js'; // [MỚI] Cần Import Grid để check dòng trên cùng

let animationId = null;
let lastTime = 0;

function gameLoop(timestamp) {
    animationId = requestAnimationFrame(gameLoop);

    if (STATE.status === 'MENU' || STATE.status === 'GAMEOVER') return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // =========================
    // UPDATE (chỉ khi PLAYING)
    // =========================
    if (STATE.status === 'PLAYING' && !STATE.isPaused) {
        
        // 1. Cập nhật Item (Bom đếm ngược, Hố đen...)
        // Lưu ý: Items.update() trong file items.js trước đó k nhận tham số, nó tự lấy từ STATE
        Items.update(); 
        
        // 2. Cập nhật Vật lý (Cát rơi)
        if (Physics && Physics.update) {
            Physics.update(deltaTime);
        }

        // 3. Cập nhật Hiệu ứng (Hạt bay)
        if (Effects && Effects.update) {
            Effects.update(deltaTime);
        }
    }

    // =========================
    // RENDER (luôn render)
    // =========================
    Renderer.draw();

    STATE.frameCount++;
}

export const GameLoop = {

    start() {
        if (animationId) return;

        console.log('[GameLoop] Start');

        STATE.status = 'PLAYING';
        STATE.isPaused = false;
        STATE.gameOverCounter = 0; // Reset bộ đếm thua

        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);

        EventBus.emit(EVENTS.GAME_START);
    },

    pause() {
        if (STATE.isPaused) return;

        STATE.isPaused = true;
        console.log('[GameLoop] Paused');
    },

    resume() {
        if (!STATE.isPaused) return;

        STATE.isPaused = false;
        lastTime = performance.now(); // reset delta để tránh giật lag sau khi resume
        console.log('[GameLoop] Resumed');
    },

    stop() {
        if (!animationId) return;

        cancelAnimationFrame(animationId);
        animationId = null;

        STATE.isPaused = false;
        // Không set status = MENU ở đây vội, để Main xử lý chuyển cảnh
        
        console.log('[GameLoop] Stopped');
    }
};