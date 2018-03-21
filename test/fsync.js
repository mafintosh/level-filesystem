var test = require('./helpers/test');
var bufferFrom = require('buffer-from');
var bufferAlloc = require('buffer-alloc');

test('fsync', function(fs, t) {
	fs.open('/test', 'w+', function(err, fd) {
		t.ok(!err);
		var w = bufferFrom('hello');
		fs.write(fd, w, 0, 5, null, function() {
			fs.fsync(fd, function() {
				var r = bufferAlloc(5);
				fs.read(fd, r, 0, 5, 0, function(err) {
					t.ok(!err);
					t.same(r, w);
					t.end();
				})
			});
		});
	});
});
