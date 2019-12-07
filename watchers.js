var events = require('events');
const path = require('path')
const ps = require('./paths')

module.exports = function() {
	var directListeners = {};
	var childChangeListeners = {};
	var childRenameListeners = {};
	var that = new events.EventEmitter();

	that._watch = function(key, cb, event, listeners) {
		if (!listeners[key]) {
			listeners[key] = new events.EventEmitter();
			listeners[key].setMaxListeners(0);
		}

		if (cb) listeners[key].on(event, cb);
		return listeners[key];
	};

	that.watcher = function(key, cb) {
		var watcher = new events.EventEmitter();
		var onchange = function() {
			watcher.emit('change', 'change', key);
		};

		that._watch(key, onchange, 'change', directListeners);
		if (cb) watcher.on('change', cb);
		watcher.close = function() {
			that._unwatch(key, onchange, 'change', directListeners);
		};

		return watcher;
	};

	that.directoryWatcher = function(key, cb) {
		var watcher = new events.EventEmitter();
		var onchange = function () {
			watcher.emit('change', 'change', key)
		}
		var onchildchange = function (childKey) {
			watcher.emit('change', 'change', childKey)
		}
		var onrename = function (childKey) {
			watcher.emit('change', 'rename', childKey)
		}
		that._watch(key, onchange, 'change', directListeners)
		that._watch(key, onchildchange, 'change', childChangeListeners)
		that._watch(key, onrename, 'rename', childRenameListeners)

		if (cb) watcher.on('change', cb)
		if (cb) watcher.on('rename', cb)
		watcher.close = function () {
			that._unwatch(key, onchange, 'change', directListeners)
			that._unwatch(key, onchildchange, 'change', childChangeListeners)
			that._unwatch(key, onrename, 'rename', childRenameListeners)
		}

		return watcher
	}

	that._unwatch = function(key, cb, event, listeners) {
		if (!listeners[key]) return;
		if (cb) listeners[key].removeListener(event, cb);
		else listeners[key].removeAllListeners(event);
		if (!listeners[key].listeners(event).length) delete listeners[key];
	};

	that.unwatchFile = function (key, cb) {
		that._unwatch(key, cb, 'change', directListeners)
	}

	that.change = function(key) {
		const parentKey = ps.normalize(path.dirname(key).split(path.sep).pop() || '/')
		if (directListeners[key]) directListeners[key].emit('change');
		if (childChangeListeners[parentKey]) childChangeListeners[parentKey].emit('change', key);
		that.emit('change', key);
	};

	that.rename = function (key) {
		const parentKey = ps.normalize(path.dirname(key).split(path.sep).pop() || '/')	
		if (childRenameListeners[parentKey]) childRenameListeners[parentKey].emit('rename', key);
		that.emit('rename', key);
	}

	that.cb = function(key, isRename, cb) {
		return function(err, val) {
			if (key && isRename) that.rename(key);
			if (key) that.change(key);
			if (cb) cb(err, val);
		};
	};

	return that;
};