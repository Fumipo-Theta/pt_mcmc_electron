(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.testData = factory(root.MersenneTwister);
  }
}(this, function (_mt) {

  const mt = (typeof require === 'undefined' && (typeof _mt === 'object' || typeof _mt === 'function'))
    ? _mt
    : require("../../../jslib/mt");



  const rand = new mt(100);
  var normal = (m, s) => {
    const r1 = rand.next(), r2 = rand.next();
    const PI = Math.PI; return m + s * (Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * PI * r2))
  }

  const answer = {
    noise: (s) => normal(0, s),
  }
  answer.linear = {
    y: (x) => x * 5 - 2,
    z: (x) => x * 10 + 3,
  }
  answer.tanh = {
    y: (x) => 10 * Math.tanh(x / 2) - 5
  }

  const testData = {}
  testData.linear = ((a) => {
    const x = a.map((_, i) => i);
    const y = x.map(v => answer.linear.y(v) + answer.noise(2));
    const z = x.map(v => answer.linear.z(v) + answer.noise(3))
    const data = { x, y, z };

    const error = {
      x: data.x.map((v, i) => 0.),
      y: data.y.map((v, u) => 2),
      z: data.z.map((v, u) => 3)
    }
    return { data, error }
  })(Array(10).fill(0));

  testData.tanh = ((a) => {
    const x = a.map((_, i) => i - 3);
    const y = x.map(v => answer.tanh.y(v) + answer.noise(2))
    const data = { x, y };
    const error = {
      x: data.x.map((v, i) => 0.),
      y: data.y.map((v, u) => 2)
    }
    return { data, error }
  })(Array(20).fill(0))





  return testData;
}))