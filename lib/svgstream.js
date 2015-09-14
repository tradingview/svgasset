function escape(str){
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

var attrOrder = ['xmlns', 'viewBox', 'width', 'height', /^fill/, /^stroke/, /^[cr]?[xy]$/, '*', 'id', 'class', 'style'];

function _getOrder(str){
	var defaultOrder = Infinity;
	for (var i = 0; i < attrOrder.length; i++){
		var pattern = attrOrder[i];
		if (pattern === '*'){
			defaultOrder = i;
			continue;
		}
		if (pattern instanceof RegExp){
			if (pattern.test(str)){
				return i;
			}
		} else {
			if (pattern === str){
				return i;
			}
		}
	}
	return defaultOrder;
}

function attrSorter(a, b){
	var aLocal = a.local || a.prefix;
	var bLocal = b.local || b.prefix;
	// Try predefined order
	var aOrder = _getOrder(aLocal);
	var bOrder = _getOrder(bLocal);
	if (aOrder !== bOrder){
		return aOrder - bOrder;
	}
	// Sort alphanumeric
	if (aLocal < bLocal){
		return -1;
	} else if (aLocal > bLocal) {
		return 1;
	}
	// Okay, names are the same. Try prefix
	if (a.prefix < b.prefix){
		return -1;
	} else if (a.prefix > b.prefix) {
		return 1;
	}
	return 0;
}

var Transform = require('stream').Transform;

function SvgStream(){
	if (!(this instanceof SvgStream)){
		return new SvgStream();
	}
	Transform.call(this);

	var stream = this;
	var sax = require("sax").createStream(true, {
		'xmlns': true,
		'trim': true,
		'normalize': true
	});
	stream._sax = sax;

	sax.on('error', function(e){
		// Re-emit errors
		stream.emit('error', e);
	});

	sax.on('text', function(text){
		stream._out(escape(text));
	});

	// 'doctype' is intentionally ignored

	sax.on('processinginstruction', function(e){
		if (e.name === 'xml'){
			// XML declaration is ignored
			return;
		}
		stream._out('<?' + e.name + ' ' + e.body + '?>');
	});

	// 'sgmldeclaration' is ignored

	sax.once('opentag', function(e){
		if (e.local !== 'svg'){
			stream.emit('error', new Error('Not an SVG format'));
		}
	});

	sax.on('opentag', function(e){
		var str = '<' + (e.prefix ? (e.prefix + ':') : '') + e.local;
		var attrs = Object.keys(e.attributes).map(function(key){return e.attributes[key];}).sort(attrSorter);

		for (var i=0; i<attrs.length; i++){
			var attr = attrs[i];
			var local = attr.local;
			var prefix = attr.prefix;
			if (prefix && !local){
				local = prefix;
				prefix = '';
			}
			str += ' ' + (prefix ? (prefix + ':') : '') + local + '="' + escape(attr.value) + '"';
		}

		stream._out(str);
		stream._unclosedTag = true;
	});

	sax.on('closetag', function(tagname){
		if (stream._unclosedTag){
			stream._unclosedTag = false;
			stream._out('/>');
			return;
		}
		stream._out('</' + tagname + '>');
	});

	sax.on('opencdata', function(){
		stream._out('<![CDATA[');
	});
	sax.on('cdata', function(text){
		stream._out(text);
	});
	sax.on('closecdata ', function(){
		stream._out(']]>');
	});

	sax.on('end', function(){
		stream._finished = true;
	});
}

require('util').inherits(SvgStream, Transform);

SvgStream.prototype._transform = function(data, encoding, callback){
	this._sax.write(data);
	callback();
	if (this._finished){
		this.emit('end');
	}
};

SvgStream.prototype._out = function(str){
	if (this._unclosedTag){
		str = '>' + str;
		this._unclosedTag = false;
	}
	this.push(str);
};

module.exports = SvgStream;
