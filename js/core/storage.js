/**
 * js/core/storage.js
 * Hệ thống lưu trữ 2 trong 1:
 * - Localhost: Dùng localStorage (test)
 * - Facebook: Dùng FBInstant.player cloud storage (production)
 */

export const StorageSystem = {
    // Kiểm tra môi trường
    isLocal: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',

    /**
     * Lưu dữ liệu
     * @param {Object} dataObj - Object chứa dữ liệu cần lưu, ví dụ: { highScore: 1000, totalGold: 500 }
     * @returns {Promise}
     */
    async saveData(dataObj) {
        try {
            if (this.isLocal) {
                // --- LOCALHOST: Lưu vào localStorage ---
                console.log("[Storage] 💾 Saving to LocalStorage:", dataObj);
                for (let key in dataObj) {
                    localStorage.setItem(key, JSON.stringify(dataObj[key]));
                }
                console.log("[Storage] ✅ Saved to LocalStorage");
                return true;

            } else {
                // --- FACEBOOK: Lưu lên Cloud ---
                console.log("[Storage] ☁️ Saving to Facebook Cloud:", dataObj);
                await FBInstant.player.setDataAsync(dataObj);
                console.log("[Storage] ✅ Saved to Facebook Cloud");
                return true;
            }
        } catch (error) {
            console.error("[Storage] ❌ Save failed:", error);
            return false;
        }
    },

    /**
     * Tải dữ liệu
     * @param {Array<string>} keysArray - Mảng các key cần load, ví dụ: ['highScore', 'totalGold']
     * @returns {Promise<Object>} Object chứa dữ liệu, ví dụ: { highScore: 1000, totalGold: 500 }
     */
    async loadData(keysArray) {
        try {
            if (this.isLocal) {
                // --- LOCALHOST: Load từ localStorage ---
                let result = {};
                keysArray.forEach(key => {
                    const data = localStorage.getItem(key);
                    result[key] = data ? JSON.parse(data) : null;
                });
                console.log("[Storage] 📥 Loaded from LocalStorage:", result);
                return result;

            } else {
                // --- FACEBOOK: Load từ Cloud ---
                const data = await FBInstant.player.getDataAsync(keysArray);
                console.log("[Storage] 📥 Loaded from Facebook Cloud:", data);
                return data;
            }
        } catch (error) {
            console.error("[Storage] ❌ Load failed:", error);
            return {};
        }
    },

    /**
     * Xóa dữ liệu (chỉ dùng cho test/debug)
     * @param {Array<string>} keysArray 
     */
    async clearData(keysArray) {
        try {
            if (this.isLocal) {
                keysArray.forEach(key => localStorage.removeItem(key));
                console.log("[Storage] 🗑️ Cleared from LocalStorage");
            } else {
                // Note: Facebook không có API xóa trực tiếp, chỉ có thể ghi đè bằng null
                const clearObj = {};
                keysArray.forEach(key => clearObj[key] = null);
                await FBInstant.player.setDataAsync(clearObj);
                console.log("[Storage] 🗑️ Cleared from Facebook Cloud");
            }
        } catch (error) {
            console.error("[Storage] ❌ Clear failed:", error);
        }
    },

    /**
     * Lấy thông tin người chơi (chỉ trên Facebook)
     */
    getPlayerInfo() {
        if (!this.isLocal) {
            return {
                id: FBInstant.player.getID(),
                name: FBInstant.player.getName(),
                photo: FBInstant.player.getPhoto()
            };
        }
        return {
            id: 'local_player',
            name: 'You',
            photo: ''
        };
    }
};
