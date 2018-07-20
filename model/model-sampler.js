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

    const mode = 'sampler';

    const Gauss = (mu, sigma) => x => {
      return 1 / (Math.sqrt(2 * Math.PI) * sigma)
        * Math.exp(
          - ((x - mu) * (x - mu)) / (2 * sigma * sigma)
        )
    }
    const gauss1 = Gauss(1, 1);
    const gauss2 = Gauss(5, 2);
    const gauss3 = Gauss(-2, 3);

    const model = (parameters, _) => {
      const { x } = parameters[0];
      const f = gauss1(x) + gauss2(x) + gauss3(x);
      return f
    };

    const parameters = [
      {
        'x': 0
      }
    ];

    const updateCondition = {
      'x': {
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
      constrain,
      mode
    };
  }
}))