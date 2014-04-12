var path = require('path');
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

		fs.stat(key, function(err) {
			if (err) return cb(err);
			stat.mode = mode;
			put(key, stat, cb);
		});
	};

	fs.chown = function(key, uid, gid, cb) {
		if (!cb) cb = noop;
		key = normalize(key);

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

		var rs = fwd.readable(function(cb) {
			get(key, function(err, stat) {
				if (err) return cb(err);
				if (stat.isDirectory()) return cb(errno.EISDIR(key));

				rs.emit('open');
				cb(null, bl.createReadStream(key, opts));
			});
		});

		return rs;
	};

	fs.createWriteStream = function(key, opts) {
		if (!opts) opts = {};
		key = normalize(key);

		var flags = opts.flags || 'w';

		opts.append = flags[0] === 'a';

		var ws = fwd.writable(function(cb) {
			get(key, function(err, stat) {
				if (err && err.code !== 'ENOENT') return cb(err);
				if (stat && stat.isDirectory()) return cb(errno.EISDIR(key));
				if (stat && flags[1] === 'x') return cb(errno.EEXIST(key));

				checkParentDirectory(key, function(err) {
					if (err) return cb(err);

					put(key, {
						ctime: stat && stat.ctime,
						mtime: new Date(),
						mode: opts.mode || 0666,
						type:'file'
					}, function(err) {
						if (err) return cb(err);

						ws.emit('open');
						cb(null, bl.createWriteStream(key, opts));
					});
				});
			});
		});

		return ws;
	};

	return fs;
};