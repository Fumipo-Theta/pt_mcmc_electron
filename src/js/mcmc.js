(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([
      "../../../jslib/mt"
    ], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser global (root is window)
    root.MCMC = factory(
      root.MersenneTwister
    );
  }
}(this, function (_mt) {



  const mt = (typeof require === 'undefined' && typeof _mt === 'function')
    ? _mt
    : require("../../../jslib/mt");

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const sum = (a, b) => a + b;
  const take = (l) => Array(l).fill(0)
  /** MCMC
   * class  for operate MCMC
   */
  class MCMC {
    constructor(seed) {
      this.rand = new mt((seed === undefined)
        ? new Date().getTime()
        : seed
      )
      this.eps = 1e-6;
      this.outRangeFlag = false;
      return this;
    }

    setSeed(seed) {
      this.rand = new mt((seed === undefined)
        ? new Date().getTime()
        : seed
      )
      return this;
    }

    /**
     *
     *
     * @param {*} parameters: [{set}, {set}]
     * @param {*} vector : {set}
     * @param {*} constrain: {set}
     * @param {Number} invT
     * @param {Number} amplitude
     * 
     *  vector = {
     *    ini: {val:0.1,max:92,min:70}
     *    fin: {val:0.1,max:92,min:70}
     *  }
     *
     *  constrain = {
     *    ini: (cand, i, param) => (cand > param[i]["fin"]),
     *    fin: (cand, i, param) => (cand < param[i]["ini"])
     *  }
    */
    initialize(parameters, vector, constrain, invT = 1, amplitude = 0) {
      this.n = 0;
      this.parameters = clone(parameters);
      this.candidateParameters = clone(parameters);
      this.updateStep = vector;
      this.canUpdate = constrain;
      this.invT = invT;
      this.amplitude = amplitude;
      this.acceptedTime = [];
      this.sampledTime = [];
      this.lnP = -100000000;
      this.lnPcand = -100000000;

      parameters.map((parameter, i) => {
        this.acceptedTime[i] = {};
        this.sampledTime[i] = {};
        Object.keys(parameter).map(k => {
          this.acceptedTime[i][k] = 0;
          this.sampledTime[i][k] = 0;
        })
      })
      this.setErrorFunc();
      return this;
    }

    /**
     * 
     * @param {*} parameters 
     * @param {Number} lnP 
     */
    overWrite(parameters, lnP) {
      this.parameters = clone(parameters);
      this.candidateParameters = clone(parameters);
      this.lnP = lnP
      return this;
    }



    setErrorFunc(f) {
      // default is Gaussian
      this.getError = (!f === undefined)
        ? f
        : (m, o, s) => 1 / (Math.sqrt(2 * Math.PI) * s)
          * Math.exp(-0.5 * ((m - o) * (m - o)) / (s * s));
      this.getLnError = (!f === undefined)
        ? f
        : (m, o, s) => Math.log(1 / (Math.sqrt(2 * Math.PI) * s))
          - 0.5 * ((m - o) * (m - o)) / (s * s);
      return this;
    }

    /**
     * modelFunc: param, data => modelData
     * data, modelData::{
     *  x:[],
     *  y:[],
     *  z:[],
     *  ...
     * }
     */
    setModel(modelFunc) {
      this.modelFunc = modelFunc;
      return this;
    }


    /**
     * 
     * @param {} data 
     * @param {*} err
     * 
     * data:: [
     *  x:[],
     *  y:[],
     *  z:[]
     * ] 
     */
    setObserved(data, err) {
      this.data = data;
      this.error = err;
      return this;
    }

    /**
     * 
     * @param {Number} cand 
     * @param {String} k
     * @return Bool 
     */
    isInRange(cand, k) {
      return (this.updateStep[k].min <= cand && cand <= this.updateStep[k].max)
    }

    /**
     * 
     * @param {Number} cand 
     * @param {Integer} i 
     * @param {String} k 
     * @return Bool
     */
    satisfyConstraint(cand, i, k) {
      return (!this.canUpdate.hasOwnProperty(k) || this.canUpdate[k](cand, i, this.candidateParameters))
    }

    setWriteFile(_nodeFS, _outputPath, _recordParametersName) {
      this.fs = _nodeFS;
      this.outputPath = _outputPath;
      this.recParams = _recordParametersName;
      return this;
    }


    writeFile(str, mode = "write") {
      if (mode === "write") {
        this.fs.writeFileSync(this.outputPath, str);
      } else if (mode === "append") {
        this.fs.appendFileSync(this.outputPath, str);
      }
      return this;
    }


    /**
     * 階層いのparameter kの次候補値を得る
     * 候補値がそのパラメータの値域を超えたり, 他のパラメータとの間の制約を満たさなければ,
     * 更新を行わない.
     * 
     * @param {String} k
     * @param {Integer} i
     */
    candidate(k, i = 0) {
      let cand = this.parameters[i][k] +
        this.updateStep[k].val * this.rand._getU(-1, 1) * (1 + this.amplitude);

      this.outRangeFlag = !(this.isInRange(cand, k)
        && this.satisfyConstraint(cand, i, k));

      this.candidateParameters[i][k] = (
        this.outRangeFlag
      )
        ? this.parameters[i][k]
        : cand
      return this;
    }

    /**
     * calculate logarithm of occurrence probability of observed data from model
     * @param {Bool} byLineElement 
     */
    getLikelihood(byLineElement = false) {

      // When candidate is out of range, ignore.
      if (this.outRangeFlag) return this;

      this.model = this.modelFunc(this.candidateParameters, this.data);

      //console.log(modeled);
      const lnP = (byLineElement)
        ? this.getAllLnProbabilityByCurve(this.model)
        : this.getAllLnProbabilityByPoint(this.model)

      this.lnPcand = (isFinite(lnP))
        ? lnP
        : -100000000

      return this;
    }

    /**
     * サンプリング前後の事後確率を比較し, パラメータ更新のトランザクションを行う.
     * 
     * @param {String} k
     * @param {Integer} i
    */
    transaction(k, i = 0) {
      const lnRatio = this.invT * (this.lnPcand - this.lnP);

      // When candidate is out of range, ignore.
      if (!this.outRangeFlag && lnRatio > Math.log(this.rand.next())) {
        // Update
        this.parameters[i][k] = this.candidateParameters[i][k];
        this.acceptedTime[i][k]++;
        this.lnP = this.lnPcand;
      } else {
        // Roll back
        this.candidateParameters[i][k] = this.parameters[i][k];

      }
      this.sampledTime[i][k]++;

      return this;
    }

    /* getRandomSection */
    // keysを使うようにする
    randomizeParameters(_keys = []) {
      const keys = (_keys.length === 0)
        ? Object.keys(this.updateStep)
        : _keys;
      take(this.parameters.length).map((_, i) => {
        keys.map(k => {
          let step = this.updateStep[k].val;

          this.parameters[i][k] = (v => {
            let cand = v + take(10)
              .map(_ => this.rand._getU(-step, step))
              .reduce(sum, 0);

            while (
              !this.isInRange(cand, k)
              || !this.satisfyConstraint(cand, i, k)
            ) {
              cand += this.rand._getU(-step, step)
            }
            return cand;
          })(this.parameters[i][k])
        })
      })

      return this;
    }

    /**
     * 階層iのparameter keyをサンプリングし,
     * その結果を返す.
     * 
     * @param {String} key
     * @param {Integer} i
     * @param {Bool} byLineelement
    */
    sampling(key, i = 0, byLineElement = false) {
      //console.log(this)
      this.n++;
      this.candidate(key, i)
      this.getLikelihood(byLineElement)
      this.transaction(key, i)
      //console.log(this)
      return {
        lnP: this.lnP,
        parameters: this.parameters,
        sampled: {
          i: i,
          key: key,
          value: this.parameters[i][key]
        }
      }
    }

    /**
     * パラメータセットのランダムな順番のサンプリングを繰り返し,
     * 各階層のパラメータについてのサンプリング結果からなる配列を返す.
     * 
     * @param {Bool} byLineElement
     */
    sampling1set(byLineElement = false, _keys = []) {
      const keys = (_keys.length === 0) ? Object.keys(this.updateStep) : _keys
      return this.getUpdateOrder(keys).map(v => this.sampling(v[1], v[0], byLineElement));

    }

    /**
     * 指定回数だけパラメータセットのランダムな順番のサンプリングを繰り返し,
     * 各階層のパラメータについてサンプリング結果を格納した配列を返す.
     * また, 各サンプリング時の事後確率の自然対数を格納した配列も返す.
     * 
     * return::{
     *  lnP : [],
     *  parameter : [
     *    {a: [], b:[]},
     *    {a: [], b:[]}
     *  ]
     * }
     * 
     * @param {Number} times
     * @param {Bool} byLineElement
     * @return Object
     */
    samplingAndFormat(times, byLineElement = false, _keys = []) {
      const parameter = [];
      const lnP = [];
      const keys = (_keys.length === 0) ? Object.keys(this.updateStep) : _keys;
      this.parameters.map((_, i) => {
        parameter[i] = {};
        keys.map(k => {
          parameter[i][k] = [];
        })
      })

      Array(times).fill(0)
        .map(_ => this.sampling1set(byLineElement, keys))
        .map(sets => {
          sets.map((r, j) => {
            let { i, key, value } = r.sampled;
            parameter[i][key].push(value)
            lnP.push(r.lnP);
          })
        })

      /* 最後のlnPだけ記録するか, swap時に最後のlnPを使うようにする */
      return { parameter, lnP };
    }

    /**
     * Fisher-Yates Shuffleにより
     * parameter setのランダムな更新順序を示す配列返す.
     * parameter の階層番号と, parameter名の配列からなる配列から構成される.
     * 全ての階層とparameter名の重複のない組み合わせがランダムに並び替えられる.
     * 
     * return::[
     *  [0, "a"],
     *  [1, "a"],
     *  [1, "b"],
     *  [0, "b"]
     * ]
     * 
     * @param {[String]} keys
     * @return [Object]
     */
    getUpdateOrder(keys) {
      const combination = Array.prototype.concat(
        ...this.parameters
          .map((v, i) => {
            return Object.keys(v).map(k => [i, k])
          })
      );

      for (let i = combination.length - 1; i > 0; i--) {
        let r = Math.floor(this.rand.next() * (i + 1));
        let tmp = combination[i];
        combination[i] = combination[r];
        combination[r] = tmp;
      }
      return combination;
    }

    getSquareAnomaly(_dataPos, _modelPos) {
      const d = _dataPos;
      const m = _modelPos;

      let res;


      return res;
    }

    /**
     * 
     * @param {Array[Number]} array 
     * @param {Integer} burnIn 
     */
    static summarize(array, burnIn) {
      let sum = 0, sum2 = 0;
      let l = array.length;
      for (let i = burnIn - 1; i < l; i++) {
        sum += array[i];
        sum2 += array[i] * array[i];
      }
      const mean = sum / (l - burnIn);
      const variance =
        (sum2 / (l - burnIn) - mean * mean) * (l - burnIn) / (l - burnIn - 1);
      return {
        mean: mean,
        variance: variance,
        stdev: Math.sqrt(variance)
      }
    }

    /**
     * 
     * @param {*} formatedResult 
     * @param {Integer} burnIn 
     * @param {Function} statFunc
     * 
     * statFunc:: array, burnIn -> {mean, sd, ...} 
     */
    static estimateParameter(formatedResult, burnIn, _statFunc) {
      const statFunc = (_statFunc === undefined)
        ? MCMC.summarize
        : _statFunc;
      const parameters = formatedResult.parameter

      return parameters.map(parameter => {
        let obj = {};
        Object.entries(parameter).map(kv => {
          let [k, a] = kv;
          obj[k] = statFunc(a, burnIn)
        })
        return obj;
      })
    }

    // _/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/ */
    /* 1データ点の生起確率を取得 */
    // モデルからの1データの生起確率を返す
    // _/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/ 
    //
    /* modeledプロファイルの線素を計算 */
    //
    /* General */
    static getds(vecPost, vecPre) {
      return Math.sqrt(
        Object.keys(vecPost)
          .map(dim => (vecPost[dim] - vecPre[dim]) * (vecPost[dim] - vecPre[dim]))
          .reduce(sum, 0)
      );
    };

    /**
     * data frameから特定のインデックスの値からなるオブジェクトを切り出す
     * 
     * df:: {
     *  x:[],
     *  y:[],
     *  z:[]
     * }
     * 
     * return:: {
     *  x : x[i],
     *  y : y[i],
     *  z : z[i]
     * }
     * 
     * @param {DataFrame} df
     * @param {Number} i
     * @return Object
     */
    static slice(df, i) {
      const obj = {};
      Object.keys(df).map(k => {
        obj[k] = df[k][i]
      });
      return obj;
    }

    //	
    // 線素による1データの生起確率 */
    //
    /* getOccurrenceProbabilityByLE */
    /* General */
    getOccurrenceProbabilityByLE(modelPre, modelPost) {
      const data = this.data, error = this.error;
      const ds = MCMC.getds(modelPre, modelPost);
      const dim = Object.keys(modelPre);

      return dim.map(d => {
        let center = (modelPre[d] + modelPost[d]) * 0.5;
        return data[d].map((v, i) => (error[d][i] > 0)
          ? this.getLnError(center, v, error[d][i])
          : 0
        )
          .reduce(sum, 0)
      })
        .reduce(sum, 0)
    }



    //
    // 全てのデータ点の生起確率を取得 
    //
    /* getAllLnProbabilityByCurve */
    /* General */
    getAllLnProbabilityByCurve(model) {
      const dim = Object.keys(model);
      const l = model[dim[0]].length;

      return Array(l - 1).fill(0).map((v, i) => {
        let modelPre = MCMC.slice(model, i),
          modelPost = MCMC.slice(model, i + 1);
        return this.getOccurenceProbabilityByLE(modelPre, modelPost);
      })
        .reduce(sum, 0)
    };

    /**
     * Modelオブジェクトが持つ変数のみを計算に用いる.
     * 
     * @param {*} model 
     */
    getAllLnProbabilityByPoint(model) {
      const data = this.data, error = this.error;
      const dim = Object.keys(model)
      const l = model[dim[0]].length;

      return dim.map(d => {
        return Array(l).fill(0)
          .map((v, i) => (error[d][i] > 0)
            ? this.getLnError(model[d][i], data[d][i], error[d][i])
            : 0
          ).reduce(sum, 0);
      }).reduce(sum, 0);

    }


    /* getRandomRadius */
    getRandomRadius(oldR, dR, maxR) {
      let deltaR = [];
      for (let i = 0, l = oldR.length; i < l; i = (i + 1) | 0) {
        deltaR[i] = (i == 0) ? oldR[i] : oldR[i] - oldR[i - 1];
      }

      deltaR = deltaR.map((v) => {
        let cand = v + dR * this.rand._getU(1, -1);
        return (cand > 0) ? cand : v;
      })

      let newR = [];
      for (let i = 0, l = deltaR.length; i < l; i = (i + 1) | 0) {
        newR[i] = (i == 0) ? deltaR[i] : newR[i - 1] + deltaR[i];
      }

      let rMax = deltaR.reduce((a, b) => a + b);
      return newR.map((v) => v * maxR / rMax);
    }

  }

  return MCMC;
}))

