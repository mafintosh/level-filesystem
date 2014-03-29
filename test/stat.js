var filesystem = require('../');
var test = require('tap').test;
var level = require('level');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb({valueEncoding:'json'}));
};

test('stat root and folder', function(t) {
	var fs = reset();

	fs.stat('/', function(err, stat) {
		t.notOk(err);
		t.ok(stat.isDirectory());
		t.ok(stat.mtime);
		t.ok(stat.ctime);
		t.ok(stat.atime);

		fs.mkdir('/foo', function() {
			fs.stat('/foo', function(err, stat) {
				t.notOk(err);
				t.ok(stat.isDirectory());
				t.end();
			});
		});

	});
});

test('stat not exist', function(t) {
	var fs = reset();

	fs.stat('/foo/bar', function(err) {
		t.ok(err);
		t.same(err.code, 'ENOENT');
		t.end();
	});
});

test('exists', function(t) {
	var fs = reset();

	fs.exists('/', function(exists) {
		t.ok(exists);
		fs.exists('/foo', function(exists) {
			t.notOk(exists);
			fs.mkdir('/foo', function() {
				fs.exists('/foo', function(exists) {
					t.ok(exists);
					t.end();
				});
			});
		});
	});
});