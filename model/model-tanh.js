(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Model = factory();
  }
}(this, function () {
  return (option) => {
    const model = (parameter, data) => {
      var m = {}
      m.x = data.x;
      m.y = data.x.map(v => parameter[0].a * Math.tanh(v / parameter[0].b) + parameter[0].c)
      return m;
    }

    const parameters = [
      { a: 1, b: 1, c: 0 }
    ]

    const updateCondition = {
      a: {
        max: Infinity,
        min: -Infinity,
        val: 0.1
      },
      b: {
        max: Infinity,
        min: -Infinity,
        val: 0.1
      },
      c: {
        max: Infinity,
        min: -Infinity,
        val: 0.1
      }
    }

    const constrain = {
      b: (cand, i, parameters) => cand !== 0
    };

    return {
      model,
      parameters,
      updateCondition,
      constrain
    };
  }
}))
