var test = require('./helpers/test');
var bufferAlloc = require('buffer-alloc');

test('watchFile', function(fs, t) {
	t.plan(3);

	fs.watchFile('/test', function() {
		t.ok(true);
	});

	fs.writeFile('/test', bufferAlloc(1), function() {
		fs.truncate('/test', 10000, function(err) {
			fs.unlink('/test');
		});
	});
});
