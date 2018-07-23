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
    const g1 = Gauss(1,1);
		const g2 = Gauss(5,2);
		const g3 = Gauss(-5,1.5);
		const mixedGauss = x => g1(x) + g2(x) + g3(x)
    
    const model = (parameters, _) => {
      const { x } = parameters[0];
      const f = mixedGauss(x);
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