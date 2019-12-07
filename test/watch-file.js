var test = require('./helpers/test');

test('watchFile', function(fs, t) {
	t.plan(3);

	fs.watchFile('/test', function() {
		t.ok(true);
	});

	fs.writeFile('/test', new Buffer(1), function() {
		fs.truncate('/test', 10000, function(err) {
			fs.unlink('/test');
		});
	});
});

test('watch() with file', function(fs, t) {
	t.plan(3);

	fs.watch('/test', function() {
		t.ok(true);
	});

	fs.writeFile('/test', new Buffer(1), function() {
		fs.truncate('/test', 10000, function(err) {
			fs.unlink('/test');
		});
	});
});

test('watch() with directory', function(fs, t) {
	t.plan(13);

	fs.watch('/test', function(eventType, filename) {
		if (eventType == 'rename' && filename == '/test/create') {
			t.pass('got rename event for file create')
		}
		if (eventType == 'change' && filename == '/test/create') {
			t.pass('got change event for file create')
		}

		if (eventType == 'rename' && filename == '/test/rename') {
			t.pass('got rename event for file rename')
		}
		if (eventType == 'change' && filename == '/test/rename') {
			t.pass('got change event for file rename')
		}

		if (eventType == 'rename' && filename == '/test/delete') {
			t.pass('got rename event for file delete')
		}
		if (eventType == 'change' && filename == '/test/delete') {
			t.pass('got change event for file delete')
		}
	});

	fs.mkdir('/test', function() {
		fs.writeFile('/test/create', [], function () {
			fs.writeFile('/test/create', 'additional writes do not rename')
			fs.writeFile('/test/create', 'additional writes do not rename')
			fs.writeFile('/test/create', 'additional writes do not rename')
		});
		fs.writeFile('/test/delete', [], function(err) {
			fs.unlink('/test/delete')
		});
		fs.writeFile('/test/rename', [], function(err) {
			fs.rename('/test/rename', '/test/newname')
		});
	});
});
