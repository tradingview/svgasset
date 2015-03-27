/*jshint node:true, strict: true, eqnull: true */
"use strict";

function read(input, callback){
	var inputBuffers = [];
	var callbackFired = false;
	var content = '';
	var error = null;

	if (input instanceof require('stream').Stream){
		input.on('readable', function(){
			var data = input.read();
			if (data){
				inputBuffers.push(new Buffer(data));
			}
		});
		input.on('error', function(){
			error = {message: 'Error reading file'};
			validationReady();
		});
		input.on('end', buffersReady);
		input.read(0);
	} else {
		inputBuffers.push(input);
		buffersReady();
	}


	function buffersReady(){
		content = Buffer.concat(inputBuffers).toString('utf-8');
		var parser = require('sax').createStream(true);
		parser.once('opentag', function(tag){
			if (tag.name !== 'svg'){
				error = {message: 'Not an SVG format'};
			}
		});
		parser.on('error', function(){
			error = {message: 'XML parse failed'};
			validationReady();
		});
		parser.on('end', validationReady);
		parser.write(content);
		parser.end();
	}

	function validationReady(){
		if (callbackFired){
			return;
		} else {
			callbackFired = true;
		}
		callback(error, content);
	}
}

function escapeStr(str){
	return str.replace(/'|\r|\n|\t|\\/g, function(c){
		switch (c){
			case "'":
				return "\\'";
			case "\r":
				return "\\r";
			case "\n":
				return "\\n";
			case "\t":
				return "\\t";
			case "\\":
				return "\\\\";
		}
	});
}

function bufferize(contentStr, basename){
	return new Buffer("'" + escapeStr(basename) + "':'" + escapeStr(contentStr) +"'");
}

var OutputStream = function(filenames, options){
	var stream = this;

	require('stream').Readable.call(this);

	var ptr = -1;

	var result = [];
	var successfullWrites = 0;

	filenames = filenames.slice().sort();

	stream.push(Buffer.concat([new Buffer(options && options.writeBefore || ''), new Buffer('{')]));

	function next(){
		ptr++;
		if (ptr >= filenames.length){
			stream.push(Buffer.concat([new Buffer('\n}'), new Buffer(options && options.writeAfter || '')]));
			stream._drained = true;
			return;
		}
		var filename = filenames[ptr];
		stream.emit('progress', filename);
		var basename = require('path').basename(filename).replace(/\.svg$/, '');
		read(require('fs').createReadStream(filename), function(error, content){
			if (error){
				stream.emit('error', error.message);
			} else {
				if (successfullWrites){
					stream.push(new Buffer(',\n'));
				} else {
					stream.push(new Buffer('\n'));
				}
				stream.push(bufferize(content, basename));
				successfullWrites++;
			}
			process.nextTick(next);
		});
	}

	next();
};
require('util').inherits(OutputStream, require('stream').Readable);

OutputStream.prototype._read = function(){
	if (this._drained){
		this.push(null);
	}
};

function svgasset(filenames, options){
	return new OutputStream(filenames, options);
}

module.exports = svgasset;