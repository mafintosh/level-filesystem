var path = require('path');
var events = require('events');
var concat = require('concat-stream');
var fwd = require('fwd-stream');
var sublevel = require('level-sublevel');
var blobs = require('level-blobs');
var once = require('once');
var stat = require('./stat');
var errno = require('./errno');

var ROOT = stat({
	type: 'directory',
	mode: 0777,
	size: 4096
});

var normalize = function(key) {
	key = key[0] === '/' ? key : '/' + key;
	key = path.normalize(key);
	if (key === '/') return key;
	return key[key.length-1] === '/' ? key.slice(0, -1) : key;
};

var prefix = function(key) {
	var depth = key.split('/').length.toString(36);
	return '0000000000'.slice(depth.length)+depth+key;
};

var nextTick = function(cb, err, val) {
	process.nextTick(function() {
		cb(err, val);
	});
};

var noop = function() {};

module.exports = function(db, opts) {
	var fs = {};

	db = sublevel(db);

	var stats = db.sublevel('stats');
	var bl = blobs(db.sublevel('blobs'), opts);

	var listeners = {};
	var fds = [];

	var change = function(key) {
		if (listeners[key]) listeners[key].emit('change');
	};

	var changeCallback = function(key, cb) {
		return function(err, val) {
			change(key);
			if (cb) cb(err, val);
		};
	};

	var get = function(key, cb) {
		if (key === '/') return nextTick(cb, null, ROOT);
		stats.get(prefix(key), {valueEncoding:'json'}, function(err, doc) {
			if (err && err.notFound) return cb(errno.ENOENT(key));
			if (err) return cb(err);
			cb(null, doc && stat(doc));
		});
	};

	var put = function(key, val, cb) {
		if (key === '/') return nextTick(cb, errno.EPERM(key));
		stats.put(prefix(key), stat(val), {valueEncoding:'json'}, cb);
	};

	var del = function(key, cb) {
		if (key === '/') return nextTick(cb, errno.EPERM(key));
		stats.del(prefix(key), cb);
	};

	var checkParentDirectory = function(key, cb) {
		get(path.dirname(key), function(err, parent) {
			if (err) return cb(err);
			if (!parent.isDirectory()) return cb(errno.ENOTDIR(key));
			cb()
		});
	};

	fs.mkdir = function(key, mode, cb) {
		if (typeof mode === 'function') return fs.mkdir(key, null, mode);
		if (!mode) mode = 0777;
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		get(key, function(err, entry) {
			if (err && err.code !== 'ENOENT') return cb(err);
			if (entry) return cb(errno.EEXIST(key));

			checkParentDirectory(key, function(err) {
				if (err) return cb(err);

				put(key, stat({
					type:'directory',
					mode: mode,
					size: 4096
				}), cb);
			});
		});
	};

	fs.rmdir = function(key, cb) {
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		fs.readdir(key, function(err, files) {
			if (err) return cb(err);
			if (files.length) return cb(errno.ENOTEMPTY(key));
			del(key, cb);
		});
	};

	fs.readdir = function(key, cb) {
		key = normalize(key);

		get(key, function(err, entry) {
			if (err) return cb(err);
			if (!entry) return cb(errno.ENOENT(key));
			if (!entry.isDirectory()) return cb(errno.ENOTDIR(key));

			var start = prefix(key === '/' ? key : key + '/');
			var keys = stats.createKeyStream({start: start, end: start+'\xff'});

			cb = once(cb);

			keys.on('error', cb);
			keys.pipe(concat({encoding:'object'}, function(files) {
				files = files.map(function(file) {
					return file.split('/').pop();
				});

				cb(null, files);
			}));
		});
	};

	fs.stat = function(key, cb) {
		key = normalize(key);
		get(key, function(err, stat) {
			if (err) return cb(err);
			if (stat.size) return cb(null, stat);

			bl.size(key, function(err, size) {
				if (err) return cb(err);
				stat.size = size;
				cb(null, stat);
			});
		});
	};

	fs.exists = function(key, cb) {
		fs.stat(key, function(err) {
			cb(!err);
		});
	};

	fs.chmod = function(key, mode, cb) {
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		fs.stat(key, function(err) {
			if (err) return cb(err);
			stat.mode = mode;
			put(key, stat, cb);
		});
	};

	fs.chown = function(key, uid, gid, cb) {
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		fs.stat(key, function(err) {
			if (err) return cb(err);
			stat.uid = uid;
			stat.gid = gid;
			put(key, stat, cb);
		});
	};

	fs.utimes = function(key, atime, mtime, cb) {
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		fs.stat(key, function(err) {
			if (err) return cb(err);
			if (atime) stat.atime = atime;
			if (mtime) stat.mtime = mtime;
			put(key, stat, cb);
		});
	};

	fs.rename = function(from, to, cb) {
		if (!cb) cb = noop;
		from = normalize(from);
		to = normalize(to);
		cb = changeCallback(to, changeCallback(from, cb));

		get(from, function(err, statFrom) {
			if (err) return cb(err);

			var rename = function() {
				put(to, statFrom, function(err) {
					if (err) return cb(err);
					del(from, cb);
				});
			};

			get(to, function(err, statTo) { // TODO: add exact semantics
				if (err && err.code !== 'ENOENT') return cb(err);
				if (!statTo) return rename();
				if (statFrom.isDirectory() !== statTo.isDirectory()) return cb(errno.EISDIR(from));

				if (statTo.isDirectory()) {
					fs.readdir(to, function(err, list) {
						if (err) return cb(err);
						if (list.length) return cb(errno.ENOTEMPTY(from));
						rename();
					});
					return;
				}

				rename();
			});
		});
	};

	fs.realpath = function(key, cache, cb) {
		if (typeof cache === 'function') return fs.realpath(key, null, cache);
		nextTick(cb, null, normalize(key));
	};

	fs.writeFile = function(key, data, opts, cb) {
		if (typeof opts === 'function') return fs.writeFile(key, data, null, opts);
		if (typeof opts === 'string') opts = {encoding:opts};
		if (!opts) opts = {};
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		if (!Buffer.isBuffer(data)) data = new Buffer(data, opts.encoding || 'utf-8');

		var flags = opts.flags || 'w';
		opts.append = flags[0] !== 'w';

		get(key, function(err, stat) {
			if (err && err.code !== 'ENOENT') return cb(err);
			if (stat && stat.isDirectory()) return cb(errno.EISDIR(key));
			if (stat && flags[1] === 'x') return cb(errno.EEXIST(key));

			checkParentDirectory(key, function(err) {
				if (err) return cb(err);

				bl.write(key, data, opts, function(err) {
					if (err) return cb(err);

					put(key, {
						ctime: stat && stat.ctime,
						mtime: new Date(),
						mode: opts.mode || 0666,
						type:'file'
					}, cb);
				});
			});
		});
	};

	fs.appendFile = function(key, data, opts, cb) {
		if (typeof opts === 'function') return fs.appendFile(key, data, null, opts);
		if (typeof opts === 'string') opts = {encoding:opts};
		if (!opts) opts = {};

		opts.flags = 'a';
		fs.writeFile(key, data, opts, cb);
	};

	fs.unlink = function(key, cb) {
		if (!cb) cb = noop;
		key = normalize(key);
		cb = changeCallback(key, cb);

		get(key, function(err, stat) {
			if (err) return cb(err);
			if (stat.isDirectory()) return cb(errno.EISDIR(key));

			bl.remove(key, function(err) {
				if (err) return cb(err);
				del(key, cb);
			});
		});
	};

	fs.readFile = function(key, opts, cb) {
		if (typeof opts === 'function') return fs.readFile(key, null, opts);
		if (typeof opts === 'string') opts = {encoding:opts};
		if (!opts) opts = {};
		key = normalize(key);

		var encoding = opts.encoding || 'binary';
		var flag = opts.flag || 'r';

		get(key, function(err, stat) {
			if (err) return cb(err);
			if (stat.isDirectory()) return cb(errno.EISDIR(key));

			bl.read(key, function(err, data) {
				if (err) return cb(err);
				cb(null, opts.encoding ? data.toString(opts.encoding) : data);
			});
		});
	};

	fs.createReadStream = function(key, opts) {
		if (!opts) opts = {};
		key = normalize(key);

		var closed = false;

		var rs = fwd.readable(function(cb) {
			get(key, function(err, stat) {
				if (err) return cb(err);
				if (stat.isDirectory()) return cb(errno.EISDIR(key));

				var r = bl.createReadStream(key, opts);

				rs.emit('open');
				r.on('end', function() {
					process.nextTick(function() {
						if (!closed) rs.emit('close');
					});
				});

				cb(null, r);
			});
		});

		rs.on('close', function() {
			closed = true;
			change(key);
		});

		return rs;
	};

	fs.createWriteStream = function(key, opts) {
		if (!opts) opts = {};
		key = normalize(key);

		var flags = opts.flags || 'w';
		var closed = false;
		var mode = opts.mode || 0666;

		opts.append = flags[0] === 'a';

		var ws = fwd.writable(function(cb) {
			get(key, function(err, stat) {
				if (err && err.code !== 'ENOENT') return cb(err);
				if (stat && stat.isDirectory()) return cb(errno.EISDIR(key));
				if (stat && flags[1] === 'x') return cb(errno.EEXIST(key));

				checkParentDirectory(key, function(err) {
					if (err) return cb(err);

					var ctime = stat ? stat.ctime : new Date();
					var s = {
						ctime: ctime,
						mtime: new Date(),
						mode: mode,
						type:'file'
					};

					put(key, s, function(err) {
						if (err) return cb(err);

						var w = bl.createWriteStream(key, opts);

						ws.emit('open');
						w.on('finish', function() {
							s.mtime = new Date();
							put(key, s, function() {
								if (!closed) ws.emit('close');
							});
						});

						cb(null, w);
					});
				});
			});
		});

		ws.on('close', function() {
			closed = true;
			change(key);
		});

		return ws;
	};

	fs.truncate = function(key, len, cb) {
		key = normalize(key);
		cb = once(changeCallback(key, cb));

		get(key, function(err, stat) {
			if (err) return cb(err);
			checkParentDirectory(key, function(err) {
				if (err) return cb(err);
				if (!len) return bl.remove(key, cb);

				bl.size(key, function(err, size) {
					if (err) return cb(err);

					var ws = bl.createWriteStream(key, {
						start:size < len ? len-1 : len
					});

					ws.on('error', cb);
					ws.on('finish', cb);

					if (size < len) ws.write(new Buffer([0]));
					ws.end();
				});
			});
		});
	};

	fs.watchFile = function(key, opts, cb) {
		if (typeof opts === 'function') return fs.watchFile(key, null, opts);
		key = normalize(key);

		if (!listeners[key]) {
			listeners[key] = new events.EventEmitter();
			listeners[key].setMaxListeners(0);
		}

		if (cb) listeners[key].on('change', cb);
		return listeners[key];
	};

	fs.unwatchFile = function(key, cb) {
		if (!listeners[key]) return;
		if (cb) listeners[key].removeListener('change', cb);
		else listeners[key].removeAllListeners('change');
		if (!listeners[key].listeners('change').length) delete listeners[key];;
	};

	fs.watch = function(key, opts, cb) {
		var watcher = new events.EventEmitter();
		var onchange = function() {
			watcher.emit('change', 'change', key);
		};

		fs.watchFile(key, onchange);
		watcher.close = function() {
			fs.unwatchFile(key, onchange);
		};

		return watcher;
	};

	fs.open = function(key, flags, mode, cb) {
		if (typeof mode === 'function') return fs.open(key, flags, null, mode);
		key = normalize(key);

		var fl = flags[0];
		var plus = flags[1] === '+' || flags[2] === '+';

		var f = {
			key: key,
			mode: mode || 0666,
			readable: fl === 'r' || ((fl === 'w' || fl === 'a') && plus),
			writable: fl === 'w' || fl === 'a' || (fl === 'r' && plus),
			append: fl === 'a'
		};

		fs.stat(key, function(err, stat) {
			if (err && err.code !== 'ENOENT') return cb(err);
			if (fl === 'r' && err) return cb(err);
			if (flags[1] === 'x' && stat) return cb(errno.EEXIST(key));
			if (stat && stat.isDirectory()) return cb(errno.EISDIR(key)); // not strictly fs... TODO: fix?

			if (f.append && stat) f.writePos = stat.size;

			checkParentDirectory(key, function(err) {
				if (err) return cb(err);

				var onready = function(err) {
					if (err) return cb(err);

					var i = fds.indexOf(null);
					if (i === -1) i = 10+fds.push(fds.length+10)-1;

					f.fd = i;
					fds[i] = f;

					cb(null, f.fd);
				};

				var ontruncate = function(err) {
					if (err) return cb(err);
					if (stat) return onready();
					put(key, {type:'file'}, onready);
				};

				if (!f.append && f.writable) return bl.remove(key, ontruncate);
				ontruncate();
			});
		});
	};

	fs.close = function(fd, cb) {
		var f = fds[fd];
		if (!f) return nextTick(cb, errno.EBADF());

		cb = changeCallback(f.key, cb);
		fds[fd] = null;
		nextTick(cb);
	};

	fs.write = function(fd, buf, off, len, pos, cb) {
		var f = fds[fd];

		if (!cb) cb = noop;
		if (!f || !f.writable) return nextTick(cb, errno.EBADF());

		if (pos === null) pos = f.writePos || 0;

		var slice = buf.slice(off, off+len);
		f.writePos = pos + slice.length;

		bl.write(f.key, slice, {start:pos, append:true}, function(err) {
			if (err) return cb(err);
			cb(null, len, buf);
		});
	};

	fs.read = function(fd, buf, off, len, pos, cb) {
		var f = fds[fd];

		if (!cb) cb = noop;
		if (!f || !f.readable) return nextTick(cb, errno.EBADF());

		if (pos === null) pos = fs.readPos || 0;

		bl.read(f.key, {start:pos, end:pos+len-1}, function(err, read) {
			if (err) return cb(err);
			var slice = read.slice(0, len);
			slice.copy(buf, off);
			fs.readPos = pos+slice.length;
			cb(null, slice.length, buf);
		});
	};

	fs.fsync = function(fd, cb) {
		var f = fds[fd];

		if (!cb) cb = noop;
		if (!f || !f.writable) return nextTick(cb, errno.EBADF());

		nextTick(cb);
	};

	['ftruncate', 'fchown', 'futimes', 'fstat', 'fchmod'].forEach(function(method) {
		var mirror = method.slice(1);
		fs[method] = function(fd) {
			var f = fds[fd];
			var cb = arguments[arguments.length-1];

			if (typeof cb !== 'function') cb = noop;
			if (!f) return nextTick(cb, errno.EBADF());

			fd = f.key;
			fs[mirror].apply(fs, arguments);
		};
	});

	return fs;
};