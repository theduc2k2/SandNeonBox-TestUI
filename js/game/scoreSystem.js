/**
 * /scripts/game/scoreSystem.js
 * * RESPONSIBILITY:
 * Encapsulate scoring logic, high score tracking, and economy (diamonds).
 * It reacts to game events (matches, explosions) to update the State.
 * It does NOT handle physics collision detection, only the rewards.
 */

import { STATE } from '../core/state.js';
import { CONFIG } from '../core/config.js';
import { EventBus, EVENTS } from '../core/eventBus.js';

export const ScoreSystem = {
    init() {
        // Subscribe to events that generate score
        EventBus.on(EVENTS.MATCH_FOUND, this.handleMatch.bind(this));
        EventBus.on(EVENTS.GAME_OVER, this.handleGameOver.bind(this));
    },

    /**
     * Calculate score and diamonds for a cleared group of particles
     * @param {object} payload - { count: number, combo: number }
     */
    handleMatch(payload) {
        const { count, combo } = payload;

        // --- SCORE CALCULATION ---
        // Base points per particle * Combo multiplier
        const points = count * 10 * (combo || 1);

        STATE.currentScore += points;

        // --- DIAMOND REWARD ---
        // Earn diamonds based on combo intensity
        if (combo >= 1) {
            const earnedDiamonds = Math.ceil(combo * 1.5);
            STATE.diamonds += earnedDiamonds;
            STATE.runDiamonds += earnedDiamonds;

            EventBus.emit(EVENTS.DIAMONDS_UPDATED, {
                total: STATE.diamonds,
                earned: earnedDiamonds
            });
        }

        // Update Combo State
        STATE.combo = combo;
        if (combo > STATE.maxCombo) {
            STATE.maxCombo = combo;
        }

        // Notify UI
        EventBus.emit(EVENTS.SCORE_UPDATED, STATE.currentScore);
    },

    /**
     * Handle High Score persistence at end of game
     */
    handleGameOver() {
        if (STATE.currentScore > STATE.highScore) {
            STATE.highScore = STATE.currentScore;
            // Persistence layer (DataManager) will observe STATE changes 
            // or listen to GAME_OVER to save to localStorage
        }
    }
};