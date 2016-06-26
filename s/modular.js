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
		constructor(id) {
			this.id = id;
		}
	}

	class Path {
		static filename(path) {
			return path.substr(path.lastIndexOf('/') + 1);
		}

		static basedir(path) {
			return path.substr(0, path.lastIndexOf('/') + 1);
		}

		static normalize(url) {
			let parts = url.split('/');

			for (let i = 0; i < parts.length; ++i) {
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

		static resolve(...paths) {
			return this.normalize(paths.reduce((dir, path) => {
				return this.basedir(dir) + path;
			}));
		}
	}

	let _script_source = new Map();
	let _contexts = new Map();
	let _loading = new Map();

	function normalize(url, base) {
		return Path.resolve(base, url);
	}

	function getData(src) {
		let request = new XMLHttpRequest();
		// request.open('post', src, false); // preventing cache, see: https://code.google.com/p/chromium/issues/detail?id=570622
		request.open('get', src, false);
		request.send();
		if (request.status !== 200)
			throw new Error('Undefined behavior of status code ' + request.status + ', 200 expected. ');

		return request.responseText;
	}

	function getDataAsync(src) {
		let request = new XMLHttpRequest();
		request.open('get', src, true);
		request.send();
		return new Promise(done => {
			request.onreadystatechange = () => {
				if (this.readyState === 4)
					done(this.responseText);
			};
		});
	}

	function exec(source, id) {
		let module = new Module(id);
		let context = new Context(module);
		module.exports = context;

		let getWrapper = new Function('\'use strict\'; return function(module, exports, require) {\n' + source + '}');
		getWrapper().call(context, module, context, bindRequire(context));
		return context;
	}

	function load(id, base) {
		if (_loading.get(id))
			throw new Error('Circular dependencies detected. ');

		_loading.set(id, true);

		let source = _script_source.get(id);
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
		let context = exec(source, id);
		// _loading.set(id, false); // unnecessary
		_contexts.set(id, context);
		return context;
	}

	function bindRequire(base_context) {
		function require(src) {
			let base = base_context.module.id;
			let id = normalize(src, base);

			let context = _contexts.get(id);

			if (!context)
				context = load(id, base);

			let module = context.module;

			if (typeof module.exports !== 'undefined' && module.exports !== context)
				return module.exports;

			return context;
		}

		function ensure(dependencies, src) {
			let base = base_context.module.id;

			let count = 0,
				desiredCount = dependencies.length + 1;

			dependencies.forEach(function(srcDep) {
				let idDep = normalize(srcDep, base);

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

		return require;
	}

	this.require = bindRequire(new Context(new Module((() => {
		try {
			return this.location.pathname;
		} catch (e) {
			return module.id;
		}
	})())));
}.call(this));
