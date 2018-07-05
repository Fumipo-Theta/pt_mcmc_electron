(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.funcTools = factory();
  }
}(this, function () {
  const funcTools = {
    Y: f => {
      return (
        x => f(y => x(x)(y))
      )(
        x => f(y => x(x)(y))
      )
    },

    recursive: base => a => n => base(n, a),

    recursiveExtender: custom => templateFunc => f => templateFunc(custom(f)),


    memoize: cache => f => {
      return arg => {
        if (!(arg in cache)) {

          cache[arg] = f(arg);
        }
        return cache[arg];
      }
    },

    trace: f => arg => {
      console.log(`called with argument ${arg}`);
      return f(arg)
    },

    composite: function (...func) {
      return a => func.reverse().reduce((f, g) => g(f), a)
    },

    G: {
      take: n => function* (g) {
        for (let i = 0; i < n; i++) {
          let x = g.next();
          if (x.done) return;
          yield x.value;
        }
      },

      nest: f => function* (x) {
        let y = x;
        while (true) {
          yield y;
          y = f(y);
        }
      }


    },

    zipWith: f => xs => ys =>
      xs.length < ys.length ? xs.map((e, i) => f(e, ys[i])) : ys.map((e, i) => f(xs[i], e)),

    zip: xs => ys =>
      xs.length < ys.length ? xs.map((e, i) => [e, ys[i]]) : ys.map((e, i) => [xs[i], e])

  }

  return funcTools;
}))