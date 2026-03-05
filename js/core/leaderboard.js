/**
 * js/core/leaderboard.js
 * Quản lý bảng xếp hạng với hỗ trợ:
 * 1. Personal Data (FBInstant.player cloud storage)
 * 2. Public Ranking (FBInstant Leaderboard)
 */

import { StorageSystem } from './storage.js';

const LEADERBOARD_NAME = "GlobalRank_v1";
const PERSONAL_DATA_KEYS = ['highScore', 'totalGames', 'lastPlayDate'];

export const Leaderboard = {
    currentSessionHighScore: 0,

    /**
     * Khởi tạo - Load dữ liệu cá nhân từ cloud
     */
    async init() {
        console.log("[Leaderboard] 🎮 Initializing...");

        // Load personal data
        const data = await StorageSystem.loadData(PERSONAL_DATA_KEYS);

        this.currentSessionHighScore = data.highScore || 0;

        console.log(`[Leaderboard] ✅ Loaded personal data:`, data);
        console.log(`[Leaderboard] 📊 Current high score: ${this.currentSessionHighScore}`);
    },

    /**
     * Lưu điểm số (vào cả Personal Data VÀ Public Leaderboard)
     * @param {number} score - Điểm số hiện tại
     * @param {string} playerName - Tên người chơi (chỉ dùng cho localhost)
     */
    async setScore(score, playerNameOrOptions = "You", maybeOptions = {}) {
        if (!score || score <= 0) {
            console.warn("[Leaderboard] ⚠️ Invalid score:", score);
            return false;
        }

        // Support both legacy (score, name) and new (score, { incrementGame }) signatures
        const isOptionsObject = typeof playerNameOrOptions === 'object' && playerNameOrOptions !== null;
        const playerName = isOptionsObject ? "You" : playerNameOrOptions;
        const options = isOptionsObject ? playerNameOrOptions : (maybeOptions || {});
        const incrementGame = options.incrementGame !== false;

        console.log(`[Leaderboard] 💾 Saving score: ${score} (incrementGame=${incrementGame})`);

        try {
            // 1. Load điểm cũ để so sánh
            const personalData = await StorageSystem.loadData(PERSONAL_DATA_KEYS);
            const oldHighScore = personalData.highScore || 0;
            const totalGames = (personalData.totalGames || 0) + (incrementGame ? 1 : 0);

            // 2. Cập nhật điểm cao nhất
            const newHighScore = Math.max(score, oldHighScore);

            // 3. Lưu Personal Data (cloud storage hoặc localStorage)
            await StorageSystem.saveData({
                highScore: newHighScore,
                totalGames: totalGames,
                lastPlayDate: new Date().toISOString(),
                lastScore: score
            });

            console.log(`[Leaderboard] ✅ Personal data saved! High Score: ${newHighScore}, Total Games: ${totalGames}`);

            // 4. Lưu vào Public Leaderboard (chỉ trên Facebook)
            if (!StorageSystem.isLocal) {
                try {
                    const leaderboard = await FBInstant.getLeaderboardAsync(LEADERBOARD_NAME);
                    await leaderboard.setScoreAsync(score);
                    console.log(`[Leaderboard] 🏆 Score ${score} posted to public leaderboard!`);
                } catch (error) {
                    console.error('[Leaderboard] ❌ Failed to post to public leaderboard:', error);
                    if (error.code === 'LEADERBOARD_NOT_FOUND') {
                        console.warn("⚠️ Leaderboard 'GlobalRank_v1' not found. Create it in Facebook App Dashboard.");
                    }
                }
            }

            // 5. Cập nhật session high score
            if (score > this.currentSessionHighScore) {
                this.currentSessionHighScore = score;
            }

            return true;

        } catch (error) {
            console.error('[Leaderboard] ❌ Save failed:', error);
            return false;
        }
    },

    /**
     * Lấy top scores từ public leaderboard
     * @param {number} count - Số lượng người chơi muốn lấy
     * @returns {Promise<Array>}
     */
    async getTopScores(count = 20) {
        if (StorageSystem.isLocal) {
            // --- LOCALHOST: Hiển thị mock data + personal score ---
            const personalData = await StorageSystem.loadData(PERSONAL_DATA_KEYS);
            const myHighScore = personalData.highScore || 0;

            // Mock players
            const mockPlayers = [
                { name: "SandMaster", score: 100000 },
                { name: "PixelKing", score: 95000 },
                { name: "CyberBlock", score: 80000 },
                { name: "NeonDrifter", score: 75000 },
                { name: "ProGamer", score: 65000 }
            ];

            // Thêm điểm của người chơi vào
            if (myHighScore > 0) {
                mockPlayers.push({ name: "You", score: myHighScore });
            }

            // Sắp xếp
            mockPlayers.sort((a, b) => b.score - a.score);

            // Format kết quả
            return mockPlayers.slice(0, count).map((player, index) => ({
                rank: index + 1,
                name: player.name,
                photo: null,
                score: player.score,
                isUser: player.name === "You"
            }));

        } else {
            // --- FACEBOOK: Lấy từ public leaderboard ---
            try {
                const leaderboard = await FBInstant.getLeaderboardAsync(LEADERBOARD_NAME);
                const entries = await leaderboard.getEntriesAsync(count, 0);

                const myID = FBInstant.player.getID();

                return entries.map(entry => ({
                    rank: entry.getRank(),
                    name: entry.getPlayer().getName(),
                    photo: entry.getPlayer().getPhoto(),
                    score: entry.getScore(),
                    isUser: entry.getPlayer().getID() === myID
                }));

            } catch (error) {
                console.error('[Leaderboard] ❌ Failed to fetch leaderboard:', error);
                return [];
            }
        }
    },

    /**
     * Lấy thông tin cá nhân từ cloud storage
     */
    async getPersonalStats() {
        const data = await StorageSystem.loadData(PERSONAL_DATA_KEYS);
        return {
            highScore: data.highScore || 0,
            totalGames: data.totalGames || 0,
            lastPlayDate: data.lastPlayDate || null,
            lastScore: data.lastScore || 0
        };
    },

    /**
     * Xóa dữ liệu cá nhân (chỉ dùng để test)
     */
    async clearPersonalData() {
        if (confirm("Bạn có chắc muốn xóa toàn bộ dữ liệu cá nhân?")) {
            await StorageSystem.clearData(PERSONAL_DATA_KEYS);
            this.currentSessionHighScore = 0;
            console.log("[Leaderboard] 🗑️ Personal data cleared");
            alert("Đã xóa dữ liệu cá nhân!");
        }
    }
};
