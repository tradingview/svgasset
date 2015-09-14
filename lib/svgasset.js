/*jshint node:true, strict: true, eqnull: true */
"use strict";

function read(input, callback){
	var buffers = [];
	var callbackFired = false;

	function ready(error, content){
		if (callbackFired){
			return;
		} else {
			callbackFired = true;
		}
		callback(error, content);
	}

	var svgStream = new (require('./svgstream'))();

	svgStream.on('error', function(e){
		ready(e, null);
	});
	svgStream.on('readable', function(){
		var buf = svgStream.read();
		if (buf){
			buffers.push(buf);
		}
	});
	svgStream.on('end', function(){
		ready(null, Buffer.concat(buffers).toString('utf-8'));
	});

	if (input instanceof require('stream').Stream){
		input.pipe(svgStream);
	} else {
		svgStream.end(input);
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