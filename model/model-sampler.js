(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Model = factory();
  }
}(this, function () {
  return option => {

    const model = (parameters, _) => {
      const { x, y } = parameters[0];
      const f = Math.exp(-x * x) * Math.exp(-y * y);
      return f
    };

    const parameters = [
      {
        'x': 0,
        'y': 0
      }
    ];

    const updateCondition = {
      'x': {
        'max': Infinity,
        'min': -Infinity,
        'val': 1
      },
      'y': {
        'max': Infinity,
        'min': -Infinity,
        'val': 1
      }
    };

    const constrain = {}

    return {
      model,
      parameters,
      updateCondition,
      constrain
    };
  }
}))