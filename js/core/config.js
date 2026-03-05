/**
 * /scripts/core/config.js
 * * RESPONSIBILITY:
 * Define all immutable constants for the game.
 * Must match the variable names expected by Grid and Renderer.
 */

export const CONFIG = {
    // --- DIMENSIONS & SCALING (QUAN TRỌNG: Dùng chữ in hoa) ---
    BOARD_WIDTH: 320,     // Tên cũ: boardW
    BOARD_HEIGHT: 420,    // Tên cũ: boardH
    DOCK_HEIGHT: 120,     // Tên cũ: dockH
    PARTICLE_SIZE: 3,     // Tên cũ: pSize
    BLOCK_SIZE: 8,        // Tên cũ: blockSize

    // --- PHYSICS CONSTANTS ---
    GRAVITY: 0.25,
    FRICTION: 0.99,
    MAX_VELOCITY: 8.0,
<<<<<<< HEAD
=======
    SAND_UPDATES_PER_FRAME: 2, // Number of sand simulation passes each frame (speed up fall)
>>>>>>> Test
    
    // --- GAMEPLAY MECHANICS ---
    DANGER_Y: 100,
    STABILITY_THRESHOLD: 15,
    TEXTURE_CHANCE: 0.3,
    
    // Item specific configs
    BOMB_RADIUS: 45,
    BLAST_RADIUS: 120,
    VORTEX_DURATION: 240,

    // --- VISUALS & THEME ---
    COLORS: [
        '#4ECDC4', // Mint
        '#FF6B6B', // Coral Red
        '#FFE66D', // Pastel Yellow
        '#5DADE2', // Sky Blue
        '#FF8C42', // Orange
        '#AC66CC'  // Purple
    ],
    
    // Helper to generate variants
    COLOR_VARIANTS: {
        '#4ECDC4': ['#4ECDC4', '#7EDBD4', '#2AB7AE'],
        '#FF6B6B': ['#FF6B6B', '#FF8E8E', '#E64C4C'],
        '#FFE66D': ['#FFE66D', '#FFF0A0', '#E6CC40'],
        '#5DADE2': ['#5DADE2', '#85C1E9', '#3498DB'],
        '#FF8C42': ['#FF8C42', '#FFA66E', '#E67E22'],
        '#AC66CC': ['#AC66CC', '#BE86D6', '#8E44AD']
    },

    // --- STORAGE KEYS ---
    STORAGE_KEYS: {
        HIGH_SCORE: 'sandtrix_highscore',
        DIAMONDS: 'sandtrix_diamonds',
        INVENTORY_BOMB: 'sandtrix_bombs',
        INVENTORY_ERASER: 'sandtrix_erasers',
        INVENTORY_VORTEX: 'sandtrix_vortex',
        SETTINGS_SOUND: 'sandtrix_sound',
        SETTINGS_VFX: 'sandtrix_vfx'
    },
    getShimmerColor(baseColor) {
        // Tỉ lệ ra màu gốc cao nhất để giữ bản sắc
        if (Math.random() > this.TEXTURE_CHANCE) return baseColor;

        const variants = this.COLOR_VARIANTS[baseColor];
        if (!variants) return baseColor;

        // Random ra một màu trong dải biến thể (Sáng/Tối/Trắng)
        return variants[Math.floor(Math.random() * variants.length)];
    }
<<<<<<< HEAD
};
=======
};
>>>>>>> Test
