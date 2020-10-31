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

    const wait = ms => new Promise((res, rej) => {
        setTimeout(_ => res(), ms)
    })


    /*
      if (typeof Worker === "undefined" && typeof require !== 'undefined'){
          var {Worker} = require("webworker-threads");
      }
    */

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
            this.setSeed(seed);
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

            this.pauseSampling = false;

            this.action = {
                "start": self => _ => new Promise(r => r()),
                "initialize": self => msg => new Promise(r => r()),
                "sample": self => msg => new Promise(r => r()),
                "swap": self => mag => new Promise(r => r()),
                "terminate": self => _ => new Promise(r => r())
            }
            return this;
        }

        setSeed(seed) {
            this.rand = new mt((seed === undefined)
                ? new Date().getTime()
                : seed
            );
        }

        getInternalState() {
            return {
                totalIteration: this.totalIteration,
                lnPStorage: this.lnPStorage,
                parameterStorage: this.parameterStorage,
                rand: this.rand.getInternalState(),
                exchangeTime: this.exchangeTime
            }
        }

        setInternalState(state) {
            this.totalIteration = state.totalIteration;
            this.lnPStorage = state.lnPStorage;
            this.parameterStorage = state.parameterStorage;
            this.rand.setInternalState(state.rand);
            this.exchangeTime = state.exchangeTime;
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

        createSeed(seedLen, workerNum) {
            return [...Array(workerNum)].map((_, i) => [...Array(seedLen)].map(_ => this.rand.nextInt()));
        }

        /**
         * ptmcmc.startSession(
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
        startSession(n, opt, workerPath = "../src/js/mcmcWorker.js") {
            this.totalIteration = 0;

            this.parameterStorage = take(n).map(_ => []);
            this.lnPStorage = take(n).map(_ => []);
            this.reStartSession(n, opt, workerPath);
        }

        reStartSession(n, opt, workerPath = "../src/js/mcmcWorker.js") {
            const self = this;
            this.restJobTime = 0;
            this.iteration = 0;

            /**
             * construct n WebWorker operating MCMC sampling
             */
            this.deleteChain();
            this.workerNum = n;
            this.mcmcWorkers = take(n).map(_ => new Worker(workerPath))

            this.mcmcStateStorage = take(n).map(_ => []);

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
                    async function (ev) {
                        await self.handleMessage(ev.data);
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
                        "option": opt.option,
                        "seed": opt.randomSeed ? this.createSeed(5, n) : undefined
                    }
                })
            })
            return this;
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
         * ptmcmc.startSampling(100, "z:/sample")
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
        startSampling(iteration, outputPrefix) {
            const self = this;
            this.iteration = 0;
            this.outputPrefix = outputPrefix;
            this.setOutPut();
            return new Promise((res, rej) => {
                self.pending_workerNum = self.workerNum
                self.restJobTime = iteration;
                self.action["start"](self)()
                    .then(_ => self.dispatch())
                    .then(res)
            })
        }


        /**
         * send message to all WebWorkers to sample 1 time
         */
        async dispatch() {
            while (this.pauseSampling) {
                await wait(1000);
            }

            const workers = this.mcmcWorkers;
            this.totalIteration++;
            this.iteration++;

            return new Promise((res, rej) => {
                workers.forEach(w => {
                    w.postMessage({ "cmd": "sample", "msg": {} })
                });
                res(true);
            })
        }

        getAcceptedInfo() {
            const workers = this.mcmcWorkers;
            return new Promise((res, rej) => {
                workers.forEach((w) => {
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
         * @param {Object} msg
         */
        handleSampled(msg) {
            const self = this;
            return new Promise((res, rej) => {
                //self.pending_workerNum--;
                self.storeSample(msg)
                    .then(self.writeSample.bind(self))
                    .then(self.action.sample(self))
                    .then(res)
            })
        }

        handleInternalState(msg) {
            const self = this;
            return new Promise((res, rej) => {
                const { id, state } = msg;
                self.mcmcStateStorage[id] = state;
                res();
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

                switch (cmd) {
                    case "sampled":
                        self.handleSampled(msg)
                            .then(msg => {
                                self.pending_workerNum--;
                                // 全てのMCMCが結果を返したらChianの交換を行う
                                if (self.pending_workerNum <= 0) {
                                    self.swapChains(msg)
                                        .then(self.action.swap(self))
                                        .then(_ => {
                                            // 実行中のMCMC数をリセット
                                            self.pending_workerNum = self.workerNum;
                                            self.restJobTime--;

                                            if (self.restJobTime > 0) {
                                                self.dispatch();
                                            } else {
                                                self.queryInternalStateOfMCMC();
                                            }
                                        })
                                }
                                data = null;
                            }).then(res)
                        break;

                    case "initialize":
                        self.action.initialize(self)(msg)
                            .then(_ => res("initialized"))
                        break;

                    case "internalState":
                        self.handleInternalState(msg)
                            .then(async _ => {
                                data = null;
                                self.pending_workerNum--;
                                if (self.pending_workerNum <= 0) {
                                    await self.action.terminate(self)()
                                    res("fulfilled");
                                }
                            })
                        break;

                    default:
                        console.log(msg)
                        res(true);
                        break;

                }
                data = null;
            })
        }

        /**
         * Send request of internal state of MCMC to WebWorkers
         */
        queryInternalStateOfMCMC() {
            const self = this;
            self.pending_workerNum = self.workerNum;
            return new Promise((res, rej) => {
                self.mcmcWorkers.forEach(w => {
                    w.postMessage({
                        "cmd": "requestMCMCInternalState",
                        "msg": {}
                    })
                })
                res()
            })
        }

        restoreInternalStateOfMCMC(state) {
            const self = this;
            return new Promise((res, rej) => {
                self.mcmcWorkers.forEach((w, i) => {
                    w.postMessage({
                        "cmd": "restoreMCMCInternalState",
                        "msg": {
                            "state": state[i]
                        }
                    })
                })
            })
        }


        setAction(type, asyncFuncion) {
            this.action[type] = self => async opt => {
                const result = await asyncFuncion(self, opt);
                return result
            }
            return this;
        }

        /**
         * Write sampled parameter from _i_th WebWoreker to output file
         *
         * @param {Object} msg
         */
        async writeSample(msg) {
            const {
                parameter,
                lnP,
                id
            } = msg

            /**
             * If iteration is 1, write column names in output file
             */
            if (this.iteration === 1) {
                const arr = ["iteration"]
                parameter.forEach((p, i) => {
                    Object.keys(p).forEach(k => {
                        arr.push(`${k}${i}`);
                    })
                })
                arr.push("lnP")
                await this.output[id](fs.writeFile)(
                    arr.reduce((a, b) => a + "," + b) + "\n"
                )
            }

            await this.output[id](fs.appendFile)(
                PTMCMC.parameterToCsv(this.totalIteration, parameter, lnP)
            )
            return msg
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
                    parameter.forEach((p, j) => {
                        self.parameterStorage[id][j] = {};
                        Object.keys(p).forEach(k => {
                            self.parameterStorage[id][j][k] = []
                        })
                    })
                }

                // サンプリングされたパラメータセットを保存
                PTMCMC.extractLastParameter(parameter).forEach((p, j) => {
                    Object.entries(p).forEach(([k, v]) => {
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
        swapChains(msg) {
            const self = this;
            return new Promise((res, rej) => {

                // 現在のイテレーション回数の偶奇でworkerの組を変える
                const [ini, fin] = (isEven(self.totalIteration))
                    ? [0, self.workerNum]
                    : [1, self.workerNum - 1];

                take(
                    parseInt((fin - ini) * 0.5),
                    ini,
                    2
                ).forEach(i => {
                    /**
                     * 遷移確率がアンダーフローしないように対数で計算
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
                res(msg);
            })
        }

        /**
         * Close WebWorkers.
         *
         */
        deleteChain() {
            if (this.mcmcWorkers.length > 0) {
                this.mcmcWorkers.forEach(w => {
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
                Object.entries(p).forEach(kv => {
                    obj[kv[0]] = kv[1][kv[1].length - 1]
                })
                return obj
            })
        }

        static parameterToCsv(i, parameter, lnP) {
            const arr = [i];
            parameter.forEach(p => {
                Object.values(p).forEach(v => {
                    arr.push(v[0])
                })
            })
            arr.push(lnP[0]);

            return arr.reduce((a, b) => a + "," + b) + "\n";
        }

        downloadCsv(state) {
            const zip = new JSZip();
            const ts = [...this.timestamp].pop()
            const folder = zip.folder(ts);
            Object.entries(virtualFile)
                .filter(([k, v]) => k.match(ts) !== null)
                .map(([k, v]) => {
                    const vFileName = k.replace("/", "-").replace(":", "");
                    folder.file(vFileName, v.reduce((a, b) => a + b))
                })
            folder.file("meta.json", JSON.stringify(state, null, 2))
            folder.generateAsync({ type: "base64" })
                .then(function (base64) {
                    const dummyLink = document.createElement("a")
                    dummyLink.download = "ptmcmc-" + ts;
                    dummyLink.href = "data:application/zip;base64," + base64;
                    document.body.appendChild(dummyLink)
                    dummyLink.click()
                    document.body.removeChild(dummyLink)
                    dummyLink = null;
                });
        }
    };



    return PTMCMC;
}))
