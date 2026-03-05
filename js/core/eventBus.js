/**
 * / tập lệnh / cốt lõi / eventBus.js
 * * TRÁCH NHIỆM:
 * Cung cấp cơ chế Xuất bản/Đăng ký để tách các mô-đun.
 * Được sử dụng để giao tiếp giữa các lớp Logic, UI và Âm thanh.
 * * CÁCH DÙNG:
 * EventBus.on('EVENT_NAME', gọi lại);
 * EventBus.emit ('EVENT_NAME', tải trọng);
 */

class EventBusImpl {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} eventName 
     * @param {function} callback 
     */
    on(eventName, callback) {
    if (!this.listeners[eventName]) {
        this.listeners[eventName] = [];
    }

    if (this.listeners[eventName].includes(callback)) {
        return; // chặn trùng
    }

    this.listeners[eventName].push(callback);
}


    /**
     * Unsubscribe from an event
     * @param {string} eventName 
     * @param {function} callback 
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
    }

    /**
     * Publish an event to all subscribers
     * @param {string} eventName 
     * @param {*} data - Optional payload
     */
    emit(eventName, data) {
        if (!this.listeners[eventName]) return;
        this.listeners[eventName].forEach(callback => callback(data));
    }
}

// Export a singleton instance
export const EventBus = new EventBusImpl();

// Define Event Name Constants to prevent typos
export const EVENTS = {
    // Game Flow
    GAME_START: 'GAME_START',
    GAME_PAUSE: 'GAME_PAUSE',
    GAME_RESUME: 'GAME_RESUME',
    GAME_OVER: 'GAME_OVER',
    
    // State Changes
    SCORE_UPDATED: 'SCORE_UPDATED',
    DIAMONDS_UPDATED: 'DIAMONDS_UPDATED',
    INVENTORY_UPDATED: 'INVENTORY_UPDATED',
    
    // Actions
    PIECE_PLACED: 'PIECE_PLACED',
    ITEM_USED: 'ITEM_USED',
    MATCH_FOUND: 'MATCH_FOUND',
    
    // UI Triggers
    OPEN_SHOP: 'OPEN_SHOP',
    OPEN_SETTINGS: 'OPEN_SETTINGS',
<<<<<<< HEAD
    
    // Audio Triggers
    PLAY_SFX: 'PLAY_SFX'
};
=======
    NAVIGATE_TAB: 'NAVIGATE_TAB',
    // Audio Triggers
    PLAY_SFX: 'PLAY_SFX'
};
>>>>>>> Test
