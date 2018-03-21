var test = require('./helpers/test');
var bufferAlloc = require('buffer-alloc');
var bufferFrom = require('buffer-from');

test('read', function(fs, t) {
	fs.writeFile('/test', 'hello worldy world', function() {
		fs.open('/test', 'r', function(err, fd) {
			var b = bufferAlloc(1024);
			fs.read(fd, b, 0, 11, null, function(err, read) {
				t.ok(!err);
				t.same(read, 11);
				t.same(b.slice(0, 11), bufferFrom('hello world'))
				fs.read(fd, b, 0, 11, null, function(err, read) {
					t.ok(!err);
					t.same(read, 7);
					t.same(b.slice(0, 11), bufferFrom('y worldorld'));
					t.end();
				});
			});
		});
	});
});

test('read', function(fs, t) {
	fs.writeFile('/test', 'hello worldy world', function() {
		fs.open('/test', 'r', function(err, fd) {
			var b = bufferAlloc(1024);
			fs.read(fd, b, 0, 11, 0, function(err, read) {
				t.ok(!err);
				t.same(read, 11);
				t.same(b.slice(0, 11), bufferFrom('hello world'))
				fs.read(fd, b, 0, 11, 1, function(err, read) {
					t.ok(!err);
					t.same(read, 11);
					t.same(b.slice(0, 11), bufferFrom('ello worldy'));
					t.end();
				});
			});
		});
	});
});