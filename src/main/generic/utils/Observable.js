class Observable {
    /**
     * @returns {string}
     * @constant
     */
    static get WILDCARD() {
        return '*';
    }

    constructor() {
        /** @type {Map.<string, Array.<Function>>} */
        this._listeners = new Map();
    }

    _offAll() {
        this._listeners.clear();
    }

    /**
     * @param {string} type
     * @param {Function} callback
     * @return {number}
     */
    on(type, callback) {
        if (!this._listeners.has(type)) {
            this._listeners.set(type, [callback]);
            return 0;
        } else {
            return this._listeners.get(type).push(callback) - 1;
        }
    }

    /**
     * @param {string} type
     * @param {number} id
     */
    off(type, id) {
        if (!this._listeners.has(type) || !this._listeners.get(type)[id]) return;
        delete this._listeners.get(type)[id];
    }

    /**
     * @param {string} type
     * @param {...*} args
     * @returns {?Promise}
     */
    fire(type, ...args) {
        const promises = [];

        // Notify listeners for this event type.
        if (this._listeners.has(type)) {
            const listeners = this._listeners.get(type);
            for (const key in listeners) {
                if (!listeners.hasOwnProperty(key)) continue;
                try {
                    const res = listeners[key].apply(null, args);
                    if (res instanceof Promise) {
                        promises.push(res.catch(e => Log.e(this.constructor.name,
                            `Exception thrown by '${type}' listener #${key}: ${e.message || e}`, e)));
                    }
                } catch (e) {
                    Log.e(this.constructor.name,
                        `Exception thrown by '${type}' listener #${key}: ${e.message || e}`, e);
                }
            }
        }

        // Notify wildcard listeners. Pass event type as first argument.
        if (this._listeners.has(Observable.WILDCARD)) {
            const listeners = this._listeners.get(Observable.WILDCARD);
            for (const key in listeners) {
                if (!listeners.hasOwnProperty(key)) continue;
                try {
                    const res = listeners[key].apply(null, arguments);
                    if (res instanceof Promise) {
                        promises.push(res.catch(e => Log.e(this.constructor.name,
                            `Exception thrown by '${type}' wildcard listener #${key}: ${e.message || e}`, e)));
                    }
                } catch (e) {
                    Log.e(this.constructor.name,
                        `Exception thrown by '${type}' wildcard listener #${key}: ${e.message || e}`, e);
                }
            }
        }

        if (promises.length > 0) return Promise.all(promises);
        return null;
    }

    /**
     * @param {Observable} observable
     * @param {...string} types
     */
    bubble(observable, ...types) {
        for (const type of types) {
            let callback;
            if (type === Observable.WILDCARD) {
                callback = function() {
                    this.fire.apply(this, arguments);
                };
            } else {
                callback = function() {
                    this.fire.apply(this, [type, ...arguments]);
                };
            }
            observable.on(type, callback.bind(this));
        }
    }
}
Class.register(Observable);
