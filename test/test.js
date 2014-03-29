var filesystem = require('../');
var test = require('tap').test;
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb());
};

module.exports = function(name, fn) {
	test(name, function(t) {
		fn(reset(), t);
	});
};