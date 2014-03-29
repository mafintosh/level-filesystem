var test = require('./helpers/test');

test('chmod', function(fs, t) {
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