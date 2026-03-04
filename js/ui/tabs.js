/**
 * /scripts/ui/tabs.js
 * * RESPONSIBILITY:
 * Manage the visibility of main menu tabs (Home, Shop, Team, Rank, Events).
 * Handles the DOM class manipulation to show/hide .tab-pane elements.
 */

import { EventBus, EVENTS } from '../core/eventBus.js';

export const Tabs = {
    init() {
        // Initialize default state if needed, though HTML usually sets active
        this.bindEvents();
    },

    bindEvents() {
        // Listen for internal navigation events
        EventBus.on(EVENTS.NAVIGATE_TAB, (tabId) => {
            this.switchTab(tabId);
        });
        
        // Setup direct click listeners for tab-internal navigation if any
        // (e.g., Back buttons inside a tab)
    },

    /**
     * Switch the active tab pane
     * @param {string} tabId - The ID of the tab to show (e.g., 'tab-home')
     */
    switchTab(tabId) {
        // 1. Hide all tabs
        const panes = document.querySelectorAll('.tab-pane');
        panes.forEach(el => el.classList.remove('active'));

        // 2. Show target tab
        const target = document.getElementById(tabId);
        if (target) {
            target.classList.add('active');
            
            // Optional: Play sound via EventBus
            EventBus.emit(EVENTS.PLAY_SFX, 'click');
            EventBus.emit('ui:tabChanged', { tabId });
        } else {
            console.warn(`Tab ID not found: ${tabId}`);
        }
    }
};
