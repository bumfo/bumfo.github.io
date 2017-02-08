var $jscomp$this = this, $jscomp = {scope:{}, executeAsyncGenerator:function(a) {
  function c(c) {
    return a.next(c);
  }
  function e(c) {
    return a["throw"](c);
  }
  return new Promise(function(w, C) {
    function d(a) {
      a.done ? w(a.value) : Promise.resolve(a.value).then(c, e).then(d, C);
    }
    d(a.next());
  });
}};
$jscomp.defineProperty = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, c, e) {
  if (e.get || e.set) {
    throw new TypeError("ES3 does not support getters and setters.");
  }
  a != Array.prototype && a != Object.prototype && (a[c] = e.value);
};
$jscomp.getGlobal = function(a) {
  return "undefined" != typeof window && window === a ? a : "undefined" != typeof global && null != global ? global : a;
};
$jscomp.global = $jscomp.getGlobal(this);
$jscomp.SYMBOL_PREFIX = "jscomp_symbol_";
$jscomp.initSymbol = function() {
  $jscomp.initSymbol = function() {
  };
  $jscomp.global.Symbol || ($jscomp.global.Symbol = $jscomp.Symbol);
};
$jscomp.symbolCounter_ = 0;
$jscomp.Symbol = function(a) {
  return $jscomp.SYMBOL_PREFIX + (a || "") + $jscomp.symbolCounter_++;
};
$jscomp.initSymbolIterator = function() {
  $jscomp.initSymbol();
  var a = $jscomp.global.Symbol.iterator;
  a || (a = $jscomp.global.Symbol.iterator = $jscomp.global.Symbol("iterator"));
  "function" != typeof Array.prototype[a] && $jscomp.defineProperty(Array.prototype, a, {configurable:!0, writable:!0, value:function() {
    return $jscomp.arrayIterator(this);
  }});
  $jscomp.initSymbolIterator = function() {
  };
};
$jscomp.arrayIterator = function(a) {
  var c = 0;
  return $jscomp.iteratorPrototype(function() {
    return c < a.length ? {done:!1, value:a[c++]} : {done:!0};
  });
};
$jscomp.iteratorPrototype = function(a) {
  $jscomp.initSymbolIterator();
  a = {next:a};
  a[$jscomp.global.Symbol.iterator] = function() {
    return this;
  };
  return a;
};
$jscomp.makeIterator = function(a) {
  $jscomp.initSymbolIterator();
  var c = a[Symbol.iterator];
  return c ? c.call(a) : $jscomp.arrayIterator(a);
};
$jscomp.arrayFromIterator = function(a) {
  for (var c, e = [];!(c = a.next()).done;) {
    e.push(c.value);
  }
  return e;
};
$jscomp.arrayFromIterable = function(a) {
  return a instanceof Array ? a : $jscomp.arrayFromIterator($jscomp.makeIterator(a));
};
!function() {
  var a = function() {
  };
  a.prototype.explicit = function(a) {
    a = a[0];
    return "." === a || "/" === a;
  };
  a.prototype.foldername = function(a) {
    var d = a.lastIndexOf("/");
    return c.filename(a.substring(a.lastIndexOf("/", d - 1) + 1, d));
  };
  a.prototype.filename = function(a) {
    return a.substr(a.lastIndexOf("/") + 1);
  };
  a.prototype.extension = function(a) {
    a = c.filename(a);
    var d = a.lastIndexOf(".");
    return -1 !== d ? a.substr(d + 1) : "";
  };
  a.prototype.basedir = function(a) {
    return a.substr(0, a.lastIndexOf("/") + 1);
  };
  a.prototype.basedir2 = function(a) {
    var d = a.lastIndexOf("/");
    return -1 !== d ? a.substr(0, d) : a;
  };
  a.prototype.normalize = function(a) {
    a = a.split("/");
    for (var b = 0;b < a.length;++b) {
      switch(a[b]) {
        case ".":
          a.splice(b--, 1);
          break;
        case "..":
          0 < b && (1 < b || "" !== a[0]) ? (a.splice(--b, 2), --b) : a.splice(b--, 1);
      }
    }
    return a.join("/");
  };
  a.prototype.resolve = function(a) {
    for (var b = [], d = 0;d < arguments.length;++d) {
      b[d - 0] = arguments[d];
    }
    for (var d = b[b.length - 1], l = b.length - 2;0 <= l && "/" !== d[0];--l) {
      d = c.basedir(b[l]) + d;
    }
    return c.normalize(d);
  };
  a.prototype.relative = function(a, b) {
    if (b.substr(0, a.length) !== a) {
      throw console.warn(a, b), new RangeError;
    }
    return b.substr(a.length);
  };
  var c = new a, e = function() {
    function a(a) {
      return a.split(",").map(function(a) {
        return a.trim().split(/\b(?:as)\b/).map(function(a) {
          return a.trim();
        });
      }).map(function(a) {
        return [a[0], a[1] || a[0]];
      });
    }
    function b(a) {
      return a.map(function(a) {
        return "exports." + a[1] + " = " + a[0];
      }).join("\n");
    }
    function c(a) {
      return a.map(function(a) {
        return "__exportGetter('" + a[1] + "', () => " + a[0] + ")";
      }).join("\n");
    }
    var l = function(a, b) {
      for (var d = [], c = 1;c < arguments.length;++c) {
        d[c - 1] = arguments[c];
      }
      return new RegExp(d.map(function(a) {
        return a.source;
      }).join("|"), a);
    }("gm", /(['"])((?:(?!\1|\\).|\\.)*)\1/, /\/\/.*$|\/\*(?:[^*]|\*(?!\/))\*\//, /\b(import)\b\s*(?:([A-Za-z_$][\w$]*)\s*(?:\b(as)\b\s*([A-Za-z_$][\w$]*)\s*)?(?:,\s*(?=\{|\*)|(?=\b(?:from)\b)))?(?:\*\s*(?:\b(as)\b\s*([A-Za-z_$][\w$]*)\s*)?|\{([^}]*)\})?\s*?\b(from)\b\s*(?=['"])/, /\b(export)\b\s*(?:\b(default)\b\s*)?(?:\{([^}]*)\}|(?:\b(var|let|const|class|function|async[ \t]+function)\b\s*)(?:([A-Za-z_$][\w$]*)))/);
    return function(d, e, x) {
      var r = !1, h = "", m = [], y = [], p = [];
      d = d.replace(l, function(d, b, c, l, q, k, f, D, g, G, L, K, B, H, v, u) {
        if (b) {
          if (r) {
            return r = !1, g = e(c), x.push(g), g = "__import(" + b + g + b + ")" + h, h = "", g;
          }
        } else {
          if (l) {
            return r = !0, b = [], q && b.push("default: " + (f || q)), G && (q = a(G), b.push.apply(b, [].concat($jscomp.arrayFromIterable(q.map(function(a) {
              return a[0] === a[1] ? a[0] : a[0] + ": " + a[1];
            }))))), g ? (b.length && (h = ", { " + b.join(", ") + (" } = " + g)), "const " + g + " = ") : "const { " + b.join(", ") + " } = ";
          }
          if (K) {
            if (H) {
              return g = a(H), m.push.apply(m, [].concat($jscomp.arrayFromIterable(g))), "";
            }
            /\b(?:var|let)\b/.test(v) ? p.push([u, B ? "default" : u]) : ("function" === v.substr(-8) ? y : m).push([u, B ? "default" : u]);
            return v + " " + u;
          }
        }
        return d;
      });
      return d = [b(y), c(p), d, b(m)].join("\n");
    };
  }(), w = function() {
    return function(a) {
      for (var b = [], d = 0;d < arguments.length;++d) {
        b[d - 0] = arguments[d];
      }
      return {grow:function(a) {
        return new Promise(function(d) {
          var c = 0, l = function(b) {
            return b.forEach(function(b) {
              return $jscomp.executeAsyncGenerator(function() {
                function m(m, h) {
                  for (;;) {
                    switch(e) {
                      case 0:
                        return ++c, t = l, e = 1, {value:a(b), done:!1};
                      case 1:
                        if (void 0 === h) {
                          e = 2;
                          break;
                        }
                        e = -1;
                        throw h;
                      case 2:
                        p = m, t(p), --c, 0 === c && d(), e = -1;
                      default:
                        return {value:void 0, done:!0};
                    }
                  }
                }
                var e = 0, p, t, h = {next:function(a) {
                  return m(a, void 0);
                }, "throw":function(a) {
                  return m(void 0, a);
                }, "return":function(a) {
                  throw Error("Not yet implemented");
                }};
                $jscomp.initSymbolIterator();
                h[Symbol.iterator] = function() {
                  return this;
                };
                return h;
              }());
            });
          };
          l(b);
        });
      }};
    };
  }(), C = function() {
    return function(a) {
      return new Promise(function(b, d) {
        var c = new XMLHttpRequest;
        c.open("post", a);
        c.onload = function() {
          200 === c.status ? b(c.responseText) : d(c.status);
        };
        c.send();
      });
    };
  }(), a = function() {
    function a(a, b, c) {
      return {baseuri:a, uri:b, loader:c};
    }
    function b(a) {
      var b = a.lastIndexOf(".");
      return -1 === b ? !1 : F[a.substr(b)];
    }
    function x(a) {
      return a;
    }
    function l(a, b) {
      return z[b] ? z[b] : t[b] ? b : c.resolve(a, b);
    }
    function I(c) {
      var d = c.uri, D = c.loader;
      return $jscomp.executeAsyncGenerator(function() {
        function c(c, g) {
          for (;;) {
            switch(f) {
              case 0:
                n = d;
                if (!t[n] && !m[n]) {
                  f = 1;
                  break;
                }
                f = -1;
                return {value:[], done:!0};
              case 1:
                if (!D) {
                  f = 2;
                  break;
                }
                m[n] = C(A + n);
                x = p;
                w = n;
                r = D;
                f = 3;
                return {value:m[n], done:!1};
              case 3:
                if (void 0 === g) {
                  f = 4;
                  break;
                }
                f = -1;
                throw g;
              case 4:
                return u = c, x[w] = {"default":r(u)}, f = -1, {value:[], done:!0};
              case 2:
                return v = [], m[n] = C(A + n), q = y, B = n, h = e, f = 5, {value:m[n], done:!1};
              case 5:
                if (void 0 === g) {
                  f = 6;
                  break;
                }
                f = -1;
                throw g;
              case 6:
                return k = c, q[B] = h(k, function(a) {
                  return l(n, a);
                }, v), f = -1, {value:v.map(function(c) {
                  return a(n, c, b(c));
                }), done:!0};
              default:
                return {value:void 0, done:!0};
            }
          }
        }
        var f = 0, k, h, B, q, v, u, r, w, x, n, z = {next:function(a) {
          return c(a, void 0);
        }, "throw":function(a) {
          return c(void 0, a);
        }, "return":function(a) {
          throw Error("Not yet implemented");
        }};
        $jscomp.initSymbolIterator();
        z[Symbol.iterator] = function() {
          return this;
        };
        return z;
      }());
    }
    function J(c, d) {
      return $jscomp.executeAsyncGenerator(function() {
        function f(f, k) {
          for (;;) {
            switch(g) {
              case 0:
                return g = 1, {value:w(a(c, d, b(d))).grow(function(a) {
                  return I(a);
                }), done:!1};
              case 1:
                if (void 0 === k) {
                  g = 2;
                  break;
                }
                g = -1;
                throw k;
              case 2:
                return g = -1, {value:h(d), done:!0};
              default:
                return {value:void 0, done:!0};
            }
          }
        }
        var g = 0, k = {next:function(a) {
          return f(a, void 0);
        }, "throw":function(a) {
          return f(void 0, a);
        }, "return":function(a) {
          throw Error("Not yet implemented");
        }};
        $jscomp.initSymbolIterator();
        k[Symbol.iterator] = function() {
          return this;
        };
        return k;
      }());
    }
    function E(a) {
      return {"import":function(c) {
        return $jscomp.executeAsyncGenerator(function() {
          function b(b, k) {
            for (;;) {
              switch(d) {
                case 0:
                  e = l(a, c);
                  if (!p[e] && !y[e]) {
                    d = 1;
                    break;
                  }
                  d = -1;
                  return {value:h(e), done:!0};
                case 1:
                  return d = 2, {value:J(a, e), done:!1};
                case 2:
                  if (void 0 === k) {
                    d = 3;
                    break;
                  }
                  d = -1;
                  throw k;
                case 3:
                  return f = b, d = -1, {value:f, done:!0};
                default:
                  return {value:void 0, done:!0};
              }
            }
          }
          var d = 0, f, e, k = {next:function(a) {
            return b(a, void 0);
          }, "throw":function(a) {
            return b(void 0, a);
          }, "return":function(a) {
            throw Error("Not yet implemented");
          }};
          $jscomp.initSymbolIterator();
          k[Symbol.iterator] = function() {
            return this;
          };
          return k;
        }());
      }, set:function(a, b) {
        if (t[a]) {
          throw new TypeError;
        }
        t[a] = 1;
        p[a] = b;
      }, map:function(b, c) {
        if (t[b]) {
          throw new TypeError;
        }
        z[b] = l(a, c);
      }, root:function(b) {
        if (A.length) {
          throw new TypeError;
        }
        A = l(a, b);
        a = c.relative(A, a);
      }, customize:function(a, b) {
        F[a] = b || x;
      }};
    }
    function r(a, b, c) {
      Object.defineProperty(a, b, {get:c});
    }
    function h(a) {
      var b = p[a];
      if (b) {
        return b;
      }
      var b = p[a] = Object.create(null), c = ["console.log('--- " + a + "');", "return function(exports, __import, __exportGetter, System) {'use strict';\n\n", y[a], "\n}"].join("");
      (new Function(c))()(b, h, r.bind(null, b), E(a));
      Object.freeze(b);
      return b;
    }
    var m = {}, y = {}, p = {"std/math":Math, "std/object":Object}, t = {"std/math":1, "std/object":1}, z = {}, A = "", F = {}, q;
    try {
      q = window.location.pathname;
    } catch (k) {
      q = module.id;
    }
    return {System:E(q)};
  }().System;
  $jscomp$this.System = a;
}();
