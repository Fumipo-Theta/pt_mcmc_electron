importScripts("../../../jslib/mt.js")
importScripts("./mcmc.js")

this.postMessage({ "cmd": "", "msg": "start subprocess" })

const mcmc = new MCMC();
const state = {}
const self = this;

this.addEventListener("message", function (ev) {
  const { cmd, msg } = ev.data;

  switch (cmd) {

    case "initialize":
      state.id = msg.id;

      const seed = (msg.option.hasOwnProperty("seed"))
        ? msg.option.seed[state.id]
        : state.id

      importScripts("../../" + msg.model);

      const {
        model,
        parameters,
        updateCondition,
        constrain,
        mode
      } = Model(msg.option)

      mcmc.initialize(
        parameters,
        updateCondition,
        constrain,
        msg.invT,
        msg.id,
        mode
      )
        .setSeed(seed)
        .setObserved(
          msg.observed.data,
          msg.observed.error
        )
        .setModel(
          model
        )

      self.postMessage({
        "cmd": "initialize", "msg": {
          "id": state.id,
          "parameter": parameters,
          "seed": seed
        }
      })
      break;

    case "sample":
      let result = { cmd: "sampled", msg: {} }
      result.msg = mcmc.samplingAndFormat(1);
      result.msg.id = state.id;
      result.msg.accepted = mcmc.acceptedTime;
      result.msg.modeled = mcmc.model;
      self.postMessage(result)
      break;

    case "swap":
      mcmc.overWrite(
        msg.parameters,
        msg.lnP
      );
      break;

    case "info":
      self.postMessage({
        "cmd": "",
        "msg": {
          "id": state.id,
          "accepted": mcmc.acceptedTime,
          "sampled": mcmc.sampledTime
        }
      })
      break;

    case "close":
      self.postMessage({
        "cmd": "closed",
        "message": `${state.id} closed`
      })
      self.close();
      break;
    default:
      console.log(data)
      break;
  }

  ev.data = null;
}, false)

