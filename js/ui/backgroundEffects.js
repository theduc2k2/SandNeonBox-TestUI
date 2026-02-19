// /**
//  * BACKGROUND EFFECTS - Wood Texture & Floating Sand Blocks
//  * RESPONSIBILITY: Vẽ nền gỗ tĩnh và Animation các khối cát bay ở menu.
//  * THEME: SANDTRIX (Wood & Sand)
//  */

// export class BackgroundEffects {
//     constructor() {
//         // 1. Canvas cho nền gỗ tĩnh (Vẽ 1 lần)
//         this.woodCanvas = document.getElementById('wood-canvas');
//         this.woodCtx = this.woodCanvas ? this.woodCanvas.getContext('2d', { alpha: false }) : null;

//         // 2. Canvas cho hiệu ứng bay (Animation liên tục)
//         this.sandCanvas = document.getElementById('sand-blocks-canvas');
//         this.sandCtx = this.sandCanvas ? this.sandCanvas.getContext('2d') : null;

//         this.width = 0;
//         this.height = 0;
//         this.animationId = null;
        
//         this.fixedBlocks = [];
//         this.blockSprites = {};
//         this.shadowSprites = {};
        
//         // Cấu hình khối Pixel
//         this.BLOCK_FULL_SIZE = 24; 
//         this.GRID_SIZE = 8;
        
//         // Bảng màu Sandtrix
//         this.BLOCK_COLORS = [
//             { main: '#4CAF50', light: '#81C784', dark: '#2E7D32' }, // Xanh lá
//             { main: '#FF69B4', light: '#FFB6C1', dark: '#C2185B' }, // Hồng
//             { main: '#9D5CFF', light: '#D1C4E9', dark: '#6A1B9A' }, // Tím
//             { main: '#5DADE2', light: '#AED6F1', dark: '#1565C0' }, // Xanh biển
//             { main: '#FFD93D', light: '#FFF59D', dark: '#FF8F00' }, // Vàng
//             { main: '#FF8C42', light: '#FFCCBC', dark: '#D84315' }, // Cam
//         ];

//         this.BLOCK_SHAPES = {
//             I: [[0,0], [1,0], [2,0], [3,0]], 
//             O: [[0,0], [1,0], [0,1], [1,1]],
//             T: [[0,0], [1,0], [2,0], [1,1]], 
//             S: [[1,0], [2,0], [0,1], [1,1]],
//             Z: [[0,0], [1,0], [1,1], [2,1]], 
//             L: [[0,0], [0,1], [0,2], [1,2]],
//             J: [[1,0], [1,1], [1,2], [0,2]]
//         };
        
//         this.shapeKeys = Object.keys(this.BLOCK_SHAPES);
//     }
    
//     /**
//      * Khởi tạo hiệu ứng
//      */
//     init() {
//         if (!this.woodCanvas && !this.sandCanvas) return;
        
//         // Vẽ trước các khối ra ảnh (Tối ưu hiệu năng)
//         this.preRenderSprites();
        
//         this.resize();
//         window.addEventListener('resize', () => this.resize());
        
//         // Tạo danh sách khối bay
//         this.createFloatingBlocks();
        
//         // Bắt đầu Animation
//         this.animate();
//     }
    
//     /**
//      * Xử lý khi thay đổi kích thước màn hình
//      */
//     resize() {
//         const parent = this.woodCanvas?.parentElement || document.body;
//         this.width = parent.offsetWidth;
//         this.height = parent.offsetHeight;

//         // Resize Wood Canvas
//         if (this.woodCanvas) {
//             this.woodCanvas.width = this.width;
//             this.woodCanvas.height = this.height;
//             this.drawWoodTexture(); // Vẽ lại vân gỗ
//         }

//         // Resize Animation Canvas
//         if (this.sandCanvas) {
//             this.sandCanvas.width = this.width;
//             this.sandCanvas.height = this.height;
//         }
//     }

//     /**
//      * Vẽ nền gỗ (Chỉ chạy 1 lần khi init hoặc resize)
//      */
//     drawWoodTexture() {
//         if (!this.woodCtx) return;
//         const w = this.width;
//         const h = this.height;
//         const ctx = this.woodCtx;
//         const rand = Math.random;

//         // Màu nền cơ bản
//         ctx.fillStyle = '#D4A574';
//         ctx.fillRect(0, 0, w, h);

//         // Vẽ vân gỗ
//         ctx.strokeStyle = 'rgba(139, 90, 43, 0.2)';
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         for (let y = 0; y < h; y += 8 + rand() * 12) {
//             ctx.moveTo(0, y);
//             let x = 0;
//             while (x < w) {
//                 ctx.quadraticCurveTo(
//                     x + 20 + rand() * 40, 
//                     y + (rand() - 0.5) * 10, 
//                     x + 40 + rand() * 60, 
//                     y + (rand() - 0.5) * 5
//                 );
//                 x += 60;
//             }
//         }
//         ctx.stroke();

//         // Hiệu ứng tối góc (Vignette)
//         const vignette = ctx.createLinearGradient(0, 0, w, 0);
//         vignette.addColorStop(0, 'rgba(60, 40, 20, 0.4)');
//         vignette.addColorStop(0.2, 'rgba(60, 40, 20, 0.1)');
//         vignette.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
//         vignette.addColorStop(0.8, 'rgba(60, 40, 20, 0.1)');
//         vignette.addColorStop(1, 'rgba(60, 40, 20, 0.4)');
        
//         ctx.fillStyle = vignette;
//         ctx.fillRect(0, 0, w, h);
//     }
    
//     /**
//      * Tạo các khối bay ngẫu nhiên
//      */
//     createFloatingBlocks() {
//         this.fixedBlocks = [];
//         const rows = 8;
//         const startY = 85; 
//         const endY = this.height - 140;
//         const step = (endY - startY) / rows;

//         for (let i = 0; i <= rows; i++) {
//             const y = startY + i * step;
//             // Bên trái
//             this.addBlock((Math.random() * 0.2 + 0.02) * this.width, y + (Math.random() - 0.5) * 40, i);
//             // Bên phải
//             this.addBlock((Math.random() * 0.2 + 0.78) * this.width, y + (Math.random() - 0.5) * 40, i + 100);
//         }
//     }

//     addBlock(x, y, i) {
//         const key = this.shapeKeys[i % this.shapeKeys.length];
//         this.fixedBlocks.push({
//             x: x, 
//             y: y,
//             sc: 0.7 + Math.random() * 0.4, // Scale
//             rot: (Math.random() - 0.5) * 0.5, // Rotation base
//             off: Math.random() * Math.PI * 2, // Offset animation
//             spd: 0.2 + Math.random() * 0.4,   // Speed
//             spr: this.blockSprites[key][i % this.BLOCK_COLORS.length], // Sprite ảnh
//             shd: this.shadowSprites[key] // Sprite bóng
//         });
//     }
    
//     /**
//      * Vòng lặp Animation
//      */
//     animate() {
//         if (!this.sandCtx) return;
        
//         this.sandCtx.clearRect(0, 0, this.width, this.height);
//         const t = Date.now() * 0.001;
//         const sin = Math.sin;
//         const cos = Math.cos;

//         this.fixedBlocks.forEach(b => {
//             // Tính toán chuyển động lơ lửng
//             const fy = sin(t * b.spd + b.off) * 5;
//             const fx = cos(t * b.spd * 0.7 + b.off) * 3;
//             const fr = sin(t * b.spd * 0.5 + b.off) * 0.05;
            
//             // Vẽ bóng và khối
//             this.sandCtx.setTransform(b.sc, 0, 0, b.sc, b.x + fx, b.y + fy);
//             this.sandCtx.rotate(b.rot + fr);
            
//             this.sandCtx.globalAlpha = 0.3;
//             this.sandCtx.drawImage(b.shd, 0, 0); // Vẽ bóng
            
//             this.sandCtx.globalAlpha = 1.0;
//             this.sandCtx.drawImage(b.spr, 0, 0); // Vẽ khối
//         });
        
//         // Reset transform
//         this.sandCtx.setTransform(1, 0, 0, 1, 0, 0);
        
//         this.animationId = requestAnimationFrame(() => this.animate());
//     }
    
//     /**
//      * Vẽ trước các khối ra Canvas ảo (Offscreen Canvas) để tối ưu FPS
//      */
//     preRenderSprites() {
//         this.shapeKeys.forEach(key => {
//             const shape = this.BLOCK_SHAPES[key];
//             let maxX = 0, maxY = 0;
//             shape.forEach(([x, y]) => { if(x>maxX) maxX=x; if(y>maxY) maxY=y; });
            
//             const w = (maxX + 1) * this.BLOCK_FULL_SIZE + 10;
//             const h = (maxY + 1) * this.BLOCK_FULL_SIZE + 10;
            
//             // 1. Vẽ Bóng Đổ
//             const sC = document.createElement('canvas'); sC.width = w; sC.height = h;
//             const sCtx = sC.getContext('2d');
//             sCtx.fillStyle = '#3E2723';
//             shape.forEach(([cx, cy]) => {
//                 sCtx.fillRect(cx * this.BLOCK_FULL_SIZE + 6, cy * this.BLOCK_FULL_SIZE + 6, this.BLOCK_FULL_SIZE, this.BLOCK_FULL_SIZE);
//             });
//             this.shadowSprites[key] = sC;
            
//             // 2. Vẽ Khối Chính
//             this.blockSprites[key] = [];
//             this.BLOCK_COLORS.forEach(c => {
//                 const bC = document.createElement('canvas'); bC.width = w; bC.height = h;
//                 const bCtx = bC.getContext('2d');
//                 shape.forEach(([cx, cy]) => {
//                     const x = cx * this.BLOCK_FULL_SIZE;
//                     const y = cy * this.BLOCK_FULL_SIZE;
//                     // Vẽ pixel art giả lập cát
//                     for (let i = 0; i < this.GRID_SIZE; i++) {
//                         for (let j = 0; j < this.GRID_SIZE; j++) {
//                             const px = x + i * 3, py = y + j * 3;
//                             bCtx.fillStyle = c.main; bCtx.fillRect(px, py, 3, 3);
//                             // Highlight
//                             bCtx.fillStyle = c.light; bCtx.fillRect(px, py, 3, 1); bCtx.fillRect(px, py, 1, 3);
//                             // Shadow
//                             bCtx.fillStyle = c.dark; bCtx.fillRect(px, py + 2.1, 3, 1); bCtx.fillRect(px + 2.1, py, 1, 3);
//                         }
//                     }
//                 });
//                 this.blockSprites[key].push(bC);
//             });
//         });
//     }
    
//     /**
//      * Dừng/Bật animation (Gọi khi vào/ra game để tối ưu)
//      */
//     toggle(isActive) {
//         if (this.sandCanvas) {
//             this.sandCanvas.style.opacity = isActive ? "1" : "0";
//         }
//         if (!isActive && this.animationId) {
//             // Có thể chọn pause animation loop tại đây nếu muốn tiết kiệm pin tối đa
//             // cancelAnimationFrame(this.animationId);
//         }
//     }
// }