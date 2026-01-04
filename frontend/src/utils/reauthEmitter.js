/**
 * Event emitter for triggering modal from axios interceptor
 * Moved here to avoid circular dependency between api/axios.js and components/ReauthModal.jsx
 */
class ReauthEventEmitter {
    constructor() {
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    emit(data) {
        this.listeners.forEach(callback => callback(data));
    }
}

export const reauthEmitter = new ReauthEventEmitter();
