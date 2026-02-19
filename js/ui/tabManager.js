/**
 * TAB MANAGER
 * Handles tab switching logic
 * NO game logic - pure UI state management
 */

import { AppState } from '../core/state.js';
import { EventBus } from '../core/eventBus.js';

export class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-pane');
        this.activeTab = 'tab-home';
    }
    
    init() {
        // Setup initial state
        this.switchTo('tab-home', false);
    }
    
    /**
     * Switch to a specific tab
     * @param {string} tabId - Target tab ID
     * @param {boolean} animate - Whether to animate transition
     */
    switchTo(tabId, animate = true) {
        const targetTab = document.getElementById(tabId);
        if (!targetTab) {
            console.warn(`Tab "${tabId}" not found`);
            return;
        }
        
        // Remove active from all tabs
        this.tabs.forEach(tab => tab.classList.remove('active'));
        
        // Add active to target
        targetTab.classList.add('active');
        
        // Update state
        this.activeTab = tabId;
        AppState.currentTab = tabId;
        
        // Emit event for other systems
        EventBus.emit('ui:tabChanged', { tabId });
    }
    
    /**
     * Get current active tab ID
     */
    getActive() {
        return this.activeTab;
    }
}