var SvgAsset = (function(){
	var _code = {};
	var _wrap;

	var SvgAsset = function(name, attrs){
		if (!_code[name]){
			throw new Error('Asset ' + name + ' was not registered');
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
		_wrap.innerHTML = _code[name];
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

	SvgAsset.register = function(dict){
		for (var i in dict){
			_code[i] = dict[i].toString();
		}
	};

	return SvgAsset;
})();