import { EventBus } from '../core/eventBus.js';

const BG_IMAGE_SRC = 'Asset/Shop/Background-Bundle/Background_Bundle.png';
const PILL_IMAGE_SRC = 'Asset/Shop/Button-Bundle/Button-Bundle.png';

const promoBadgeData = {
    left: [
        { title: 'Daily', subtitle: 'Bonus' },
        { title: 'Daily', subtitle: 'Quest' }
    ],
    right: [
        { title: 'No', subtitle: 'Ads' },
        { title: 'Starter', subtitle: 'Pack' }
    ]
};

function createBadge(item, side, idx) {
    const badge = document.createElement('button');
    badge.className = 'promo-badge';
    badge.type = 'button';
    badge.dataset.side = side;
    badge.dataset.index = idx;

    const circle = document.createElement('div');
    circle.className = 'badge-circle';

    // Icon cho Daily Bonus / Daily Quest
    const label = `${item.title} ${item.subtitle}`.trim().toLowerCase();
    let iconSrc = null;
    let iconAlt = '';

    if (label === 'daily bonus') {
        circle.classList.add('badge-circle--calendar');
        iconSrc = 'Asset/Shop/Calendar/Calendar.png';
        iconAlt = 'Daily Bonus';
    } else if (label === 'daily quest') {
        circle.classList.add('badge-circle--daily-quest');
        iconSrc = 'Asset/Shop/Daily-Quest/Daily-Quest.png';
        iconAlt = 'Daily Quest';
    }

    if (iconSrc) {
        const icon = document.createElement('img');
        icon.className = 'badge-icon';
        icon.src = iconSrc;
        icon.alt = iconAlt;
        circle.appendChild(icon);
    }

    badge.appendChild(circle);

    const pill = document.createElement('div');
    pill.className = 'badge-pill';
    pill.textContent = `${item.title} ${item.subtitle}`;
    badge.appendChild(pill);

    badge.addEventListener('click', (e) => {
        e.stopPropagation();
        EventBus.emit('ui:promoBadgeClick', { side, index: idx, title: item.title, subtitle: item.subtitle });
    });

    return badge;
}

function renderColumn(container, items, side) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach((item, idx) => container.appendChild(createBadge(item, side, idx)));
}

function setVisible(visible) {
    const wrapper = document.querySelector('.promo-badges');
    if (!wrapper) return;
    wrapper.classList.toggle('hidden', !visible);
}

export function initPromoBadges() {
    const leftCol = document.getElementById('promo-left');
    const rightCol = document.getElementById('promo-right');
    renderColumn(leftCol, promoBadgeData.left, 'left');
    renderColumn(rightCol, promoBadgeData.right, 'right');

    EventBus.on('ui:tabChanged', ({ tabId }) => setVisible(tabId === 'tab-home'));
    const activePane = document.querySelector('.tab-pane.active');
    setVisible((activePane ? activePane.id : 'tab-home') === 'tab-home');

    EventBus.on('ui:promoBadgeClick', ({ title, subtitle }) => {
        const label = `${title} ${subtitle}`.trim();
        if (label.toLowerCase() === 'daily bonus') {
            openDailyBonusOverlay();
            return;
        }
        openPromoOverlay(label);
    });
}

function openPromoOverlay(labelText) {
    const overlay = document.getElementById('promo-overlay');
    const titleEl = document.getElementById('promo-title');
    const subEl = document.getElementById('promo-subtitle');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = labelText || 'Bundle';
    if (subEl) subEl.textContent = 'Nhấn Mua để nhận gói ưu đãi này';
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
}

function openDailyBonusOverlay() {
    const dailyOverlay = document.getElementById('daily-bonus-overlay');
    if (dailyOverlay) {
        dailyOverlay.classList.remove('hidden');
        dailyOverlay.style.display = 'flex';
    }
    const promoOverlay = document.getElementById('promo-overlay');
    if (promoOverlay) {
        promoOverlay.classList.add('hidden');
        promoOverlay.style.display = 'none';
    }
}

// Expose global handlers for buttons
window.closePromoOverlay = function() {
    const overlay = document.getElementById('promo-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
    }
};

window.buyPromoBundle = function() {
    EventBus.emit('ui:promoBuyClicked', {});
    window.closePromoOverlay();
};
