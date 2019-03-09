var test = require('./helpers/test');

test('appendFile', function(fs, t) {
	fs.writeFile('/test.txt', 'hello', function(err) {
		t.ok(!err);

		fs.appendFile('/test.txt', ' world', function(err) {
			t.ok(!err);

			fs.readFile('/test.txt', function(err, data) {
				t.ok(!err);

				t.same(data.toString(), 'hello world');

				t.end();
			});
		});
	});
});
