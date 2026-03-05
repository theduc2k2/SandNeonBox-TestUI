/**
 * /scripts/core/state.js
 * RESPONSIBILITY:
 * Act as the Single Source of Truth for the game.
 * Loads persistent data from LocalStorage on init.
 * Automatically emits events when data changes (Sync UI).
 */

import { EventBus } from './eventBus.js';
<<<<<<< HEAD
=======
import { sandPool, effectPool } from '../game/pools.js';
>>>>>>> Test

export const STATE = {
    // --- GAME STATUS ---
    status: 'MENU', // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    isPaused: false,
    frameCount: 0,
    isStable: false, 
    stabilityCounter: 0, 
    gameOverCounter: 0, 
    physicsFrozenTimer: 0, // Timer đóng băng vật lý khi dùng Item (Vortex/Bomb)

    // --- SCORING & ECONOMY ---
    highScore: parseInt(localStorage.getItem('sandtrix_highscore')) || 0,
    
    // [QUAN TRỌNG] Biến tiền tệ gốc (Không lồng vào object currency để tránh lỗi)
    diamonds: parseInt(localStorage.getItem('sandtrix_diamonds')) || 1000, // Tặng 1000 mặc định để test
    
    // Trạng thái gói Không Quảng Cáo
    noAds: localStorage.getItem('sandtrix_noads') === 'true',

    currentScore: 0,
    currentCombo: 0,
    maxCombo: 0,
    runDiamonds: 0, 

    // --- INVENTORY ---
    inventory: {
        bombs: localStorage.getItem('sandtrix_bombs') ? parseInt(localStorage.getItem('sandtrix_bombs')) : 3,
        erasers: localStorage.getItem('sandtrix_erasers') ? parseInt(localStorage.getItem('sandtrix_erasers')) : 3,
        vortex: localStorage.getItem('sandtrix_vortex') ? parseInt(localStorage.getItem('sandtrix_vortex')) : 1
    },

    // --- SETTINGS ---
    settings: {
        sound: localStorage.getItem('sandtrix_sound') !== 'false',
        vfx: localStorage.getItem('sandtrix_vfx') !== 'false'
    },

    // --- ENTITIES (Gameplay) ---
    grid: [],
    particles: [],
    flyingParticles: [],
    activeEffects: [],
    activeVortexes: [],
    clearingSequences: [],
    
    // Mechanics
    bombPriming: null, 

    // --- PLAYER INTERACTION ---
    dockPieces: [null, null, null],
    draggingPiece: null,
    draggingItem: null, // 'BOMB', 'ERASER', 'VORTEX'
    dragOffset: { x: 0, y: 0, currentX: 0, currentY: 0 },
    pointer: { x: 0, y: 0, isDown: false },

    // ============================================================
    // --- CÁC HÀM XỬ LÝ DỮ LIỆU (ACTIONS) ---
    // ============================================================

    // 1. Thêm Kim Cương (Nạp tiền / Ăn trong game)
    addDiamonds(amount) {
        this.diamonds += amount;
        this.save();
        // [QUAN TRỌNG] Bắn sự kiện để UI cập nhật
        EventBus.emit('ui:updateDiamonds', { diamonds: this.diamonds });
    },

    // 2. Tiêu Kim Cương (Mua trong Shop)
    spendDiamonds(amount) {
        if (this.diamonds >= amount) {
            this.diamonds -= amount;
            this.save();
            // [QUAN TRỌNG] Bắn sự kiện để UI cập nhật
            EventBus.emit('ui:updateDiamonds', { diamonds: this.diamonds });
            return true; // Mua thành công
        }
        return false; // Không đủ tiền
    },

    // 3. Cập nhật Kho đồ (Thêm item khi mua / Trừ khi dùng)
    updateInventory(type, amount) {
        // Chuẩn hóa key để tránh lỗi gõ sai
        if (type === 'bomb' || type === 'bombs') this.inventory.bombs += amount;
        else if (type === 'eraser' || type === 'erasers') this.inventory.erasers += amount;
        else if (type === 'vortex') this.inventory.vortex += amount;
        
        // Đảm bảo không âm
        if (this.inventory.bombs < 0) this.inventory.bombs = 0;
        if (this.inventory.erasers < 0) this.inventory.erasers = 0;
        if (this.inventory.vortex < 0) this.inventory.vortex = 0;

        this.save();
        // Báo cho UI Shop/Game biết để vẽ lại số lượng item
        EventBus.emit('ui:updateItems', this.inventory); 
    },

    // 4. Lưu dữ liệu xuống LocalStorage
    save() {
        localStorage.setItem('sandtrix_highscore', this.highScore);
        localStorage.setItem('sandtrix_diamonds', this.diamonds);
        localStorage.setItem('sandtrix_bombs', this.inventory.bombs);
        localStorage.setItem('sandtrix_erasers', this.inventory.erasers);
        localStorage.setItem('sandtrix_vortex', this.inventory.vortex);
        localStorage.setItem('sandtrix_noads', this.noAds); 
        localStorage.setItem('sandtrix_sound', this.settings.sound);
        localStorage.setItem('sandtrix_vfx', this.settings.vfx);
    }
};

/**
 * Hàm Reset trạng thái Gameplay khi chơi lại từ đầu
 */
export function resetGameplayState() {
    STATE.status = 'PLAYING';
    STATE.isPaused = false;
    
    STATE.currentScore = 0;
    STATE.currentCombo = 0;
    STATE.runDiamonds = 0;
    
<<<<<<< HEAD
    STATE.particles = [];
    STATE.flyingParticles = [];
    STATE.activeEffects = [];
=======
    // Release pooled objects before clearing arrays to keep pools warm
    for (let i = STATE.particles.length - 1; i >= 0; i--) {
        sandPool.release(STATE.particles[i]);
    }
    STATE.particles.length = 0;
    STATE.flyingParticles = [];
    for (let i = STATE.activeEffects.length - 1; i >= 0; i--) {
        effectPool.release(STATE.activeEffects[i]);
    }
    STATE.activeEffects.length = 0;
>>>>>>> Test
    STATE.activeVortexes = [];
    STATE.clearingSequences = [];
    
    // Reset Grid
    if (STATE.grid && STATE.grid.length > 0) {
        for (let c = 0; c < STATE.grid.length; c++) {
            if (STATE.grid[c]) STATE.grid[c].fill(null);
        }
    }

    STATE.dockPieces = [null, null, null];
    STATE.draggingPiece = null;
    STATE.draggingItem = null;
    STATE.bombPriming = null;
    STATE.gameOverCounter = 0;
    STATE.physicsFrozenTimer = 0;
    
    STATE.dragOffset = { x: 0, y: 0, currentX: 0, currentY: 0 };
<<<<<<< HEAD
}
=======
}
>>>>>>> Test
