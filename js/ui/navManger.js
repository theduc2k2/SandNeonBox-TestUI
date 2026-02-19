/**
 * NAV MANAGER - Bottom Navigation Bar
 * Handles 5-tab navigation interactions
 */

import { EventBus } from '../core/eventBus.js';
import { SoundManager } from '../audio/soundManager.js';

export class NavManager {
    constructor() {
        this.container = document.getElementById('bottom-nav');
        this.navButtons = [];
        this.activeButton = null;
    }
    
    init() {
        this.render();
        this.attachEvents();
        
        // Set home as default active
        const homeBtn = this.navButtons.find(btn => btn.dataset.target === 'tab-home');
        if (homeBtn) {
            homeBtn.classList.add('active');
            this.activeButton = homeBtn;
        }
    }
    
    render() {
        const navItems = [
            {
                target: 'tab-shop',
                icon: '<path d="M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24.97.02 1.99.71 2.73V19c0 1.1.9 2 2 2h14.4c1.1 0 2-.9 2-2v-7.38c.69-.74.95-1.76.69-2.73zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>',
                label: 'SHOP',
                activeBg: 'linear-gradient(to bottom, #FFD93D, #FFA500)',
                activeShadow: 'rgba(255, 165, 0, 0.6)',
                activeGlow: 'rgba(255, 211, 61, 0.4)'
            },
            {
                target: 'tab-team',
                icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
                label: 'ĐỘI',
                activeBg: 'linear-gradient(to bottom, #52D681, #2ECC71)',
                activeShadow: 'rgba(46, 204, 113, 0.6)',
                activeGlow: 'rgba(82, 214, 129, 0.4)'
            },
            {
                target: 'tab-home',
                icon: '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
                label: 'HOME',
                isHome: true,
                activeBg: 'linear-gradient(to bottom, #5DADE2, #3498DB)',
                activeShadow: 'rgba(52, 152, 219, 0.6)',
                activeGlow: 'rgba(93, 173, 226, 0.4)'
            },
            {
                target: 'tab-rank',
                icon: '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>',
                label: 'BXH',
                activeBg: 'linear-gradient(to bottom, #FF69B4, #FF1493)',
                activeShadow: 'rgba(255, 20, 147, 0.6)',
                activeGlow: 'rgba(255, 105, 180, 0.4)'
            },
            {
                target: 'tab-events',
                icon: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>',
                label: 'SỰ KIỆN',
                activeBg: 'linear-gradient(to bottom, #9D5CFF, #7B3FF2)',
                activeShadow: 'rgba(123, 63, 242, 0.6)',
                activeGlow: 'rgba(157, 92, 255, 0.4)'
            }
        ];
        
        this.container.innerHTML = navItems.map(item => `
            <div class="nav-btn ${item.isHome ? 'nav-home' : ''}" 
                 data-target="${item.target}"
                 style="--active-bg: ${item.activeBg}; --active-shadow: ${item.activeShadow}; --active-glow: ${item.activeGlow}">
                <div class="nav-icon-3d-wrapper">
                    <svg ${item.isHome ? 'style="width:36px; height:36px;"' : ''} viewBox="0 0 24 24">
                        ${item.icon}
                    </svg>
                </div>
                <div class="nav-label">${item.label}</div>
            </div>
        `).join('');
        
        this.navButtons = Array.from(this.container.querySelectorAll('.nav-btn'));
    }
    
    attachEvents() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                SoundManager.playClick();
                this.switchTab(btn);
            });
        });
    }
    
    switchTab(button) {
        const targetTabId = button.dataset.target;
        
        // Remove active from all buttons
        this.navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active to clicked button
        button.classList.add('active');
        this.activeButton = button;
        
        // Emit event for TabManager to handle
        EventBus.emit('nav:tabClicked', { tabId: targetTabId });
    }
    
    setActive(tabId) {
        const button = this.navButtons.find(btn => btn.dataset.target === tabId);
        if (button && button !== this.activeButton) {
            this.switchTab(button);
        }
    }
}