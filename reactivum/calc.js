/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Reactivum = __webpack_require__(1);

	var demoVum = Reactivum({
		input0: 1,
		input: 2,
		result: 3
	}, '#demo');

	demoVum.$listen('input', function () {
		demoVum.result = +demoVum.input0 + +demoVum.input;
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Emitter = __webpack_require__(2);
	var ready = __webpack_require__(3);

	var Reactive = (function () {
		function Reactive(model) {
			_classCallCheck(this, Reactive);

			this.$_model = model;
			this.$_emitter = new Emitter();
			this.$_listener = new Emitter();
		}

		_createClass(Reactive, [{
			key: '$listen',
			value: function $listen(name, fn) {
				this.$_listener.on(name, fn);
			}
		}]);

		return Reactive;
	})();

	function Model(model) {
		var reactive = new Reactive(model);

		Object.keys(model).forEach(function (name) {
			Object.defineProperty(reactive, name, {
				enumerable: true,
				get: function get() {
					return model[name];
				},
				set: function set(val) {
					model[name] = val;
					reactive.$_emitter.emit(name, val);
				}
			});
		});

		return reactive;
	}

	function biforeachDom(parentNode, fnSet) {
		for (var i = 0, n = parentNode.childNodes.length; i < n; ++i) {
			var node = parentNode.childNodes[i];

			switch (node.nodeType) {
				case Node.ELEMENT_NODE:
					fnSet.elementNode(node);
					biforeachDom(node, fnSet);
					break;
				case Node.TEXT_NODE:
					fnSet.textNode(node);
					break;
			}
		}
	}

	function foreachAttribute(node, fn) {
		for (var i = 0, n = node.attributes.length; i < n; ++i) {
			var attribute = node.attributes[i];

			fn(attribute);
		}
	}

	var attributeGetReflects = {
		value: function value(node) {
			return node.value;
		}
	};

	function getAttributeValue(node, attribute) {
		if (attributeGetReflects.hasOwnProperty(attribute.name)) {
			return attributeGetReflects[attribute.name](node);
		} else {
			return attribute.value;
		}
	}

	var attributeSetReflects = {
		value: function value(node, val) {
			return node.value = val;
		}
	};

	function setAttributeValue(node, attribute, value) {
		if (attributeSetReflects.hasOwnProperty(attribute.name)) {
			attributeSetReflects[attribute.name](node, value);
		} else {
			attribute.value = value;
		}
	}

	function bindDom(model, selector) {
		var reg = /\{\{\s*([a-zA-Z_$][\w$]*)\s*\}\}/g;
		var container = document.querySelector(selector);

		function getNewValue(template) {
			return template.replace(reg, function (u, v) {
				return model[v];
			});
		}

		function updateNode(node, template) {
			var newValue = getNewValue(template);

			if (node.nodeValue !== newValue) node.nodeValue = newValue;
		}

		function updateAttribute(node, attribute, template) {
			var newValue = getNewValue(template);

			if (getAttributeValue(node, attribute) !== newValue) {
				setAttributeValue(node, attribute, newValue);
			}
		}

		function getTemplateFetchRegex(template, names) {
			return new RegExp('^' + template.replace(/[\[\]+\.*\(\)\^\$]/g, function (u) {
				return '\\' + u;
			}).replace(reg, function (u, v) {
				names.push(v);
				return '(.*?)';
			}).replace(/[\{\}]/g, function (u) {
				return '\\' + u;
			}) + '$');
		}

		function fetchValues(node, attribute, regex, names) {
			var value = getAttributeValue(node, attribute);

			var match = value.match(regex);

			if (!match) {
				return null;
			}

			var result = {};

			names.forEach(function (u, i) {
				result[u] = match[i + 1];
			});

			return result;
		}

		var elementAttributeChangeReflects = {
			INPUT: {
				value: function value(element, fn) {
					return element.addEventListener('input', function (e) {
						fn();
					});
				}
			}
		};

		var fnSet = {
			textNode: function textNode(node) {
				var template = node.nodeValue;

				var newText = template.replace(reg, function (u, v) {
					model.$_emitter.on(v, function (val) {
						updateNode(node, template);
					});
					return model[v];
				});

				if (template !== newText) node.nodeValue = newText;
			},
			elementNode: function elementNode(node) {
				foreachAttribute(node, function (attribute) {
					return fnSet.attribute(node, attribute);
				});
			},
			attribute: function attribute(node, _attribute) {
				var template = _attribute.value;

				var names = [];
				var regex = getTemplateFetchRegex(template, names);

				var handler = function handler() {
					var values = fetchValues(node, _attribute, regex, names);

					if (!values) {
						updateAttribute(node, _attribute, template);
						return;
					}

					template.replace(reg, function (u, v) {
						model[v] = values[v];
						model.$_listener.emit(v);

						return u;
					});
				};

				if (elementAttributeChangeReflects.hasOwnProperty(node.nodeName)) {
					var eventReflects = elementAttributeChangeReflects[node.nodeName];

					if (eventReflects.hasOwnProperty(_attribute.name)) {
						eventReflects[_attribute.name](node, handler);
					}
				}

				var newText = template.replace(reg, function (u, v) {
					model.$_emitter.on(v, function (val) {
						updateAttribute(node, _attribute, template);
					});

					return model[v];
				});

				setAttributeValue(node, _attribute, newText);
			}
		};

		biforeachDom(container, fnSet);
	}

	function Reactivum(defaults, selector) {
		var model = Model(defaults);

		ready(function () {
			return bindDom(model, selector);
		});

		return model;
	}

	module.exports = Reactivum;

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Emitter = (function () {
		function Emitter() {
			_classCallCheck(this, Emitter);

			this._callbacks = new Map();
		}

		_createClass(Emitter, [{
			key: "on",
			value: function on(event, listener) {
				this.getListeners(event).push(listener);
			}
		}, {
			key: "emitRest",
			value: function emitRest(event) {
				var arr = this.getListeners(event);
				for (var i = 0, n = arr.length; i < n; ++i) {
					for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
						args[_key - 1] = arguments[_key];
					}

					arr[i].apply(arr, args);
				}
			}
		}, {
			key: "emit",
			value: function emit(event, e) {
				var arr = this.getListeners(event);
				for (var i = 0, n = arr.length; i < n; ++i) {
					arr[i](e);
				}
			}
		}, {
			key: "getListeners",
			value: function getListeners(event) {
				var listeners = this._callbacks.get(event);
				return (listeners || this._callbacks.set(event, listeners = []), listeners);
			}
		}]);

		return Emitter;
	})();

	module.exports = Emitter;

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	var isReady = false;
	var readyList = [];

	window.addEventListener('DOMContentLoaded', function () {
		isReady = true;
		readyList.forEach(function (fn) {
			return fn();
		});
		readyList = null;
	});

	function ready(fn) {
		if (isReady) {
			fn();
		} else {
			readyList.push(fn);
		}
	}

	module.exports = ready;

/***/ }
/******/ ]);