var filesystem = require('../');
var test = require('tap').test;
var level = require('level');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb({valueEncoding:'json'}));
};

test('chmod', function(t) {
	var fs = reset();

	fs.mkdir('/foo', function() {
		fs.chmod('/foo', 0755, function(err) {
			t.notOk(err);
			fs.stat('/foo', function(err, stat) {
				t.notOk(err);
				t.same(stat.mode, 0755);
				t.end();
			});
		});
	});
});

test('chown', function(t) {
	var fs = reset();

	fs.mkdir('/foo', function() {
		fs.chown('/foo', 10, 11, function(err) {
			t.notOk(err);
			fs.stat('/foo', function(err, stat) {
				t.notOk(err);
				t.same(stat.uid, 10);
				t.same(stat.gid, 11);
				t.end();
			});
		});
	});
});