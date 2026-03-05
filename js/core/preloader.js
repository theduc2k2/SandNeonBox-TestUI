// RESPONSIBILITY: Preload images/audio before showing UI. Keeps theme untouched.

const DEFAULT_ASSETS = [
    'Asset/BackGround/Background.png',
    'Asset/Shop/Background-Bundle/Background_Bundle.png',
    'Asset/Shop/Button-Bundle/Button-Bundle.png',
    'Asset/icons/icon-64.png'
];

function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}

let displayPercent = 0;
let targetPercent = 0;
let progressTimer = null;

function updateProgress(percent) {
    const bar = document.getElementById('loading-bar-fill');
    const text = document.getElementById('loading-percent');
    targetPercent = Math.max(targetPercent, percent);

    const step = () => {
        if (displayPercent >= targetPercent) {
            clearInterval(progressTimer);
            progressTimer = null;
            return;
        }
        displayPercent = Math.min(displayPercent + 5, targetPercent);
        if (bar) bar.style.width = `${displayPercent}%`;
        if (text) text.textContent = `${displayPercent}%`;
    };

    if (!progressTimer) {
        progressTimer = setInterval(step, 90); // slow the visual fill
    }
    // also update immediately for the first frame
    step();
}

function forceProgress(percent) {
    const bar = document.getElementById('loading-bar-fill');
    const text = document.getElementById('loading-percent');
    displayPercent = percent;
    targetPercent = percent;
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
}

async function preloadAssets(assets = DEFAULT_ASSETS, onProgress = updateProgress) {
    const list = Array.from(new Set(assets)).filter(Boolean);
    if (list.length === 0) {
        onProgress(100);
        return;
    }

    let loaded = 0;
    const total = list.length;

    const loadOne = (src) => new Promise(resolve => {
        const img = new Image();
        const done = () => {
            loaded++;
            const percent = Math.round((loaded / total) * 100);
            onProgress(percent);
            resolve();
        };
        img.onload = done;
        img.onerror = done;
        img.src = src;
    });

    await Promise.all(list.map(loadOne));
}

async function hideOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.classList.add('fade-out');
    await wait(550);
    overlay.style.display = 'none';
}

function showOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.remove('fade-out');
    updateProgress(0);
}

const MIN_LOAD_DURATION_MS = 3800; // target 3.8s visible loading

export const Preloader = {
    DEFAULT_ASSETS,
    preloadAssets,
    updateProgress,
    showOverlay,
    hideOverlay,
    async run(assets = DEFAULT_ASSETS) {
        document.body.classList.add('loading-active');
        showOverlay();
        const start = performance.now();
        await preloadAssets(assets, updateProgress);
        const elapsed = performance.now() - start;
        const remain = Math.max(0, MIN_LOAD_DURATION_MS - elapsed);
        if (remain > 0) {
            await wait(remain);
        }
        // ensure bar reaches 100 visually
        forceProgress(100);
        await hideOverlay();
        document.body.classList.remove('loading-active');
    }
};
