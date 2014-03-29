var filesystem = require('../');
var test = require('tap').test;
var level = require('level');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb({valueEncoding:'json'}));
};

test('mkdir', function(t) {
	var fs = reset();

	fs.mkdir('/foo/bar', function(err) {
		t.ok(err);
		t.same(err.code, 'ENOENT');

		fs.mkdir('/foo', function(err) {
			t.notOk(err);

			fs.mkdir('/foo', function(err) {
				t.ok(err);
				t.same(err.code, 'EEXIST');

				fs.mkdir('/foo/bar', function(err) {
					t.notOk(err);
					t.end();
				});
			});
		});
	});
});

test('mkdir + stat', function(t) {
	var fs = reset();

	fs.mkdir('/foo', function() {
		fs.stat('/foo', function(err, stat) {
			t.notOk(err);
			t.same(stat.mode, 0777);
			t.ok(stat.isDirectory());
			t.end();
		});
	});
});

test('mkdir with modes', function(t) {
	var fs = reset();

	fs.mkdir('/foo', 0766, function() {
		fs.stat('/foo', function(err, stat) {
			t.notOk(err);
			t.same(stat.mode, 0766);
			t.ok(stat.isDirectory());
			t.end();
		});
	});
});

test('rmdir', function(t) {
	var fs = reset();

	fs.rmdir('/', function(err) {
		t.ok(err);
		t.same(err.code, 'EPERM');

		fs.mkdir('/foo', function() {
			fs.rmdir('/foo', function(err) {
				t.notOk(err);
				fs.rmdir('/foo', function(err) {
					t.ok(err);
					t.same(err.code, 'ENOENT');
					t.end();
				});
			});
		});
	});
});

test('readdir', function(t) {
	var fs = reset();

	fs.readdir('/', function(err, list) {
		t.notOk(err);
		t.same(list, []);

		fs.readdir('/foo', function(err, list) {
			t.ok(err);
			t.notOk(list);
			t.same(err.code, 'ENOENT');

			fs.mkdir('/foo', function() {
				fs.readdir('/', function(err, list) {
					t.notOk(err);
					t.same(list, ['foo']);

					fs.readdir('/foo', function(err, list) {
						t.notOk(err);
						t.same(list, []);
						t.end();
					});
				});
			});
		});
	});
});

test('readdir not recursive', function(t) {
	var fs = reset();

	fs.mkdir('/foo', function() {
		fs.mkdir('/foo/bar', function() {
			fs.mkdir('/foo/bar/baz', function() {
				fs.readdir('/foo', function(err, list) {
					t.notOk(err);
					t.same(list, ['bar']);
					fs.readdir('/foo/bar', function(err, list) {
						t.notOk(err);
						t.same(list, ['baz']);
						t.end();
					});
				});
			});
		});
	});
});