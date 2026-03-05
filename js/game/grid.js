/**
 * GRID - 2D Grid Data Structure
 * Owns spatial partitioning for particles
 * Source of truth: STATE.grid
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';

export const Grid = {
    cols: 0,
    rows: 0,

    init() {
        this.cols = Math.ceil(CONFIG.BOARD_WIDTH / CONFIG.PARTICLE_SIZE);
        this.rows = Math.ceil(CONFIG.BOARD_HEIGHT / CONFIG.PARTICLE_SIZE);

        STATE.grid = new Array(this.cols)
            .fill(null)
            .map(() => new Array(this.rows).fill(null));

        console.log('[Grid] Initialized:', this.cols, 'x', this.rows);
    },

    clear() {
        if (!STATE.grid) return;
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                STATE.grid[c][r] = null;
            }
        }
    },

    get(col, row) {
        if (!this.isInBounds(col, row)) return null;
        return STATE.grid[col][row];
    },

    set(col, row, particle) {
        if (!this.isInBounds(col, row)) return;
        STATE.grid[col][row] = particle;
    },

    isEmpty(col, row) {
        return this.get(col, row) === null;
    },

    isInBounds(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    },

    worldToGrid(x, y) {
        return {
            col: Math.floor(x / CONFIG.PARTICLE_SIZE),
            row: Math.floor(y / CONFIG.PARTICLE_SIZE)
        };
    },

    gridToWorld(col, row) {
        return {
            x: col * CONFIG.PARTICLE_SIZE,
            y: row * CONFIG.PARTICLE_SIZE
        };
    }
};
