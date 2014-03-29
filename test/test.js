var filesystem = require('../');
var test = require('tape');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb());
};

module.exports = function(name, fn) {
	test(name, function(t) {
		fn(reset(), t);
	});
};