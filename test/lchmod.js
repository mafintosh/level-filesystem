var test = require('./helpers/test');

test('lchmod', function(fs, t) {
	fs.mkdir('/foo', function() {
		fs.symlink('/foo', '/bar', function() {
			fs.lchmod('/bar', 0755, function(err) {
				t.notOk(err);
				fs.lstat('/bar', function(err, stat) {
					t.notOk(err);
					t.same(stat.mode, 0755);
					t.end();
				});
			});
		});
	});
});