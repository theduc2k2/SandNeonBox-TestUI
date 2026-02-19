
import { STATE } from '../core/state.js';
import { SoundManager } from '../audio/soundManager.js';
import { EventBus } from '../core/eventBus.js';

export const LuckyWheel = {
    wheelEl: null,
    itemsContainer: null,
    overlay: null,
    resultPopup: null,

    isSpinning: false,
    currentRotation: 0,

    // PRIZE CONFIG: 8 Sectors
    // Order: Clockwise from top (0 deg). 
    // BUT CSS rotates clockwise. 
    // Index 0 is at 0-45deg. At top pointer (0deg), this index is sector 0? 
    // Wait. Pointer is at TOP. 
    // To land on Sector 0, we rotate -22.5deg?
    // Let's simplify: 8 items. 45deg each.
    prizes: [
        { id: 'bomb', name: 'BOMB', icon: '💣', type: 'item', amount: 1, weight: 10 },
        { id: 'gems_100', name: '100 GEMS', icon: '💎', type: 'gem', amount: 100, weight: 30 },
        { id: 'eraser', name: 'WIPE', icon: '💧', type: 'item', amount: 1, weight: 10 },
        { id: 'gems_500', name: '500 GEMS', icon: '💎', type: 'gem', amount: 500, weight: 5 },
        { id: 'vortex', name: 'VORTEX', icon: '🌀', type: 'item', amount: 1, weight: 10 },
        { id: 'gems_50', name: '50 GEMS', icon: '💎', type: 'gem', amount: 50, weight: 50 },
        { id: 'bomb', name: '2 BOMBS', icon: '💣', type: 'item', amount: 2, weight: 5 },
        { id: 'gems_200', name: '200 GEMS', icon: '💎', type: 'gem', amount: 200, weight: 20 }
    ],

    init() {
        this.overlay = document.getElementById('lucky-wheel-overlay');
        this.wheelEl = document.getElementById('wheel-rosette');
        this.itemsContainer = document.getElementById('wheel-items-container');
        this.resultPopup = document.getElementById('wheel-result');

        this.renderItems();
        this.bindEvents();
    },

    bindEvents() {
        window.spinWheel = () => this.spin();
        window.claimPrize = () => this.close();
    },

    renderItems() {
        if (!this.itemsContainer) return;
        this.itemsContainer.innerHTML = '';

        const count = this.prizes.length; // 8
        const step = 360 / count; // 45

        this.prizes.forEach((prize, i) => {
            // Calculate angle for icon placement
            // To center in sector, add half step (22.5) to sector start (i * 45)
            const angle = i * step + (step / 2);

            const el = document.createElement('div');
            el.className = 'wheel-item';
            // Rotate container to point to sector center
            el.style.transform = `rotate(${angle}deg)`;

            el.innerHTML = `
                <div class="wheel-icon-content">
                    <div style="font-size:30px;">${prize.icon}</div>
                    <div style="font-size:10px; opacity:0.8;">${prize.amount > 10 ? prize.amount : prize.name}</div>
                </div>
            `;

            this.itemsContainer.appendChild(el);
        });
    },

    open() {
        if (!this.overlay) return;
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('active');

        // Hide result popup if open
        if (this.resultPopup) this.resultPopup.classList.add('hidden');

        SoundManager.playClick(); // Or fanfares
    },

    close() {
        if (!this.overlay) return;
        this.overlay.classList.remove('active');
        setTimeout(() => this.overlay.classList.add('hidden'), 300);

        // Resume game logic?
        // Actually Main should handle this via callbacks ideally.
        // For now, simple resume.
        EventBus.emit('GAME_RESUME');

        // Reset Progress Bar logic in Main
        EventBus.emit('WHEEL_CLOSED');
    },

    spin() {
        if (this.isSpinning) return;

        this.isSpinning = true;
        SoundManager.playClick();

        // Disable button visually
        document.querySelector('.wheel-btn-spin').classList.add('disabled');

        // 1. Determine Result based on weights
        const totalWeight = this.prizes.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;

        for (let i = 0; i < this.prizes.length; i++) {
            random -= this.prizes[i].weight;
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }

        // 2. Calculate Rotation
        // We want pointer (top) to point to selectedIndex.
        // Item angle = index * 45 + 22.5
        // To bring that angle to 0 (top), we rotate wheel by -ItemAngle.
        // Add extra spins (e.g. 5 * 360) for effect.

        const sectorAngle = 360 / this.prizes.length;
        const itemAngle = selectedIndex * sectorAngle + (sectorAngle / 2);

        // Target rotation: Current + 5 full spins + (360 - itemAngle)
        // NOTE: CSS rotation adds up.
        // Example: Item at 45deg. To be at 0, wheel must rotate -45 (or 315).

        const extraSpins = 5 * 360;
        // Ensure strictly increasing rotation for simplicity
        const targetRotation = this.currentRotation + extraSpins + (360 - itemAngle - (this.currentRotation % 360));

        this.currentRotation = targetRotation;

        // Apply CSS
        if (this.wheelEl) {
            this.wheelEl.style.transform = `rotate(${this.currentRotation}deg)`;
        }

        // Sound Effect loop?
        // Simple shim

        // 3. Wait for end
        setTimeout(() => {
            this.showResult(this.prizes[selectedIndex]);
            this.isSpinning = false;
            document.querySelector('.wheel-btn-spin').classList.remove('disabled');
        }, 4000); // 4s matches CSS transition
    },

    showResult(prize) {
        // Collect Prize logic
        if (prize.type === 'gem') {
            STATE.addDiamonds(prize.amount);
        } else if (prize.type === 'item') {
            STATE.updateInventory(prize.id, prize.amount); // id: 'bomb' ...
        }

        // Show Popup
        if (this.resultPopup) {
            this.resultPopup.classList.remove('hidden');
            document.getElementById('wheel-prize-icon').innerText = prize.icon;
            document.getElementById('wheel-prize-text').innerText = prize.name;
        }

        SoundManager.playMatch(5); // Victory sound
    }
};
