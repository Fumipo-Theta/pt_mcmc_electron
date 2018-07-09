(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      "../../jslib/mt"
    ], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    //throw new Error("This module can be used with Node.js")
    root.PTMCMC = factory(root.MersenneTwister, root.JSZip);
  }
}(this, function (_mt, _JSZip) {

  const virtualFile = {};

  const mt = (typeof require === 'undefined' && (typeof _mt === 'object' || typeof _mt === 'function'))
    ? _mt
    : require("../../../jslib/mt");


  const JSZip = (typeof require === 'undefined' && (typeof _JSZip === 'object' || typeof _JSZip === 'function'))
    ? _JSZip
    : require("jszip");


  const fs = (typeof require === 'undefined')
    ? {
      writeFile: async (path, content) => {
        virtualFile[path] = [content]
      },
      appendFile: async (path, content) => {
        virtualFile[path].push(content)
      }
    }
    : require("fs.promises")



  const take = (n, ini = 0, acc = 1) => Array(n).fill(0).map((_, i) => ini + acc * i);
  const isEven = num => (num * 0.5 - parseInt(num * 0.5) <= 0);

  const timestamp = () => {
    const dt = new Date(),
      year = dt.getFullYear(),
      month = ('0' + (dt.getMonth() + 1)).slice(-2),
      date = ('0' + dt.getDate()).slice(-2),
      hours = ('0' + (dt.getHours())).slice(-2),
      minutes = ('0' + dt.getMinutes()).slice(-2),
      seconds = ('0' + dt.getSeconds()).slice(-2)

    return `${year}_${month}${date}_${hours}${minutes}${seconds}`;
  }


  class PTMCMC {

    /**
     * 
     * @param {Number} seed 
     */
    constructor(seed) {
      this.rand = new mt((seed === undefined)
        ? new Date().getTime()
        : seed
      )
      this.totalIteration = 0; // start from createChain() 
      this.iteration = 0; // start from each execute()
      this.restJobTime = 0;

      this.workerNum = 0;
      this.mcmcWorkers = []
      this.parameters = [];
      this.lnPs = [];
      this.exchangeTime = [];

      this.parameterStorage = [];
      this.lnPStorage = [];

      this.output = [];
      this.outputPrefix = "";
      this.timestamp = [];

      this.action = {
        "start": self => _ => new Promise(r => r()),
        "initialize": self => msg => new Promise(r => r()),
        "sample": self => msg => new Promise(r => r()),
        "swap": self => mag => new Promise(r => r()),
        "terminate": self => _ => new Promise(r => r())
      }
      return this;
    }

    /**
     * 
     * 
     * @param {String} ts 
     * @param {Number} i 
     * @param {String} ext 
     */
    getOutputPath(ts, i, ext) {
      return this.outputPrefix + "-" + i + "-" + ts + "." + ext
    }

    setOutPut() {
      const ts = timestamp();
      this.timestamp.push(ts);
      this.output = take(this.workerNum).map((_, i) => writer => async content => {
        return await writer(this.getOutputPath(ts, i, "csv"), content);
      })
      return this;
    }


    /**
     * ptmcmc.createChain(
          state.workerNum,
          {
            "observed": {
              "data": state.data,
              "error": state.error
          },
          "model": state.model
        });
     *
     * @param {Integer} n
     * @param {Object} opt
     * @param {String} workerPath
     */
    createChain(n, opt, workerPath = "../src/js/mcmcWorker.js") {
      const self = this;
      this.restJobTime = 0;
      this.totalIteration = 0;
      this.iteration = 0;

      /**
       * construct n WebWorker oerating MCMC sampling
       */
      this.deleteChain();
      this.workerNum = n;
      this.mcmcWorkers = take(n).map(_ => new Worker(workerPath))
      this.parameterStorage = take(n).map(_ => []);
      this.lnPStorage = take(n).map(_ => []);
      /**
       * calculate inversed temperature by powered function
       */
      this.setInvTParameter(opt.alpha);
      this.invTs = take(n).map((_, i) => this.getInvT(i, 0, n - 1));
      this.lnPs = [];
      this.parameters = [];
      this.exchangeTime = take(n - 1).map(_ => 0);

      this.timestamp = [];

      this.mcmcWorkers.map((w, i) => {
        w.addEventListener(
          "message",
          function (ev) {
            self.handleMessage(ev.data)
              .then(self.action.terminate(self))
          },
          false
        )

        w.postMessage({
          "cmd": "initialize",
          "msg": {
            "id": i,
            "invT": self.invTs[i],
            "observed": {
              "data": opt.observed.data,
              "error": opt.observed.error
            },
            "model": opt.model,
            "option": opt.option
          }
        })
      })
      return this;
    }

    /**
     * ptmcmc.execute(100, "z:/sample")
     * 
     * this method create output file whose path are:
     * z:/sample-0-${timestamp}.csv
     * z:/sample-1-${timestamp}.csv
     * z:/sample-2-${timestamp}.csv ...
     *
     * Each file has column name and 100 entries of sampled parameters as row.
     * 
     * @param {Integer} iteration 
     * @param {String} outputPrefix 
     */
    execute(iteration, outputPrefix) {
      const self = this;
      this.iteration = 0;
      this.outputPrefix = outputPrefix;
      this.setOutPut();
      return new Promise((res, rej) => {
        self.pending_workerNum = self.workerNum
        self.restJobTime = iteration;
        self.action["start"](self)()
          .then(_ => self.dispatch())
          .then(_ => res(true))
      })
    }

    /**
     * f:: alpha, n => Number
     * 
     * @param {Function} f 
     */
    setInvTParameter(alpha) {
      this.getInvT = (i, initial, final) => (i === initial)
        ? 1
        : (i === final)
          ? 0
          : Math.pow(1 + alpha, -i);

      return this;
    }

    /**
     * send message to all WebWorkers to sample 1 time
     */
    dispatch() {
      const workers = this.mcmcWorkers;
      this.totalIteration++;
      this.iteration++;
      return new Promise((res, rej) => {
        workers.map(w => {
          w.postMessage({ "cmd": "sample", "msg": {} })
        });
        res(true);
      })
    }

    getAcceptedInfo() {
      const workers = this.mcmcWorkers;
      return new Promise((res, rej) => {
        workers.map((w) => {
          w.postMessage({ "cmd": "info", msg: {} })
        })
        res(true)
      })
    }

    getExchangeTime() {
      return this.exchangeTime;
    }

    /**
     * Handle message from Webworkers
     * 
     * @param {String} cmd 
     * @param {Object} msg 
     */
    handleCommand(cmd, msg) {
      const self = this;
      return new Promise((res, rej) => {
        switch (cmd) {
          case "sampled":
            /**
             * Register sampled parameters and logarithm of posterior probability
             */
            self.pending_workerNum--;
            self.storeSample(msg)
              //.then(self.writeHeader.bind(self))
              .then(self.writeSample.bind(self))
              .then(self.action.sample(self))
              .then(_ => res(_))

            break;
          case "initialize":
            self.action.initialize(self)(msg)
              .then(_ => res(_))
            break;
          default:
            console.log(msg)
            res(true);
            break;
        }
      })
    }

    /**

     * @param {Object} data 
     */
    handleMessage(data) {
      //console.log(data)
      const self = this;
      return new Promise((res, rej) => {
        const { cmd, msg } = data;

        self.handleCommand(cmd, msg)
          .then(_ => {
            data = null
            // 全てのMCMCが結果を返したらChianの交換を行う
            if (self.pending_workerNum <= 0) {

              self.swapChains()
                .then(self.action.swap(self))
                .then(_ => {
                  // 実行中のMCMC数をリセット
                  self.pending_workerNum = self.workerNum;
                  self.restJobTime--;

                  // 残りのジョブ回数が0になったら終了処理
                  if (self.restJobTime > 0) {
                    self.dispatch();
                  } else {

                    res("fulfilled")
                  }
                })
            }
          })
      })

    }


    setAction(type, f) {
      this.action[type] = self => opt => new Promise((res, rej) => {
        const result = f(self, opt)
        res(result)
      })
      return this;
    }

    /**
     * Write sampled parameter from _i_th WebWoreker to output file 
     * 
     * @param {Object} msg 
     */
    async writeSample(msg) {
      const self = this;
      //return new Promise((res, rej) => {
      const {
        parameter,
        lnP,
        id
      } = msg

      const i = self.totalIteration;

      /**
       * If iteration is 1, write column names in output file
       */
      if (this.iteration === 1) {
        const arr = ["iteration"]
        parameter.map((p, i) => {
          Object.keys(p).map(k => {
            arr.push(`${k}${i}`);
          })
        })
        arr.push("lnP")
        const m = await this.output[id](fs.writeFile)(
          arr.reduce((a, b) => a + "," + b) + "\n"
        )
      }

      const n = await self.output[id](fs.appendFile)(
        PTMCMC.parameterToCsv(i, parameter, lnP)
      )
      return msg
      //.then(_ => res(msg))
      //res(msg)
      //})
    }

    /**
     * 
     * @param {Object} msg 
     */
    storeSample(msg) {
      const self = this;
      const i = self.totalIteration;
      return new Promise((res, rej) => {
        const {
          parameter,
          lnP,
          id
        } = msg

        // 最初だけparameterStorageを初期化
        if (i === 1) {
          parameter.map((p, j) => {
            self.parameterStorage[id][j] = {};
            Object.keys(p).map(k => {
              self.parameterStorage[id][j][k] = []
            })
          })
        }

        // サンプリングされたパラメータセットを保存
        PTMCMC.extractLastParameter(parameter).map((p, j) => {
          Object.entries(p).map(([k, v]) => {
            self.parameterStorage[id][j][k].push(v)
            if (i > 100) self.parameterStorage[id][j][k].shift()
          })
        })

        self.lnPStorage[id].push(lnP[lnP.length - 1]);
        if (i > 100) self.lnPStorage[id].shift();

        self.parameters[id] = PTMCMC.extractLastParameter(parameter);
        self.lnPs[id] = lnP[lnP.length - 1];
        res(msg)
      })
    }

    /**
     * インデックスが隣り合うMCMC感間で逆温度を交換する.
     * 実装では各MCMCの逆温度は固定で, パラメータと事後確率を交換するようになっている.
     * totalIterationの偶奇で逆温度を交換するペアを変えている.
     */
    swapChains() {
      const self = this;
      return new Promise((res, rej) => {

        const [ini, fin] = (isEven(self.totalIteration))
          ? [0, self.workerNum]
          : [1, self.workerNum - 1];

        /**
         * WebWorkerをqつ飛ばしのインデックスで処理
         */
        take(
          parseInt((fin - ini) * 0.5),
          ini,
          2
        ).map(i => {
          /**
           * MCMC間の遷移確率の計算
           */
          const lnR = (self.invTs[i] - self.invTs[i + 1])
            * (self.lnPs[i + 1] - self.lnPs[i]);

          if (Math.log(self.rand.next()) <= lnR) {
            self.mcmcWorkers[i].postMessage({
              "cmd": "swap",
              "msg": {
                "parameters": self.parameters[i + 1],
                "lnP": self.lnPs[i + 1]
              }
            });
            self.mcmcWorkers[i + 1].postMessage({
              "cmd": "swap",
              "msg": {
                "parameters": self.parameters[i],
                "lnP": self.lnPs[i]
              }
            });
            self.exchangeTime[i]++;
          }
        })
        res(true);
      })
    }

    /**
     * Close WebWorkers.
     * 
     */
    deleteChain() {
      if (this.mcmcWorkers.length > 0) {
        this.mcmcWorkers.map(w => {
          w.postMessage({
            "cmd": "close",
            "msg": {}
          })
        })
        this.mcmcWorkers = [];
      }
      return this;
    }

    /**
     * parameters = [
     *  {
     *    a : [1,2],
     *    b : [3,3]
     *  },
     *  {
     *    a : [2,3],
     *    b : [0,1]
     *  }
     * ]
     * 
     * PTMCMC.extractLastParameters(parameters) ->
     * [
     *  {
     *    a : 2,
     *    b : 3
     *  },
     *  {
     *    a : 3,
     *    b : 1
     *  }
     * ]
     * 
     * @param {Array} parameters 
     */
    static extractLastParameter(parameters) {
      return parameters.map(p => {
        let obj = {}
        Object.entries(p).map(kv => {
          obj[kv[0]] = kv[1][kv[1].length - 1]
        })
        return obj
      })
    }

    static parameterToCsv(i, parameter, lnP) {
      const arr = [i];
      parameter.map(p => {
        Object.values(p).map(v => {
          arr.push(v[0])
        })
      })
      arr.push(lnP[0]);

      return arr.reduce((a, b) => a + "," + b) + "\n";
    }

    downloadCsv() {
      const zip = new JSZip();
      const ts = [...this.timestamp].pop()
      const folder = zip.folder(ts);
      Object.entries(virtualFile)
        .filter(([k, v]) => k.match(ts) !== null)
        .map(([k, v]) => {
          folder.file(k, v.reduce((a, b) => a + b))
        })
      folder.generateAsync({ type: "base64" })
        .then(function (base64) {
          location.href = "data:application/zip;base64," + base64;
        });
    }
  };



  return PTMCMC;
}))