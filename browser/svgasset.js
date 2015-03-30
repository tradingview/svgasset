var SvgAsset = (function(){
	var _code = {};
	var _wrap;

	var SvgAsset = function(name, options){
		if (!_code[name]){
			throw new Error('Asset ' + name + ' was not registered');
		}
		if (!_wrap){
			_wrap = document.createElement('div');
		}
		_wrap.innerHTML = _code[name];
		for (var i=0; i<_wrap.childNodes; i++){
			var node = _wrap.childNodes[i];
			if (node.nodeType === 1){
				_wrap.removeChild(node);
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