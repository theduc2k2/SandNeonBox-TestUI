/**
 * /scripts/game/dock.js
 * RESPONSIBILITY: Manage Spawning Pieces with Shimmer Colors.
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { Renderer } from './renderer.js';

// Định nghĩa các hình dáng Tetromino
const SHAPES = [
    [[0, 0], [0, 1], [0, 2], [0, 3]], // I
    [[0, 0], [1, 0], [2, 0], [3, 0]], // I ngang
    [[0, 0], [1, 0], [0, 1], [1, 1]], // O (Vuông)
    [[0, 0], [-1, 0], [1, 0], [0, 1]], // T
    [[0, 0], [-1, 0], [0, 1], [-1, 1]], // S
    [[0, 0], [1, 0], [0, 1], [1, 1]], // Z
    [[0, 0], [0, 1], [0, 2], [1, 2]], // L
    [[0, 0], [0, 1], [0, 2], [-1, 2]], // J
];

class Piece {
    constructor(type, colors) {
        this.type = type;
        this.shape = SHAPES[type];
        this.parts = [];
        
        let colorList = Array.isArray(colors) ? colors : [colors];
        let minX = 1000, maxX = -1000, minY = 1000, maxY = -1000;

        // Tạo các hạt cát cho khối gạch
        this.shape.forEach(([gx, gy], blockIndex) => {
            // Xác định màu gốc cho khối này (để logic game check match)
            let baseColor = colorList[blockIndex % colorList.length];

            for (let i = 0; i < CONFIG.BLOCK_SIZE; i++) {
                for (let j = 0; j < CONFIG.BLOCK_SIZE; j++) {
                    let px = (gx * CONFIG.BLOCK_SIZE * CONFIG.PARTICLE_SIZE) + (i * CONFIG.PARTICLE_SIZE);
                    let py = (gy * CONFIG.BLOCK_SIZE * CONFIG.PARTICLE_SIZE) + (j * CONFIG.PARTICLE_SIZE);
                    
                    // [QUAN TRỌNG] Lấy màu hiển thị (shimmer) khác với màu gốc
                    let visualColor = CONFIG.getShimmerColor(baseColor);

                    this.parts.push({ 
                        dx: px, 
                        dy: py, 
                        color: visualColor, // Màu vẽ (Lấp lánh)
                        baseColor: baseColor // Màu logic (Đồng nhất)
                    });

                    if (px < minX) minX = px;
                    if (px > maxX) maxX = px;
                    if (py < minY) minY = py;
                    if (py > maxY) maxY = py;
                }
            }
        });

        this.width = maxX - minX + CONFIG.PARTICLE_SIZE;
        this.height = maxY - minY + CONFIG.PARTICLE_SIZE;
        
        // Căn chỉnh về gốc 0,0
        this.parts.forEach(p => { 
            p.dx -= minX; 
            p.dy -= minY; 
        });
        
        this.x = 0;
        this.y = 0;
    }
}

export const Dock = {
    init() {
        this.spawnPieces();
    },

    spawnPieces() {
        for (let i = 0; i < 3; i++) {
            if (!STATE.dockPieces[i]) {
                let type = Math.floor(Math.random() * SHAPES.length);
                
                // Logic chọn màu (Đơn sắc hoặc Đa sắc)
                let pieceColors;
                if (Math.random() < 0.3) { // 30% cơ hội ra gạch 2 màu
                    let c1 = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                    let c2 = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                    while (c1 === c2) c2 = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                    pieceColors = [c1, c2];
                } else {
                    pieceColors = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                }

                STATE.dockPieces[i] = new Piece(type, pieceColors);
            }
        }
        console.log('[Dock] Spawned pieces');
    }
};