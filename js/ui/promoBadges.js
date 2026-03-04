const BG_IMAGE_SRC = 'Asset/Shop/Background-Bundle/Background_Bundle.png';
const promoBadgeData = {
    left: [
        { title: 'Daily', subtitle: 'Bonus', colors: ['#f9d65c', '#f2a93f'] },
        { title: 'Daily', subtitle: 'Quest', colors: ['#ffb86c', '#ff8a5c'] }
    ],
    right: [
        { title: 'No', subtitle: 'Ads', colors: ['#6fd4ff', '#3498db'] },
        { title: 'Starter', subtitle: 'Pack', colors: ['#d49bff', '#9b59b6'] }
    ]
};

function drawPromoColumn(canvas, items, bgImg) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const cssW = 120;
    const btnSize = 75;
    const gap = 18;
    const cssH = items.length * (btnSize + gap) + 10;

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const startY = 10;
    const startX = (cssW - btnSize) / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    items.forEach((item, idx) => {
        const y = startY + idx * (btnSize + gap);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 8;
        drawCircle(ctx, startX + btnSize / 2, y + btnSize / 2, btnSize / 2);
        
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.save();
            ctx.clip();
            ctx.drawImage(bgImg, startX, y, btnSize, btnSize);
            ctx.restore();
        } else {
            const grad = ctx.createLinearGradient(0, y, 0, y + btnSize);
            grad.addColorStop(0, item.colors[0]);
            grad.addColorStop(1, item.colors[1]);
            ctx.fillStyle = grad;
            ctx.fill();
        }
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Fredoka, sans-serif';
        ctx.fillText(item.title, startX + btnSize / 2, y + btnSize / 2 - 8);
        ctx.font = 'bold 12px Fredoka, sans-serif';
        ctx.fillText(item.subtitle, startX + btnSize / 2, y + btnSize / 2 + 10);
        ctx.restore();
    });
}

function drawCircle(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
}

export function initPromoBadges() {
    const leftCanvas = document.getElementById('promo-badges-left');
    const rightCanvas = document.getElementById('promo-badges-right');
    const img = new Image();
    img.onload = () => {
        drawPromoColumn(leftCanvas, promoBadgeData.left, img);
        drawPromoColumn(rightCanvas, promoBadgeData.right, img);
    };
    img.onerror = () => {
        drawPromoColumn(leftCanvas, promoBadgeData.left, null);
        drawPromoColumn(rightCanvas, promoBadgeData.right, null);
    };
    img.src = BG_IMAGE_SRC;
}
