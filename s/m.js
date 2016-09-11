'use strict';

(function() {
	if (typeof this.require !== 'undefined')
		return false;

	class Context {
		constructor(module) {
			this.module = module;
		}
	}

	class Module {
		constructor(id, filename) {
			this.id = id;
			this.filename = filename;
		}
	}

	class Path {
		static isExplicit(path) {
			var firstChar = path[0];

			return firstChar === '.' || firstChar === '/';
		}

		static foldername(path) {
			var lastSlash = path.lastIndexOf('/');

			return this.filename(path.substring(path.lastIndexOf('/', lastSlash - 1) + 1, lastSlash));
		}

		static filename(path) {
			return path.substr(path.lastIndexOf('/') + 1); // take caution: works even if '/' is not found
		}

		static extension(path) {
			var filename = this.filename(path);

			var dotIndex = filename.lastIndexOf('.');
			if (dotIndex !== -1)
				return filename.substr(dotIndex + 1);
			return '';
		}

		static basedir(path) {
			return path.substr(0, path.lastIndexOf('/') + 1);
		}

		static basedir2(path) {
			var lastSlash = path.lastIndexOf('/');
			if (lastSlash !== -1)
				return path.substr(0, lastSlash);
			return path;
		}

		static normalize(url) {
			var parts = url.split('/');

			for (var i = 0; i < parts.length; ++i) {
				switch (parts[i]) {
					case '.':
						parts.splice(i--, 1);
						break;
					case '..':
						if (i > 0 && (i > 1 || parts[0] !== '')) {
							parts.splice(--i, 2);
							--i;
						} else {
							parts.splice(i--, 1);
						}
						break;
				}
			}
			return parts.join('/');
		}

		static resolve() {
			var paths = Array.prototype.slice.call(arguments);
			return this.normalize(paths.reduce(function(dir, path) {
				return Path.basedir(dir) + path;
			}));
		}
	}

	var _script_source = new Map();
	var _contexts = new Map();
	var _loading = new Map();

	function normalize(url, base) {
		return Path.resolve(base, url);
	}

	function getData(src) {
		var request = new XMLHttpRequest();
		// request.open('post', src, false); // preventing cache, see: https://code.google.com/p/chromium/issues/detail?id=570622
		request.open('get', src, false);
		request.send();
		if (request.status !== 200)
			throw new Error('Undefined behavior of status code ' + request.status + ', 200 expected. ');

		return request.responseText;
	}

	function tryGetData(src, obj) {
		var request = new XMLHttpRequest();
		request.open('get', src, false);
		request.send();
		if (request.status !== 200)
			return false;

		obj.data = request.responseText;
		return true;
	}

	function getDataAsync(src) {
		var request = new XMLHttpRequest();
		request.open('get', src, true);
		request.send();
		return new Promise(function(done) {
			request.onreadystatechange = function() {
				if (this.readyState === 4)
					done(this.responseText);
			};
		});
	}


	function bindRequire(base_context) {

		function exec(source, id) {
			var module = new Module(id, id);
			var context = new Context(module);
			module.exports = context;
			module.parent = base_context.module;

			var getWrapper = new Function('\'use strict\'; return function(exports, module, require, __filename, __dirname) {\n' + source + '}');
			getWrapper().call(context, context, module, bindRequire(context), id, Path.basedir2(id));
			return context;
		}

		function load(id, base) {
			if (_loading.get(id))
				throw new Error('Circular dependencies detected. ');

			_loading.set(id, true);

			var source = _script_source.get(id);
			if (!source) {
				try {
					source = getData(id);
				} catch (ex) {
					console.warn('Warning:', 'require(' + id + ') failed', 'in', base);
					throw new Error('Failed to require');
				}
				_script_source.set(id, source);
			}
			console.log('---', id);
			var context = exec(source, id);
			_contexts.set(id, context);
			return context;
		}

		function tryLoad(id, base, obj) {
			var context = _contexts.get(id);

			if (!context) {
				if (_loading.get(id))
					throw new Error('Circular dependencies detected. ');

				var source = _script_source.get(id);
				if (!source) {
					var obj = {};
					if (tryGetData(id, obj)) {
						source = obj.data;
						_script_source.set(id, source);
					} else {
						return false;
					}
				}

				_loading.set(id, true);
				console.log('---', id);


				context = exec(source, id);
				_contexts.set(id, context);
			}

			obj.data = context;

			return true;
		}

		function require(src) {
			var base = base_context.module.id;

			var id;

			if (Path.isExplicit(src)) {
				if (Path.extension(src) === '')
					src += '.js';

				id = normalize(src, base);
			} else {
				if (Path.extension(src) === '')
					src += '.js';

				if (Path.foldername(base) !== 'node_modules')
					id = normalize('./node_modules/' + src, base);
				else
					id = normalize('./' + src, base);

				var prefixes = '';
				var isSuccess = false;

				var oldId = id;
				do {
					var obj = {};
					// console.log(id);
					if (tryLoad(id, base, obj)) {
						isSuccess = true;
						break;
					}

					oldId = id;

					prefixes = '../' + prefixes;

					id = normalize(prefixes + 'node_modules/' + src, base);
				} while (id !== oldId);

				if (!isSuccess) {
					throw new Error('Failed to load implict module \'' + src + '\'');
				}
			}

			var context = _contexts.get(id);

			if (!context)
				context = load(id, base);

			var module = context.module;

			if (typeof module.exports !== 'undefined' && module.exports !== context)
				return module.exports;

			return context;
		}

		function ensure(dependencies, src) {
			var base = base_context.module.id;

			var count = 0,
				desiredCount = dependencies.length + 1;

			dependencies.forEach(function(srcDep) {
				var idDep = normalize(srcDep, base);

				getDataAsync(srcDep, function(text) {
					++count;
					_script_source.set(idDep, text);
					if (count >= desiredCount) {
						load(id);
					}
				});
			});

			getDataAsync(src, function(text) {
				++count;
				_script_source.set(id, text);
				if (count >= desiredCount) {
					load(id);
				}
			});
		}

		require.ensure = ensure;
		require.bindRequire = bindRequire;

		return require;
	}

	this.require = bindRequire(new Context(new Module((function() {
		try {
			return window.location.pathname;
		} catch (e) {
			return module.id;
		}
	})())));

}.call(this));
