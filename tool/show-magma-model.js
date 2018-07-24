(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.show_magma_model = factory();
  }
}(this, function () {

  const fs = require("fs")
  const tf = require("../../jslib/textFile")
  const funcTools = require("../../jslib/funcTools")
  const palette = require("../../jslib/palette.js")

  const ls = directoryPath => (filterFileFunc = path => file => fs.statSync(path + file).isFile()) => {
    const files = fs.readdirSync(directoryPath, (err) => {
      if (err) throw err;
    })
    return {
      directory: directoryPath,
      files: files.filter(filterFileFunc(directoryPath))
    }
  }

  const read = {
    csv: path => tf.text2Dataframe(fs.readFileSync(path, "utf-8"), "csv"),
    json: path => JSON.parse(fs.readFileSync(path, "utf-8"))
    //console.log(meta)
  }

  const fetchData = (rp, dp) => {
    const metaFiles = ls(rp)(path => file => fs.statSync(path + file).isFile() && /^meta.*\.json$/.test(file))
    const sampleFiles = ls(rp)(path => file => fs.statSync(path + file).isFile() && /.*\.csv$/.test(file))
    const summaryFiles = ls(rp)(path => file => file === "summary.csv");
    //console.log(metaFiles)
    //console.log(sampleFiles)

    const meta = read.json(`${metaFiles.directory}${metaFiles.files.pop()}`)

    const data = read.csv(`${dp}${meta.data_file}`)

    const error = read.csv(`${dp}${meta.data_file}`)

    const option = (meta.hasOwnProperty("option"))
      ? meta.option
      : read.json("../model/" + meta.option_file)

    const summary = read.csv(`${summaryFiles.directory}${summaryFiles.files[0]}`)

    console.log("Summary column", Object.keys(summary))

    return {
      meta,
      data,
      error,
      option,
      summary
    }
  }



  const getSummarizedParameters = (df, by, initial_parameters) => {
    const ps = [...initial_parameters];
    const splited = df.parameter.map((k, i) => {
      let parameter = k.slice(0, k.length - 1)
      let num = k.slice(k.length - 1)
      return [parameter, num]
    });

    splited.map(([parameter, num], i) => {
      if (0 < i && i < splited.length - 1) {
        ps[num][parameter] = df[by][i]
      }
    })
    return ps
  }

  const groupEachStage = (parameters) => {
    const obj = {};
    parameters.map((p, i) => {
      if (i === 0) {
        Object.keys(p).map(k => {
          obj[k] = []
        })
      }
      Object.entries(p).map(([k, v]) => {
        obj[k][i] = v
      })
    })
    return obj
  }

  const Plotly = require("ijavascript-plotly");

  const integratedLiquidLine = (magma, cmap) => {
    const differentiationLines = magma.custom.differentiationLineStack;
    const mixingLines = magma.custom.mixingLineStack;
    const l = differentiationLines.length;

    return (x, y) => funcTools.zip(mixingLines)(differentiationLines).map(
      ([m, d], i) => {
        if (i === 0) {
          return [
            {
              x: [m[x][0]],
              y: [m[y][0]],
              name: "Current WR",
              mode: "markers",
              marker: {
                size: 8,
                color: "#000000"
              }
            },
            {
              x: d[x],
              y: d[y],
              mode: "lines",
              name: "growth " + (l - i - 1),
              line: {
                width: 2,
                color: cmap[i]
              }
            }/*,
            {
              x: m[x],
              y: m[y],
              mode: "markers",
              name: "mixing " + (l - i - 1),
              marker: {
                size: 4,
                color: cmap[i]
              }
            }*/
          ]
        } else {
          return [
            {
              x: m[x],
              y: m[y],
              mode: "markers",
              name: "mixing " + (l - i - 1),
              marker: {
                size: 4,
                color: cmap[i]
              }
            },
            {
              x: d[x],
              y: d[y],
              mode: "lines",
              name: "growth " + (l - i - 1),
              line: {
                width: 2,
                color: cmap[i]
              }
            }
          ]
        }
      }
    ).reduce((a, b) => [...a, ...b], [])

  }

  const dfRowToParameters = (df, index) => {
    const p = [];
    const row = Object.entries(df).map(([key, column]) => {
      try {
        var stage = key.match(/[0-9]+$/)[0];
        var parameterName = key.replace(stage, "");
      } catch{
        return []
      }
      return [{
        stage: parseInt(stage),
        parameter: parameterName,
        value: parseFloat(column[index])
      }]
    }).reduce((a, b) => [...a, ...b], [])
    row.map(obj => obj.stage)
      .filter((x, i, self) => self.indexOf(x) === i)
      .map((_, i) => {
        p[i] = {}
      });
    row.map(({ stage, parameter, value }) => {
      p[stage][parameter] = value
    })
    return p;
  }

  const meltBeforeCrystallization = (df, index, stage, model, data) => {
    const liquidLineStack = model(dfRowToParameters(df, index), data, false).custom.differentiationLineStack
    const l = liquidLineStack.length;
    const liquidLine = liquidLineStack[l - stage - 1];
    const obj = {}
    Object.entries(liquidLine).map(([key, array]) => {
      obj[key] = array[array.length - 1]
    })
    return obj
  }



  const sampleMeltComposition = (df, stage, model, data, directory) => {
    const reduceToCsv = (a, b) => a + "," + b
    const path = `${directory}melt_${stage}.csv`
    const l = df[Object.keys(df)[0]].length;
    for (let i = 0; i < l; i++) {
      let melt = meltBeforeCrystallization(df, i, stage, model, data);
      if (i === 0) fs.writeFileSync(path, Object.keys(melt).reduce(reduceToCsv) + ",lnP\n")
      fs.appendFileSync(path, Object.values(melt).reduce(reduceToCsv) + "," + df.lnP[i] + "\n")
    }
    console.log("Fulfilled")
  }


  return {
    ls,
    read,
    fetchData,
    getSummarizedParameters,
    groupEachStage,
    palette,
    integratedLiquidLine,
    Plotly,
    sampleMeltComposition
  };
}))