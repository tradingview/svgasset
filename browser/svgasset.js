/*jshint globalstrict:false*/

var svgAsset = (function(){
	"use strict";
	var _code = {};
	var _wrap;

	var svgAsset = function(name, attrs){
		var code = _code[name];
		if (!code){
			code = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>';
			if (window.console && console.error){
				console.error('svgAsset: "' + name + '" was not registered');
			}
		}
		if (typeof attrs === 'string'){
			var match = /^\s*(\d*)\s*x\s*(\d*)\s*$/i.exec(attrs);
			if (!match){
				throw new TypeError('attrs must be an object or size string');
			}
			attrs = {};
			if (match[1]){
				attrs.width = match[1];
			}
			if (match[2]){
				attrs.height = match[2];
			}
		}
		if (!_wrap){
			_wrap = document.createElement('div');
		}
		_wrap.innerHTML = code;
		for (var i=0; i<_wrap.childNodes.length; i++){
			var node = _wrap.childNodes[i];
			if (node.nodeType === 1){
				_wrap.removeChild(node);
				if (attrs){
					for (var j in attrs){
						node.setAttribute(j, attrs[j]);
					}
				}
				return node;
			}
		}
	};

	svgAsset.register = function(dict){
		for (var i in dict){
			_code[i] = dict[i].toString();
		}
	};

	return svgAsset;
})();