var octal = require('octal')
var test = require('./helpers/test');

test('chmod', function(fs, t) {
	fs.mkdir('/foo', function() {
		fs.chmod('/foo', octal(755), function(err) {
			t.ok(!err);

			fs.stat('/foo', function(err, stat) {
				t.ok(!err);

				t.same(stat.mode, octal(755));

				t.end();
			});
		});
	});
});
