# level-filesystem

(TO BE) A full implementation of the fs module in leveldb (except sync ops)

	npm install level-filesystem

[![build status](https://secure.travis-ci.org/mafintosh/level-filesystem.png)](http://travis-ci.org/mafintosh/level-filesystem)

[![browser support](https://ci.testling.com/mafintosh/level-filesystem.png)
](https://ci.testling.com/mafintosh/level-filesystem)

The goal of this module is similar to [level-fs](https://github.com/juliangruber/level-fs) and is probably gonna end up as a PR to that module.
I decided to make this as a standalone module (for now) since adding proper directory support to [level-fs](https://github.com/juliangruber/level-fs)
turned out to be non-trivial (more or a less a complete rewrite).

## Usage

``` js
var filesystem = require('level-filesystem');
var fs = filesystem(db); // where db is a levelup instance

// use fs as you would node cores fs module

fs.mkdir('/hello', function(err) {
	if (err) throw err;
	fs.writeFile('/hello', 'world', function(err) {
		if (err) throw err;
		fs.readFile('/hello', 'utf-8', function(err, data) {
			console.log(data);
		});
	});
});
```

## Errors

When you get an error in a callback it is similar to what you get in Node core fs.

``` js
fs.mkdir('/hello', function() {
	fs.mkdir('/hello', function(err) {
		console.log(err); // err.code is EEXIST
	});
});

fs.mkdir('/hello', function() {
	fs.readFile('/hello', function(err) {
		console.log(err); // err.code is EISDIR
	});
});

...
```

## Status

```
// working and tested

✓ fs.rmdir(path, callback)
✓ fs.mkdir(path, [mode], callback)
✓ fs.readdir(path, callback)
✓ fs.stat(path, callback)
✓ fs.exists(path, callback)
✓ fs.chmod(path, mode, callback)
✓ fs.chown(path, uid, gid, callback)
✓ fs.rename(oldPath, newPath, callback)
✓ fs.realpath(path, [cache], callback)
✓ fs.readFile(filename, [options], callback)
✓ fs.writeFile(filename, data, [options], callback)
✓ fs.appendFile(filename, data, [options], callback)
✓ fs.utimes(path, atime, mtime, callback)
✓ fs.unlink(path, callback)
✓ fs.createReadStream(path, [options])
✓ fs.createWriteStream(path, [options])
✓ fs.truncate(path, len, callback)
✓ fs.watchFile(filename, [options], listener)
✓ fs.unwatchFile(filename, [listener])
✓ fs.watch(filename, [options], [listener])
✓ fs.fsync(fd, callback)
✓ fs.write(fd, buffer, offset, length, position, callback)
✓ fs.read(fd, buffer, offset, length, position, callback)
✓ fs.close(fd, callback)
✓ fs.open(path, flags, [mode], callback)

// pending

fs.ftruncate(fd, len, callback)
fs.fchown(fd, uid, gid, callback)
fs.lchown(path, uid, gid, callback)
fs.fchmod(fd, mode, callback)
fs.lchmod(path, mode, callback)
fs.lstat(path, callback)
fs.fstat(fd, callback)
fs.link(srcpath, dstpath, callback)
fs.symlink(srcpath, dstpath, [type], callback)
fs.readlink(path, callback)
fs.futimes(fd, atime, mtime, callback)
```

## License

MIT
