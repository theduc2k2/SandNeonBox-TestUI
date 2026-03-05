/**
 * /scripts/main.js
 * RESPONSIBILITY: Main Entry Point, Global Bridge & Visuals Manager.
 * SYNC: Integrated Visuals from UISand.html to avoid flickering.
 * FIX: Synced with new STATE structure (diamonds & helper methods) and Game Over logic.
 */

import { EventBus, EVENTS } from './core/eventBus.js';
import { STATE, resetGameplayState } from './core/state.js';
import { SoundManager } from './audio/soundManager.js';

import { Grid } from './game/grid.js';
import { Items } from './game/items.js';
import { Dock } from './game/dock.js';
import { GameLoop } from './game/gameLoop.js';
import { InputHandler } from './game/input.js';
import { Renderer } from './game/renderer.js';
import { ScoreSystem } from './game/scoreSystem.js';
import { Effects } from './game/effects.js';

import { Leaderboard } from './core/leaderboard.js'; // [NEW]
import { Preloader } from './core/preloader.js';

import { Tabs } from './ui/tabs.js';
import { BottomNav } from './ui/bottomNav.js';
import { TopBar } from './ui/topBar.js';
import { UIAnimations } from './ui/animations.js';
import { HUD } from './ui/hud.js';
import { LuckyWheel } from './ui/luckyWheel.js';

let visualsManager = null;

// --- SHOP CONFIG ---
const SHOP_PRICES = {
    'bomb': 100,
    'eraser': 300,
    'vortex': 500
};

const ASSETS_TO_PRELOAD = [
    ...Preloader.DEFAULT_ASSETS,
    'Asset/BackGround/Background.png',
    'Asset/BackGround/Background2.png',
    'Asset/Shop/Button-Bundle/Button-Bundle.png',
    'Asset/Shop/Background-Bundle/Background_Bundle.png',
    'Asset/Shop/Button-Bundle/Button-Bundle@2x.png',
    'Asset/Shop/Background-Bundle/Background_Bundle@2x.png',
    'Asset/Shop/Calendar/Calendar.png',
    'Asset/Shop/Daily-Quest/Daily-Quest.png'
];

// Helper: Cập nhật hiển thị số kim cương trên UI (Menu + Game)
function updateCurrencyUI() {
    // [FIX] Lấy trực tiếp từ STATE.diamonds
    const gems = STATE.diamonds || 0;

    // Cập nhật text ở Menu
    const menuGemEl = document.getElementById('menu-diamond-display');
    if (menuGemEl) menuGemEl.innerText = gems.toLocaleString();

    // Cập nhật text ở trong Game HUD
    const gameGemEl = document.getElementById('game-diamond-display');
    if (gameGemEl) gameGemEl.innerText = gems.toLocaleString();
}

// --- UI LEADERBOARD HELPER (top-level, dùng cho switchTab và init) ---
async function updateLeaderboardUI() {
    const container = document.getElementById('rank-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; color:#FFF; margin-top:20px; font-size:16px;">⏳ Đang tải...</div>';

    let topScores = [];
    let personalStats = {};
    try {
        topScores = await Leaderboard.getTopScores(10);
        personalStats = await Leaderboard.getPersonalStats();
    } catch (err) {
        console.warn('Leaderboard fetch failed, using fallback data', err);
        topScores = [];
        personalStats = {};
    }

    container.innerHTML = ''; // Clear loading

    const fallbackScores = [
        { rank: 1, name: 'Enol', score: 123601, level: 123, userId: 'A1' },
        { rank: 2, name: 'User9749544', score: 100003, level: 102, userId: 'A2' },
        { rank: 3, name: 'User1573441', score: 67503, level: 88, userId: 'A3' },
        { rank: 4, name: 'User6626293', score: 57997, level: 80, userId: 'A4' },
        { rank: 5, name: 'User8025129', score: 53984, level: 77, userId: 'A5' },
        { rank: 6, name: 'Daisy04', score: 48784, level: 73, userId: 'A6' },
        { rank: 7, name: 'User7101622', score: 47380, level: 72, userId: 'A7' },
        { rank: 8, name: 'User6623795', score: 47246, level: 71, userId: 'A8' },
        { rank: 9, name: 'User9186615', score: 45132, level: 69, userId: 'A9' },
        { rank: 10, name: 'Bạn', score: 1735824, level: 14, userId: 'ME', isUser: true }
    ];

    if (!Array.isArray(topScores) || topScores.length === 0) {
        topScores = fallbackScores;
    }

    const listWrap = document.createElement('div');
    listWrap.className = 'rank-list';
    container.appendChild(listWrap);

    topScores.forEach(player => {
        const isMe = player.isUser;
        const card = document.createElement('div');
        let classes = 'rank-card';
        if (player.rank === 1) classes += ' top1';
        else if (player.rank === 2) classes += ' top2';
        else if (player.rank === 3) classes += ' top3';
        if (isMe) classes += ' me';
        card.className = classes;

        const pos = document.createElement('div');
        pos.className = 'rank-pos';
        pos.textContent = player.rank;
        card.appendChild(pos);

        const avatar = document.createElement('div');
        avatar.className = 'rank-avatar';
        avatar.textContent = '😺';
        card.appendChild(avatar);

        const main = document.createElement('div');
        main.className = 'rank-main';
        const nameEl = document.createElement('div');
        nameEl.className = 'rank-name';
        nameEl.textContent = player.name;
        const subEl = document.createElement('div');
        subEl.className = 'rank-sub';
        subEl.textContent = `ID: ${player.userId || '—'}`;
        main.appendChild(nameEl);
        main.appendChild(subEl);
        card.appendChild(main);

        const right = document.createElement('div');
        right.className = 'rank-right';
        const scoreChip = document.createElement('div');
        scoreChip.className = 'rank-score-chip';
        scoreChip.textContent = player.score.toLocaleString();
        const levelChip = document.createElement('div');
        levelChip.className = 'rank-level-chip';
        levelChip.textContent = `Level ${player.level || Math.max(1, Math.floor(player.score / 5000))}`;
        right.appendChild(scoreChip);
        right.appendChild(levelChip);
        card.appendChild(right);

        listWrap.appendChild(card);
    });

    const myHighScore = personalStats.highScore || 0;
    const totalGames = personalStats.totalGames || 0;

    const personalHTML = `
        <div style="
            margin-top:20px; 
            padding:15px; 
            background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            border-radius:12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        ">
            <div style="text-align:center; font-size:14px; color:#FFF; margin-bottom:8px; opacity:0.9;">
                📊 THÀNH TÍCH CỦA BẠN
            </div>
            <div style="display:flex; justify-content:space-around; align-items:center;">
                <div style="text-align:center;">
                    <div style="font-size:12px; color:#E0E0E0;">Điểm cao nhất</div>
                    <div style="font-size:28px; color:#FFD93D; font-weight:bold; margin-top:5px;">
                        ${myHighScore.toLocaleString()}
                    </div>
                </div>
                <div style="width:2px; height:50px; background:rgba(255,255,255,0.3);"></div>
                <div style="text-align:center;">
                    <div style="font-size:12px; color:#E0E0E0;">Số ván chơi</div>
                    <div style="font-size:28px; color:#52D681; font-weight:bold; margin-top:5px;">
                        ${totalGames}
                    </div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', personalHTML);
}

function setGameObjectActive(elementId, isActive, animate = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const isOverlay = el.classList.contains('overlay-backdrop');
    const panel = el.querySelector('.settings-panel, .game-settings-panel, .quit-card, .candy-modal');
    const panelAnim = !!panel;
    const shouldAnimate = animate || panelAnim || el.classList.contains('candy-modal') || el.classList.contains('game-settings-panel') || el.classList.contains('settings-panel') || el.classList.contains('quit-card');
    if (isActive) {
        // [FIXED] Thêm điều kiện kiểm tra 'game-over' để dùng flexbox căn giữa
        if (elementId.includes('menu') || elementId.includes('overlay') || elementId.includes('tab') || elementId === 'game-over') {
            el.style.display = 'flex';
            el.style.pointerEvents = 'auto';
        } else {
            el.style.display = 'block';
        }
        el.classList.remove('hidden');
        el.classList.add('active');

        if (shouldAnimate && panel) {
            void panel.offsetWidth; // restart animation
            panel.classList.remove('pop-out');
            panel.classList.add('pop-in');
            setTimeout(() => panel.classList.remove('pop-in'), 360);
        } else if (shouldAnimate && !isOverlay) {
            void el.offsetWidth;
            el.classList.remove('pop-out');
            el.classList.add('pop-in');
            setTimeout(() => el.classList.remove('pop-in'), 360);
        }
    } else {
        const hideOverlay = () => {
            el.classList.add('hidden');
            el.classList.remove('active');
            setTimeout(() => {
                el.style.display = 'none';
            }, 320);
        };

        if (shouldAnimate && panel && !isOverlay) {
            panel.classList.remove('pop-in');
            panel.classList.add('pop-out');
            el.classList.remove('hidden'); // keep visible for anim
            el.classList.remove('active');
            setTimeout(() => {
                panel.classList.remove('pop-out');
                el.style.display = 'none';
                el.classList.add('hidden');
            }, 520);
        } else if (shouldAnimate && panel && isOverlay) {
            // animate panel only, overlay fades via CSS
            panel.classList.remove('pop-in');
            panel.classList.add('pop-out');
            el.classList.add('hidden'); // fade backdrop
            el.classList.remove('active');
            setTimeout(() => {
                panel.classList.remove('pop-out');
                el.style.display = 'none';
            }, 520);
        } else if (shouldAnimate && !panel && !isOverlay) {
            el.classList.remove('pop-in');
            el.classList.add('pop-out');
            setTimeout(() => {
                el.classList.remove('pop-out');
                el.style.display = 'none';
                el.classList.add('hidden');
            }, 520);
        } else {
            if (isOverlay) hideOverlay();
            else {
                el.style.display = 'none';
                el.classList.add('hidden');
                el.classList.remove('active');
            }
        }
    }
}

function switchTab(tabId, navEl) {
    SoundManager.playClick();
    document.querySelectorAll('.tab-pane').forEach(el => {
        el.classList.remove('active');
    });
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');

        // [NEW] Nếu mở tab Rank thì load dữ liệu
        if (tabId === 'tab-rank') {
            updateLeaderboardUI();
        }
        EventBus.emit('ui:tabChanged', { tabId });
    }
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
}

window.switchTab = switchTab;

async function bootGame() {
    try {
        await Preloader.run(ASSETS_TO_PRELOAD);
    } catch (err) {
        console.warn('Preload error, tiếp tục khởi động game', err);
    }
    startGame();
}

// Hàm khởi động game (Gom toàn bộ code init cũ vào đây)
async function startGame() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    console.log('Starting Game...');

    // 1. Kích hoạt Visuals (Nền gỗ + Cát bay)
    visualsManager = initVisualsSystem();

    // 2. Init Core Systems
    Renderer.init(canvas);
    HUD.init();
    InputHandler.init(canvas);
    ScoreSystem.init();
    Effects.init();

    Tabs.init();
    BottomNav.init();
    TopBar.init();
    UIAnimations.init();

    // Đặt tab mặc định là Home để tất cả UI (promo badges) hiển thị
    const homeBtn = document.querySelector('.nav-btn[data-target="tab-home"]');
    window.switchTab('tab-home', homeBtn);

    updateShopUI();
    updateCurrencyUI();

    // Initialize Leaderboard (async - load from cloud)
    await Leaderboard.init();

    // Init Lucky Wheel
    LuckyWheel.init();

    setGameObjectActive('menu-layer', true);
    setGameObjectActive('game-layer', false);
    setGameObjectActive('settings-menu', false);
    setGameObjectActive('pause-menu', false);

    // --- BRIDGE ---
    window.enterGame = () => {
        SoundManager.init();
        SoundManager.playClick();

        const menuLayer = document.getElementById('menu-layer');
        if (menuLayer) menuLayer.classList.add('fade-out');

        setTimeout(() => {
            setGameObjectActive('menu-layer', false);
            if (menuLayer) menuLayer.classList.remove('fade-out');
        }, 300);

        setGameObjectActive('game-layer', true);
        hideAllMenus();

        if (visualsManager) visualsManager.toggleFloatingBlocks(false);

        if (canvas) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            if (Renderer.resize) Renderer.resize();
            InputHandler.rect = canvas.getBoundingClientRect();
        }

        resetGameplayState();
        STATE.isPaused = false;

        // [NEW] Reset UI
        resetGiftLogic();

        Grid.init();
        Items.init();
        Dock.init();
        Dock.spawnPieces();

        GameLoop.start();
    };

    window.togglePause = () => {
        SoundManager.playClick();
        if (!STATE.isPaused) {
            GameLoop.pause();
            setGameObjectActive('pause-menu', true, true);
            setGameObjectActive('settings-menu', false);
            setGameObjectActive('pause-overlay', true);

            // Sync toggle states in pause panel
            updateToggleUI('game-btn-sound', STATE.settings.sound);
            updateToggleUI('game-btn-vfx', STATE.settings.vfx);
        } else {
            setGameObjectActive('pause-menu', false, true);
            setGameObjectActive('settings-menu', false, true);
            setGameObjectActive('pause-overlay', false, true);
            GameLoop.resume();
        }
    };

    window.openSettings = (source) => {
        SoundManager.playClick();
        if (source === 'pause') {
            // No separate settings panel for pause; keep current pause UI
            return;
        }
        setGameObjectActive('settings-menu', true, true);
        updateToggleUI('btn-sound', STATE.settings.sound);
        updateToggleUI('btn-vfx', STATE.settings.vfx);
    };

    window.closeSettings = (source) => {
        SoundManager.playClick();
        setGameObjectActive('settings-menu', false, true);
        if (!document.getElementById('game-layer').classList.contains('hidden') && STATE.isPaused) {
            setGameObjectActive('pause-menu', true, true);
        }
    };

    window.toggleSetting = (type) => {
        SoundManager.playClick();
        if (type === 'sound') {
            STATE.settings.sound = !STATE.settings.sound;
            updateToggleUI('btn-sound', STATE.settings.sound);
        } else if (type === 'vfx') {
            STATE.settings.vfx = !STATE.settings.vfx;
            updateToggleUI('btn-vfx', STATE.settings.vfx);
        }
        // Persist user preference immediately
        STATE.save();
    };

    // --- LOGIC MUA HÀNG (ĐÃ FIX) ---
    window.buyItem = (itemId) => {
        SoundManager.playClick();

        // 1. Kiểm tra giá
        const price = SHOP_PRICES[itemId];
        if (!price) {
            console.error("Lỗi: Item không tồn tại:", itemId);
            return;
        }

        // 2. Gọi hàm spendDiamonds từ State (Nó sẽ tự check tiền, trừ tiền và save)
        if (STATE.spendDiamonds(price)) {
            // --- MUA THÀNH CÔNG ---

            // 3. Cộng Item vào kho (State tự save)
            STATE.updateInventory(itemId, 1);

            // 4. Cập nhật UI ngay lập tức
            updateCurrencyUI();

            console.log(`Mua thành công ${itemId}. Còn lại: ${STATE.diamonds}`);
        } else {
            // --- KHÔNG ĐỦ TIỀN ---
            alert(`Không đủ kim cương! Cần ${price} 💎 để mua.`);
        }
    };

    window.buyRealMoneyItem = (packId) => {
        SoundManager.playClick();
        console.log(`Thanh toán: ${packId}`);
    };

    window.shopgame = () => {
        SoundManager.playClick();
        window.quitGame();
        const shopBtn = document.querySelector('.nav-btn[data-target="tab-shop"]');
        if (shopBtn) switchTab('tab-shop', shopBtn);
    };

    const performQuitToHome = () => {
        GameLoop.stop();
        hideAllMenus();
        setGameObjectActive('game-layer', false);
        setGameObjectActive('menu-layer', true);

        if (visualsManager) visualsManager.toggleFloatingBlocks(true);

        HUD.init();
    };

    window.quitGame = () => {
        SoundManager.playClick();
        // Show confirmation overlay instead of exiting immediately
        setGameObjectActive('quit-confirm', true, true);
        setGameObjectActive('pause-overlay', true);
    };

    window.cancelQuit = () => {
        SoundManager.playClick();
        setGameObjectActive('quit-confirm', false, true);
        // Keep pause overlay if paused
        if (STATE.isPaused) setGameObjectActive('pause-overlay', true);
    };

    window.confirmQuit = () => {
        SoundManager.playClick();
        setGameObjectActive('quit-confirm', false, true);
        setGameObjectActive('pause-menu', false, true);
        setGameObjectActive('pause-overlay', false, true);
        performQuitToHome();
    };

    function hideAllMenus() {
        setGameObjectActive('pause-menu', false);
        setGameObjectActive('settings-menu', false);
        setGameObjectActive('game-over', false);
        setGameObjectActive('pause-overlay', false);
    }

    function updateToggleUI(elementId, isActive) {
        const el = document.getElementById(elementId);
        if (!el) return;
        if (isActive) el.classList.add('active');
        else el.classList.remove('active');
    }

    function updateShopUI() {
        const noAdsItem = document.getElementById('shop-item-noads');
        if (noAdsItem && STATE.noAds) {
            noAdsItem.style.opacity = '0.6';
            noAdsItem.style.pointerEvents = 'none';
        }
    }

    // Lắng nghe sự kiện UI Update từ EventBus (để đồng bộ với State)
    EventBus.on('ui:updateDiamonds', () => updateCurrencyUI());


    // ... (existing imports)

    // --- QUÀ TẶNG PROGRESS ---
const GIFT_STEP = 100000;
let currentGiftTarget = GIFT_STEP;
let isGiftReady = false;
const GIFT_PARTICLE_POOL = [];
const getGiftParticle = () => GIFT_PARTICLE_POOL.pop() || document.createElement('div');
const recycleGiftParticle = (el) => {
    if (!el) return;
    el.remove();
    GIFT_PARTICLE_POOL.push(el);
};

    function resetGiftLogic() {
        currentGiftTarget = GIFT_STEP;
        isGiftReady = false;
        updateGiftProgress(0);
    }

    function updateGiftProgress(currentScore, color = null) {
        // [FIX] Milestone logic based on TRACKED Target
        // Prev Milestone = currentGiftTarget - GIFT_STEP

        const prevMilestone = currentGiftTarget - GIFT_STEP;
        const widthInStep = GIFT_STEP;

        // e.g. Target 200k. Prev 100k. Score 150k.
        // progress = 50k.
        let progressInStep = currentScore - prevMilestone;

        // If progress < 0, it means we recently reset target but score is lagging or new game?

        let percent = (progressInStep / widthInStep) * 100;

        // [FIX] Allow overflow > 100 visually for text, but clamp bar to 100
        const barPercent = Math.min(Math.max(percent, 0), 100);

        const fillEl = document.getElementById('gift-fill');
        const iconEl = document.getElementById('gift-icon');
        const textEl = document.getElementById('gift-text');
        const bgEl = document.querySelector('.gift-bar-bg');

        if (fillEl) {
            fillEl.style.width = `${barPercent}%`;
            // Dynamic color
            if (color) {
                fillEl.style.backgroundColor = color;
                fillEl.style.boxShadow = `0 0 10px ${color}`;
                fillEl.style.borderColor = color;
            }
        }

        if (textEl) textEl.innerText = `${currentScore.toLocaleString()} / ${currentGiftTarget.toLocaleString()}`;

        if (bgEl && currentScore > 0) {
            bgEl.classList.remove('pulse');
            void bgEl.offsetWidth;
            bgEl.classList.add('pulse');
        }

        // --- CHECK GIFT CLAIM ---
        // Trigger only when percent hits 100% (or reset happens logic)
        // Here we trigger when percent >= 100 AND not yet claimed
        if (percent >= 100 && !isGiftReady) {
            isGiftReady = true;
            if (iconEl) iconEl.classList.add('ready');

            // Auto Trigger for demo? Or user click?
            // Requirement: "khi đầy ... bay lại giữa màn hình ... xuất hiện vòng quay"
            // So auto trigger.
            setTimeout(() => triggerGiftSequence(), 1000); // Delay 1s to let animation finish
        } else if (percent < 100) {
            isGiftReady = false;
            if (iconEl) iconEl.classList.remove('ready');
        }
    }

    function triggerGiftSequence() {
        // 1. Pause Game
        if (!STATE.isPaused) {
            GameLoop.pause();
        }

        // 2. Dim Background
        const backdrop = document.createElement('div');
        backdrop.className = 'gift-focus-backdrop';
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('active'));

        // 3. Fly Animation
        const giftIcon = document.getElementById('gift-icon');
        const rect = giftIcon.getBoundingClientRect();

        const flyer = document.createElement('div');
        flyer.innerText = '🎁';
        flyer.className = 'flying-gift';
        flyer.style.left = rect.left + 'px';
        flyer.style.top = rect.top + 'px';
        document.body.appendChild(flyer);

        SoundManager.playMatch(4); // Whoosh sound

        // Phase 1: Fly to center
        setTimeout(() => {
            flyer.style.left = '50%';
            flyer.style.top = '50%';
            flyer.style.transform = 'translate(-50%, -50%) scale(2)';
        }, 50);

        // Phase 2: Scale UP then SHRINK to a point
        setTimeout(() => {
            // Scale UP big
            flyer.style.transition = 'transform 0.3s ease-out';
            flyer.style.transform = 'translate(-50%, -50%) scale(3)';
        }, 800);

        setTimeout(() => {
            // SHRINK to point
            flyer.style.transition = 'transform 0.2s ease-in';
            flyer.style.transform = 'translate(-50%, -50%) scale(0.1)';
        }, 1100);

        // Phase 3: BOOM & Particles
        setTimeout(() => {
            flyer.style.opacity = '0';
            SoundManager.playMatch(5); // Boom sound

            // Spawn Particles (pooled to avoid DOM churn)
            const particleCount = 140;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            // Neon Colors
            const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF3333', '#33FF33', '#3399FF', '#FF9933', '#FFFFFF'];

            for (let i = 0; i < particleCount; i++) {
                const p = getGiftParticle();
                p.className = 'gift-particle';
                p.style.opacity = '1';
                p.style.transform = 'translate(0px, 0px) scale(1)';

                // Random Size (Sand-like)
                const size = 3 + Math.random() * 7;
                p.style.width = size + 'px';
                p.style.height = size + 'px';

                p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                p.style.left = centerX + 'px';
                p.style.top = centerY + 'px';
                document.body.appendChild(p);

                // Random angle & distance (Full firework burst)
                const angle = Math.random() * Math.PI * 2;
                const velocity = 60 + Math.random() * 380;

                // Animate (slower via CSS transition)
                setTimeout(() => {
                    const tx = Math.cos(angle) * velocity;
                    const ty = Math.sin(angle) * velocity;
                    p.style.transform = `translate(${tx}px, ${ty}px) scale(0.1)`;
                    p.style.opacity = '0';
                }, 10);

                // Cleanup (longer for slower animation)
                setTimeout(() => recycleGiftParticle(p), 4000);
            }

            // Phase 4: Open Wheel & Cleanup
            setTimeout(() => {
                LuckyWheel.open();
                flyer.remove();
                backdrop.classList.remove('active');
                setTimeout(() => backdrop.remove(), 500);
            }, 1000);

        }, 1300); // After shrink
    }

    // Listen for Wheel Close to Resume
    EventBus.on('WHEEL_CLOSED', () => {
        // Increment Target ONLY when wheel closes
        currentGiftTarget += GIFT_STEP;
        isGiftReady = false;

        // Redraw bar with new target (will drop from 100% to X%)
        updateGiftProgress(STATE.currentScore || ScoreSystem.score || 0);

        GameLoop.resume();
    });

    // Connect Gift Logic to Score Loop

    // Connect Gift Logic to Score Loop
    EventBus.on(EVENTS.SCORE_UPDATED, async (data) => {
        // Handle both number (legacy) and object (new physics) payloads
        const score = typeof data === 'number' ? data : data.score;
        const color = data.color || null;

        updateGiftProgress(score, color);

        // Kiểm tra nếu điểm mới > điểm cao nhất session
        if (score > Leaderboard.currentSessionHighScore) {
            Leaderboard.currentSessionHighScore = score;
            console.log(`[Session] 🎯 New high score: ${score}`);

            // TỰ ĐỘNG LƯU NGAY khi vượt qua kỷ lục
            await Leaderboard.setScore(score, { incrementGame: false });
            console.log(`[Session] 💾 Auto-saved high score: ${score}`);
        }
    });

    // --- GAME OVER HANDLER (QUAN TRỌNG) ---
    EventBus.on(EVENTS.GAME_OVER, () => {
        console.log("🔴 GAME OVER Triggered in Main");

        // 1. Dừng game
        GameLoop.stop();
        SoundManager.playGameOver();

        // 2. Cập nhật điểm số cuối cùng (Format số có dấu phẩy)
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) {
            const score = ScoreSystem.score || STATE.currentScore || 0;
            finalScoreEl.innerText = score.toLocaleString();
        }

        // 3. Hiển thị Panel (Khớp với ID trong index.html)
        setGameObjectActive('game-over', true);

        // 4. [NEW] Lưu điểm lên Leaderboard
        Leaderboard.setScore(ScoreSystem.score || STATE.currentScore || 0);
    });

    console.log('Sandtrix Ready & Synced.');
}

// Logic kiểm tra môi trường
window.onload = function () {
    // Kiểm tra xem có đang chạy trên máy tính (Live Server) không
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocal) {
        console.log("Đang chạy trên Localhost - Bỏ qua Facebook SDK");
        bootGame(); // Chạy game sau khi preload
    } else {
        console.log("Đang chạy trên Facebook - Đợi SDK");
        // Nếu không phải localhost thì chạy quy trình của Facebook
        FBInstant.initializeAsync()
            .then(function () {
                FBInstant.setLoadingProgress(100);
                FBInstant.startGameAsync().then(function () {
                    bootGame(); // Chạy game sau khi FB đã sẵn sàng + preload
                });
            })
            .catch(function (err) {
                console.error("Lỗi SDK:", err);
                // Phòng hờ lỗi SDK thì vẫn cố gắng chạy game
                bootGame();
            });
    }
};

/* =========================================================================
   INTERNAL VISUALS SYSTEM (Tích hợp từ UISand.html)
   ========================================================================= */
function initVisualsSystem() {
    const woodCanvas = document.getElementById('wood-canvas');
    const sandCanvas = document.getElementById('sand-blocks-canvas');

    if (!woodCanvas || !sandCanvas) {
        return { toggleFloatingBlocks: () => { } };
    }

    const woodCtx = woodCanvas.getContext('2d', { alpha: false });
    const sandCtx = sandCanvas.getContext('2d');

    let width = 0, height = 0;

    // Config
    const PI = Math.PI, PI2 = PI * 2;
    const sin = Math.sin, cos = Math.cos, rand = Math.random;
    const BLOCK_FULL_SIZE = 24;
    const GRID_SIZE = 8;

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function createOffscreenCanvas(w, h) {
        const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    }

    // --- 1. Draw Wood (Soft Vignette Effect) ---
    function drawWood() {
        woodCtx.fillStyle = '#D4A574';
        woodCtx.fillRect(0, 0, width, height);
        woodCtx.strokeStyle = 'rgba(100, 60, 20, 0.15)';
        woodCtx.lineWidth = 2;
        woodCtx.beginPath();
        for (let y = 0; y < height; y += 8 + rand() * 12) {
            woodCtx.moveTo(0, y);
            let x = 0;
            while (x < width) {
                woodCtx.quadraticCurveTo(x + 20 + rand() * 40, y + (rand() - 0.5) * 6, x + 40 + rand() * 60, y + (rand() - 0.5) * 4);
                x += 60;
            }
        }
        woodCtx.stroke();

        const cx = width / 2;
        const cy = height * 0.25;
        const r = Math.max(width, height) * 0.9;

        const v = woodCtx.createRadialGradient(cx, cy, 10, cx, cy, r);
        v.addColorStop(0, 'rgba(255, 255, 240, 0.08)');
        v.addColorStop(0.5, 'rgba(124, 62, 3, 0.26)');
        v.addColorStop(1, 'rgba(0, 0, 0, 0.44)');

        woodCtx.fillStyle = v;
        woodCtx.fillRect(0, 0, width, height);
    }

    // --- 2. Menu Animation ---
    let fixedBlocks = [];
    let animationId = null;
    let lastTime = 0;
    const FPS_INTERVAL = 1000 / 30; // Limit 30 FPS

    const BLOCK_SHAPES = { I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], L: [[0, 0], [0, 1], [0, 2], [1, 2]], J: [[1, 0], [1, 1], [1, 2], [0, 2]] };
    const shapeKeys = Object.keys(BLOCK_SHAPES);
    const blockSprites = {}, shadowSprites = {};
    const BLOCK_COLORS = [{ main: '#4CAF50', light: '#81C784', dark: '#2E7D32' }, { main: '#FF69B4', light: '#FFB6C1', dark: '#C2185B' }, { main: '#9D5CFF', light: '#D1C4E9', dark: '#6A1B9A' }, { main: '#5DADE2', light: '#AED6F1', dark: '#1565C0' }, { main: '#FFD93D', light: '#FFF59D', dark: '#FF8F00' }, { main: '#FF8C42', light: '#FFCCBC', dark: '#D84315' }];

    function preRender() {
        shapeKeys.forEach(k => {
            const sh = BLOCK_SHAPES[k];
            let mx = 0, my = 0; sh.forEach(p => { if (p[0] > mx) mx = p[0]; if (p[1] > my) my = p[1]; });
            const w = (mx + 1) * BLOCK_FULL_SIZE, h = (my + 1) * BLOCK_FULL_SIZE;
            const sC = createOffscreenCanvas(w, h), sCx = sC.getContext('2d');
            sCx.fillStyle = '#3E2723'; sh.forEach(p => sCx.fillRect(p[0] * 24 + 6, p[1] * 24 + 6, 24, 24));
            shadowSprites[k] = sC;
            blockSprites[k] = [];
            BLOCK_COLORS.forEach(c => {
                const bC = createOffscreenCanvas(w, h), bCx = bC.getContext('2d');
                sh.forEach(p => {
                    const x = p[0] * 24, y = p[1] * 24;
                    for (let i = 0; i < 8; i++)for (let j = 0; j < 8; j++) {
                        bCx.fillStyle = c.main; bCx.fillRect(x + i * 3, y + j * 3, 3, 3);
                        bCx.fillStyle = c.light; bCx.fillRect(x + i * 3, y + j * 3, 3, 1); bCx.fillRect(x + i * 3, y + j * 3, 1, 3);
                        bCx.fillStyle = c.dark; bCx.fillRect(x + i * 3, y + j * 3 + 2.1, 3, 1); bCx.fillRect(x + i * 3 + 2.1, y + j * 3, 1, 3);
                    }
                });
                blockSprites[k].push(bC);
            });
        });
    }

    function createBlocks() {
        fixedBlocks = [];
        const rows = 8, startY = 85, endY = height - 140, step = (endY - startY) / rows;
        for (let i = 0; i <= rows; i++) {
            const y = startY + i * step;
            addBlock((rand() * 0.2 + 0.02) * width, y + (rand() - 0.5) * 40, i);
            addBlock((rand() * 0.2 + 0.78) * width, y + (rand() - 0.5) * 40, i + 100);
        }
    }

    function addBlock(x, y, i) {
        if (x < -30 || x > width + 30 || y < -30 || y > height + 30) return;
        const key = shapeKeys[i % shapeKeys.length];
        fixedBlocks.push({ x: x, y: y, sc: 0.7 + rand() * 0.4, rot: (rand() - 0.5) * 0.5, off: rand() * PI2, spd: 0.2 + rand() * 0.4, spr: blockSprites[key][i % BLOCK_COLORS.length], shd: shadowSprites[key] });
    }

    function animate(time) {
        animationId = requestAnimationFrame(animate);
        const elapsed = time - lastTime;
        if (elapsed < FPS_INTERVAL) return;
        lastTime = time - (elapsed % FPS_INTERVAL);

        sandCtx.clearRect(0, 0, width, height);
        const t = time * 0.001;
        fixedBlocks.forEach(b => {
            const fy = sin(t * b.spd + b.off) * 5;
            const fx = cos(t * b.spd * 0.7 + b.off) * 3;
            const fr = sin(t * b.spd * 0.5 + b.off) * 0.05;
            sandCtx.setTransform(b.sc, 0, 0, b.sc, b.x + fx, b.y + fy);
            sandCtx.rotate(b.rot + fr);
            sandCtx.globalAlpha = 0.3; sandCtx.drawImage(b.shd, 0, 0);
            sandCtx.globalAlpha = 1.0; sandCtx.drawImage(b.spr, 0, 0);
        });
        sandCtx.setTransform(1, 0, 0, 1, 0, 0);
    }

    function resize() {
        if (!woodCanvas.parentElement) return;
        width = woodCanvas.parentElement.offsetWidth;
        height = woodCanvas.parentElement.offsetHeight;
        woodCanvas.width = width; woodCanvas.height = height;
        sandCanvas.width = width; sandCanvas.height = height;
        drawWood();
        createBlocks();
    }

    preRender();
    resize();
    window.addEventListener('resize', debounce(resize, 200));
    requestAnimationFrame(animate);

    return {
        toggleFloatingBlocks: (isActive) => {
            sandCanvas.style.opacity = isActive ? "1" : "0";
        }
    };
}
