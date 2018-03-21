var test = require('./helpers/test');
var bufferFrom = require('buffer-from');

test('writeFile', function(fs, t) {
	fs.writeFile('/test.txt', 'hello', function(err) {
		t.notOk(err);
		fs.readFile('/test.txt', function(err, data) {
			t.same(data.toString(), 'hello');
			fs.stat('/test.txt', function(err, stat) {
				t.same(stat.mode, 0666);
				t.same(stat.size, 5);
				t.ok(stat.isFile());
				t.end();
			});
		});
	});
});

test('writeFile + encoding', function(fs, t) {
	fs.writeFile('/foo', bufferFrom('foo'), function(err) {
		t.notOk(err);
		fs.readFile('/foo', function(err, data) {
			t.same(data.toString(), 'foo');
			fs.writeFile('/foo', '68656c6c6f', 'hex', function(err) {
				t.notOk(err);
				fs.readFile('/foo', function(err, data) {
					t.same(data.toString(), 'hello');
					t.end();
				});
			});
		});
	});
});

test('multiple writeFile', function(fs, t) {
	fs.writeFile('/foo', bufferFrom('foo'), function(err) {
		t.notOk(err);
		fs.writeFile('/foo', bufferFrom('bar'), function(err) {
			t.notOk(err);
			fs.writeFile('/foo', bufferFrom('baz'), function(err) {
				t.notOk(err);
				fs.readFile('/foo', function(err, data) {
					t.same(data.toString(), 'baz');
					t.end();
				});
			});
		});
	});
});


test('writeFile + mode', function(fs, t) {
	fs.writeFile('/foo', bufferFrom('foo'), {mode:0644}, function(err) {
		t.notOk(err);
		fs.stat('/foo', function(err, stat) {
			t.same(stat.mode, 0644);
			t.end();
		});
	});
});

test('overwrite file', function(fs, t) {
	fs.writeFile('/test.txt', 'foo', function(err) {
		t.notOk(err);
		fs.writeFile('/test.txt', 'bar', function(err) {
			t.notOk(err);
			fs.readFile('/test.txt', function(err, data) {
				t.same(data.toString(), 'bar');
				t.end();
			});
		});
	});
});

test('cannot writeFile to dir', function(fs, t) {
	fs.mkdir('/test', function() {
		fs.writeFile('/test', 'hello', function(err) {
			t.ok(err);
			t.same(err.code, 'EISDIR');
			t.end();
		});
	});
});