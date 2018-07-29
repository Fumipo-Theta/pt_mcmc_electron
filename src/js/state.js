(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.state = factory(root.testData);
  }
}(this, function (_testData) {

  const testData = (typeof require === 'undefined' && (typeof _testData === 'object' || typeof _testData === 'function'))
    ? _testData
    : require("./test-data");


  const state = {
    "isDirty": true,
    "ptSeed": 200,
    "seed": [],
    "totalIteration": 0,
    "iteration": 200,
    "workerNum": 4,
    "outputDir": "z:/",
    "outputPrefix": "sample",
    "alpha": 0.01,
    "data": testData.tanh.data,
    "error": testData.tanh.error,
    "data_file": "test",
    "error_file": "test",
    "model": "model/model-tanh.js",
    "acceptedTime": [],
    "exchangeTime": [],
    "primaryKey": "x",
    "colorMap": [],
    "option": {},
    "option_file": "",
    "plotInterval": 1,
    "mcmcInternalState": [],
    "mcmcState": "initial",
    "idPlotMCMC": 0
  }

  return state;
}))

