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
  const { plotAfterSample, plotAfterSwap } = (typeof require === 'undefined' && (typeof _plotAfterEvent === 'object' || typeof _plotAfterEvent === 'function'))
    ? _plotAfterEvent
    : require("../src/js/plot-after-event.js");

  const dom_currentIteration = document.querySelector("#presentCount");
  const dom_acceptedTable = document.querySelector("#accepted_table table");
  const dom_exchangeTable = document.querySelector("#exchange_table table");

  const updateTable = (dom_table, tbodyArray, thead = [], tbodyHead = []) => {
    const dom_thead = dom_table.querySelector("thead");
    const dom_tbody = dom_table.querySelector("tbody");

    if (thead.length > 0) {
      dom_thead.innerHTML = `<thead><th></th>${thead.map(v => `<th>${v}</th>`).reduce((a, b) => a + b, "")}</thead>`
    }

    dom_tbody.innerHTML = `<tbody>
    ${tbodyArray.map((rowAsArray, i) => {
        const th = (tbodyHead[i] === undefined) ? "" : tbodyHead[i]
        return `<tr>
        <th>${th}</th>
        ${rowAsArray.map(v => `<td>${v}</td>`).reduce((a, b) => a + b, "")}
      </tr>`
      }).reduce((a, b) => a + "\n" + b, "")}
    </tbody>`

  }


  const updateAcceptedRate = (ptmcmc, state, msg) => {
    state.acceptedTime[msg.id] = msg.accepted;
    if (msg.id === 0) updateTable(
      dom_acceptedTable,
      msg.accepted.map(paramSet => Object.values(paramSet)),
      Object.keys(msg.accepted[0]),
      msg.accepted.map((_, i) => "parameter set " + i)
    )
  }

  const updateExchangeRate = (ptmcmc, state, msg) => {
    dom_currentIteration.innerHTML = ptmcmc.totalIteration;
    updateTable(
      dom_exchangeTable,
      [ptmcmc.exchangeTime],
      Array(state.workerNum - 1).fill(0).map((_, i) => `${i}-${i + 1}`)
    )
  }


  const state = (typeof require === 'undefined' && (typeof _state === 'object' || typeof _state === 'function'))
    ? _state
    : require("../src/js/state");

  const eventHandler = (typeof require === 'undefined' && (typeof _eventHandler === 'object' || typeof _eventHandler === 'function'))
    ? _eventHandler
    : require("../src/js/event-handler");


  const PTMCMC = (typeof require === 'undefined' && (typeof _PTMCMC === 'object' || typeof _PTMCMC === 'function'))
    ? _PTMCMC
    : require("../src/js/parallel-tempering.js");

  const ptmcmc = new PTMCMC(200);
  ptmcmc.setAction("initialize", (self, msg) => {
    console.log(self)
    console.log(msg);
    state.__model__ = msg.model;
    return msg
  })
    .setAction("sample", (self, msg) => {
      //console.log(msg);
      updateAcceptedRate(self, state, msg)
      plotAfterSample(self, msg, state);
      return msg
    })
    .setAction("swap", (self, msg) => {
      plotAfterSwap(self, msg, state)
      updateExchangeRate(self, state, msg)
      return msg
    })
    .setAction("terminate", (self, msg) => {
      console.log("fullfilled")
      if (typeof require === 'undefined') self.downloadCsv();
      return msg
    })


  window.addEventListener('DOMContentLoaded', eventHandler(ptmcmc, state), false)

  return {
    ptmcmc,
    state
  };
}))
