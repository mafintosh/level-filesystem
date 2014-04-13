var test = require('./helpers/test');

test('symlink', function(fs, t) {
	fs.writeFile('/test.txt', 'hello', function(err) {
		fs.symlink('/test.txt', '/foo', function(err) {
			t.ok(!err);
			fs.readFile('/foo', function(err, data) {
				t.same(data.toString(), 'hello');
 				fs.stat('/test.txt', function(err, stat) {
					t.same(stat.mode, 0666);
 					t.same(stat.size, 5);
					t.ok(stat.isFile());
					t.end();
 				});
			});
 		});
	});
});

test('symlink unlink', function(fs, t) {
	fs.writeFile('/test.txt', 'hello', function(err) {
		fs.symlink('/test.txt', '/foo', function(err) {
			t.ok(!err);
			fs.readFile('/foo', function(err, data) {
				t.same(data.toString(), 'hello');
				fs.unlink('/foo', function(err) {
					t.ok(!err);
	 				fs.stat('/test.txt', function(err, stat) {
						t.same(stat.mode, 0666);
	 					t.same(stat.size, 5);
						t.ok(stat.isFile());
						t.end();
	 				});
				})
			});
 		});
	});
});