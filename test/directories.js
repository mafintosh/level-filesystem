var filesystem = require('../');
var test = require('tap').test;
var level = require('level');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb({valueEncoding:'json'}));
};

test('mkdir', function(t) {
	var fs = reset();

	t.plan(6);

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
				});
			});
		});
	});
});

test('mkdir + stat', function(t) {
	var fs = reset();

	t.plan(3);

	fs.mkdir('/foo', function() {
		fs.stat('/foo', function(err, stat) {
			t.notOk(err);
			t.same(stat.mode, 0777);
			t.ok(stat.isDirectory());
		});
	});
});

test('mkdir with mode + stat', function(t) {
	var fs = reset();

	t.plan(3);

	fs.mkdir('/foo', 0766, function() {
		fs.stat('/foo', function(err, stat) {
			t.notOk(err);
			t.same(stat.mode, 0766);
			t.ok(stat.isDirectory());
		});
	});
});

test('rmdir', function(t) {
	var fs = reset();

	t.plan(5);

	fs.rmdir('/', function(err) {
		t.ok(true);
		t.same(err.code, 'EPERM');

		fs.mkdir('/foo', function() {
			fs.rmdir('/foo', function(err) {
				t.notOk(err);
				fs.rmdir('/foo', function(err) {
					t.ok(err);
					t.same(err.code, 'ENOENT');
				});
			});
		});
	});
});