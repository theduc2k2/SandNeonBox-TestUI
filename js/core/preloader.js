// RESPONSIBILITY: Preload images/audio before showing UI. Keeps theme untouched.

const DEFAULT_ASSETS = [
    'Asset/BackGround/Background.png',
    'Asset/Shop/Background-Bundle/Background_Bundle.png',
    'Asset/Shop/Button-Bundle/Button-Bundle.png',
    'Asset/Shop/Background-Bundle/Button-Bundle.png', // fallback naming just in case
    'Asset/icons/icon-64.png'
];

function wait(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function updateProgress(percent) {
    const bar = document.getElementById('loading-bar-fill');
    const text = document.getElementById('loading-percent');
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

export const Preloader = {
    DEFAULT_ASSETS,
    preloadAssets,
    updateProgress,
    showOverlay,
    hideOverlay,
    async run(assets = DEFAULT_ASSETS) {
        showOverlay();
        await preloadAssets(assets, updateProgress);
        await hideOverlay();
    }
};
