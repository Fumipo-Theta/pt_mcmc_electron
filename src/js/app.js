(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.app = factory(
      root.plotAfterEvent,
      root.PTMCMC,
      root.state,
      root.eventHandler
    );
  }
}(this, function (
  _plotAfterEvent,
  _PTMCMC,
  _state,
  _eventHandler
) {
  const {
    plotModeled,
    plotAfterSample,
    plotAfterSwap
  } = (typeof require === 'undefined' && (typeof _plotAfterEvent === 'object' || typeof _plotAfterEvent === 'function'))
      ? _plotAfterEvent
      : require("../src/js/plot-after-event.js");


  const fs = (typeof require === 'undefined')
    ? null
    : require("fs");



  const state = (typeof require === 'undefined' && (typeof _state === 'object' || typeof _state === 'function'))
    ? _state
    : require("../src/js/state");

  const {
    updateAcceptedRate,
    updateExchangeRate,
    eventHandler
  } = (typeof require === 'undefined' && (typeof _eventHandler === 'object' || typeof _eventHandler === 'function'))
      ? _eventHandler
      : require("../src/js/event-handler");


  const PTMCMC = (typeof require === 'undefined' && (typeof _PTMCMC === 'object' || typeof _PTMCMC === 'function'))
    ? _PTMCMC
    : require("../src/js/parallel-tempering.js");

  const ptmcmc = new PTMCMC(state.ptSeed);
  ptmcmc.setAction("initialize", async (self, msg) => {
    console.log(self)
    console.log(msg);
    state.seed[msg.id] = msg.seed;
    //console.log(new Date())
    return msg
  })
    .setAction("sample", async (self, msg) => {
      state.acceptedTime[msg.id] = msg.accepted;
      await plotModeled(self, msg, state);
      await plotAfterSample(self, msg, state);
      updateAcceptedRate(self, state, msg.id);
      return msg
    })
    .setAction("swap", async (self, msg) => {
      state.exchangeTime = ptmcmc.exchangeTime;
      await plotAfterSwap(self, msg, state);
      updateExchangeRate(self, state, msg);
      return msg
    })
    .setAction("terminate", async (self, msg) => {
      console.log("fulfilled")
      const meta = ((s) => {
        const list = [
          "ptSeed",
          "seed",
          "totalIteration",
          "workerNum",
          "alpha",
          "data_file",
          "error_file",
          "data",
          "error",
          "model",
          "acceptedTime",
          "exchangeTime",
          "primaryKey",
          "option_file",
          "option"
        ]
        const filtered = Object.entries(s)
          .filter(([k, _]) => list.includes(k))
        const res = {}
        filtered.map(([k, v]) => {
          res[k] = v
        })
        res.mcmcInternalState = self.mcmcStateStorage;
        res.ptmcmcInternalState = self.getInternalState();
        return res
      })(state);


      if (typeof require === 'undefined') {
        self.downloadCsv(meta);
      } else {
        fs.writeFileSync(state.outputDir + "meta-" + [...self.timestamp].pop() + ".json", JSON.stringify(meta, null, 2), "utf8")
      }

      state.mcmcState = "idle";
      document.querySelector("#start_button").value = "Start"

      return msg
    })


  //window.addEventListener('DOMContentLoaded', eventHandler(ptmcmc, state), false)

  eventHandler(ptmcmc, state)()

  return {
    ptmcmc,
    state
  };
}))
