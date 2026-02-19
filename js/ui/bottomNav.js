/**
 * /scripts/ui/bottomNav.js
 * * RESPONSIBILITY:
 * Handle the bottom navigation bar interactions.
 * Updates the visual state of nav buttons and triggers Tab switching.
 */

import { EventBus, EVENTS } from '../core/eventBus.js';

export const BottomNav = {
    init() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Prevent default anchor behavior
                e.preventDefault();
                
                // Get target from data attribute
                // Walk up the tree in case the click hit the icon/SVG inside
                const targetBtn = e.target.closest('.nav-btn');
                const targetTab = targetBtn.dataset.target;
                
                if (targetTab) {
                    this.setActiveButton(targetBtn);
                    // Tell the Tab Manager to switch
                    EventBus.emit(EVENTS.NAVIGATE_TAB, targetTab);
                }
            });
        });
    },

    /**
     * Update the visual 'active' class on the navigation buttons
     * @param {HTMLElement} activeBtn 
     */
    setActiveButton(activeBtn) {
        const buttons = document.querySelectorAll('.nav-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
};