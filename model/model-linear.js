(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Model = factory();
  }
}(this, function () {
  return _ => {
    const model = (parameter, data) => {
      var m = {}
      m.x = data.x;
      m.y = data.x.map(v => parameter[0].a * v + parameter[0].b)
      return m;
    }

    const parameters = [
      { a: 1, b: 0 }
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
      }
    }

    const constrain = {
    };

    return {
      model,
      parameters,
      updateCondition,
      constrain
    };
  }
}
))
