importScripts("../../../jslib/mt.js")
importScripts("./mcmc.js")

this.postMessage({ "cmd": "", "msg": "start subprocess" })

const mcmc = new MCMC();
//const magma = new magma();

const observer = {}
const self = this;
let __model_optional_parameters__ = {}

this.postMessage({ cmd: "", msg: "subprocess loaded" })

this.addEventListener("message", function (ev) {
  const { cmd, msg } = ev.data

  switch (cmd) {

    case "initialize":
      observer.id = msg.id;
      importScripts("../../" + msg.model);

      const {
        model,
        parameters,
        updateCondition,
        constrain
      } = Model(msg.option)


      //console.log(model)

      mcmc.initialize(
        parameters,
        updateCondition,
        constrain,
        msg.invT,
        msg.id
      )
        .setSeed(msg.id)
        .randomizeParameters([])
        .setObserved(
          msg.observed.data,
          msg.observed.error
        )
        .setModel(
          model
        )

      self.postMessage({ "cmd": "", msg: "initialized" + observer.id })
      self.postMessage({
        "cmd": "initialize", "msg": {
          "id": observer.id,
          "parameter": parameters
        }
      })
      break;

    case "sample":
      let result = { cmd: "sampled", msg: {} }
      result.msg = mcmc.samplingAndFormat(1);
      result.msg.id = observer.id;
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
          "id": observer.id,
          "accepted": mcmc.acceptedTime,
          "sampled": mcmc.sampledTime
        }
      })
      break;

    case "close":
      self.postMessage({
        "cmd": "closed",
        "message": `${observer.id} closed`
      })
      self.close();
      break;
    default:
      console.log(data)
      break;
  }
}, false)

