var test = require('./helpers/test');

test('rename dir', function(fs, t) {
    fs.mkdir('/foo', function() {
        fs.rename('/foo', '/bar', function(err) {
            t.notOk(err);

            fs.readdir('/', function(err, list) {
                t.notOk(err);
                t.same(list, ['bar']);
                t.end();
            });
        });
    });
});

test('rename file', function(fs, t) {
    fs.writeFile('/foo', 'test', function(err) {
        t.notOk(err);

        fs.rename('/foo', '/bar', function(err) {
            t.notOk(err);

            fs.readFile('/bar', function(err, contents) {
                t.notOk(err);
                t.same(contents.toString(), 'test');
                t.end();
            });
        });
    });
});

test('rename to non empty dir', function(fs, t) {
    fs.mkdir('/foo', function() {
        fs.mkdir('/bar', function() {
            fs.mkdir('/bar/baz', function() {
                fs.rename('/foo', '/bar', function(err) {
                    t.ok(err);
                    t.same(err.code, 'ENOTEMPTY');

                    fs.readdir('/', function(err, list) {
                        t.notOk(err);
                        t.same(list.sort(), ['bar', 'foo']);
                        t.end();
                    });
                });
            });
        });
    });
});

test('rename non-empty dir', function(fs, t) {
    fs.mkdir('/foo', function() {
        fs.mkdir('/foo/baz', function() {
            fs.writeFile('/foo/baz/zip', 'test', function(err) {
                t.notOk(err);

                fs.rename('/foo', '/bar', function(err) {
                    t.notOk(err);

                    fs.readdir('/', function(err, list) {
                        t.notOk(err);
                        t.same(list.sort(), ['bar']);

                        fs.readdir('/bar', function(err, list) {
                            t.notOk(err);
                            t.same(list.sort(), ['baz']);

                            fs.readdir('/bar/baz', function(err, list) {
                                t.notOk(err);
                                t.same(list.sort(), ['zip']);

                                fs.readFile('/bar/baz/zip', function(err, contents) {
                                    t.notOk(err);
                                    t.same(contents.toString(), 'test');
                                    t.end();
                                });
                            })
                        });
                    });
                });
            })
        });
    });
});
