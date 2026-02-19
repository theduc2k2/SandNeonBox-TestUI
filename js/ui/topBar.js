/**
 * /scripts/ui/topBar.js
 * * RESPONSIBILITY:
 * Manage the Top Resource Bar DOM elements.
 * Displays current Diamond count and handles Settings button clicks.
 */

import { STATE } from '../core/state.js';
import { EventBus, EVENTS } from '../core/eventBus.js';

export const TopBar = {
    diamondDisplay: null,
    settingsBtn: null,

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.updateDiamonds(STATE.diamonds); // Initial sync
    },

    cacheDOM() {
        this.diamondDisplay = document.getElementById('menu-diamond-display');
        // Note: There is a separate display for in-game (#game-diamond-display)
        // handled by a specific HUD manager, or we can unify here.
        // For now, we update the menu display.
        
        // Find the settings button in the top bar
        // It's the .menu-btn inside .top-resource-bar
        const topBar = document.querySelector('.top-resource-bar');
        if (topBar) {
            this.settingsBtn = topBar.querySelector('.menu-btn');
        }
    },

    bindEvents() {
        // Listen for data changes
        EventBus.on(EVENTS.DIAMONDS_UPDATED, (data) => {
            // data can be { total, earned } or just raw number depending on emit
            // We assume State is truth, but payload might be convenient
            this.updateDiamonds(STATE.diamonds);
        });

        // Handle Settings Button
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => {
                EventBus.emit(EVENTS.OPEN_SETTINGS);
                EventBus.emit(EVENTS.PLAY_SFX, 'click');
            });
        }
    },

    updateDiamonds(amount) {
        if (this.diamondDisplay) {
            this.diamondDisplay.innerText = this.formatNumber(amount);
        }
    },

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    }
};