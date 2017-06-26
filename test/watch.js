var test = require('./helpers/test');

test('watch before creating file', function(fs, t) {
	t.plan(3);

	fs.watch('/test', function() {
		t.ok(true, 'watch handler called');
	});

	fs.writeFile('/test', new Buffer(1), function() {
		fs.truncate('/test', 10000, function(err) {
			fs.unlink('/test');
		});
	});
});

test('watch on existing file', function(fs, t) {
	t.plan(3);

	fs.writeFile('/test', new Buffer(1), function() {
		fs.watch('/test', function() {
			t.ok(true, 'watch handler called');
		});
		fs.writeFile('/test', new Buffer(1), function() {
			fs.truncate('/test', 10000, function(err) {
				fs.unlink('/test');
			});
		});
	})
});

test('watch on directory', function(fs, t) {
    t.plan(2);

	fs.watch('/', function() {
		t.ok(true, 'watch handler called');
	});

	fs.writeFile('/test', new Buffer(1), function() {
    	fs.unlink('/test');
	});
});
