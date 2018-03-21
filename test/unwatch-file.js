var test = require('./helpers/test');
var bufferAlloc = require('buffer-alloc');

test('unwatchFile', function(fs, t) {
	t.plan(1);

	fs.watchFile('/test', function() {
		t.ok(true);
	});

	fs.writeFile('/test', bufferAlloc(1), function() {
		fs.unwatchFile('/test');
		fs.truncate('/test', 10000, function() {
			fs.unlink('/test');
		});
	});
});
