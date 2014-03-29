var filesystem = require('../');
var test = require('tap').test;
var level = require('level');
var memdb = require('memdb');

var reset = function() {
	return filesystem(memdb({valueEncoding:'json'}));
};

module.exports = function(name, fn) {
	test(name, function(t) {
		fn(reset(), t);
	});
};