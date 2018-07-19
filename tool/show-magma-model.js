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

  const fetchData = (rp, dp) => {
    const metaFiles = ls(rp)(path => file => fs.statSync(path + file).isFile() && /^meta.*\.json$/.test(file))
    const sampleFiles = ls(rp)(path => file => fs.statSync(path + file).isFile() && /.*\.csv$/.test(file))
    const summaryFiles = ls(rp)(path => file => file === "summary.csv");
    //console.log(metaFiles)
    //console.log(sampleFiles)

    const meta = JSON.parse(fs.readFileSync(`${metaFiles.directory}${metaFiles.files.pop()}`))
    //console.log(meta)

    const data = tf.text2Dataframe(fs.readFileSync(`${dp}${meta.data_file}`, "utf-8"), "csv")
    const error = tf.text2Dataframe(fs.readFileSync(`${dp}${meta.data_file}`, "utf-8"), "csv")
    const option = JSON.parse(fs.readFileSync("../model/" + meta.option_file, "utf-8"))


    //console.log(option)

    const summary = tf.text2Dataframe(fs.readFileSync(`${summaryFiles.directory}${summaryFiles.files[0]}`, "utf-8"), "csv")
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
              line: {
                width: 2,
                color: cmap[i]
              }
            },
            {
              x: m[x],
              y: m[y],
              mode: "markers",
              marker: {
                size: 4,
                color: cmap[i]
              }
            }
          ]
        } else {
          return [
            {
              x: m[x],
              y: m[y],
              mode: "markers",
              marker: {
                size: 4,
                color: cmap[i]
              }
            },
            {
              x: d[x],
              y: d[y],
              mode: "lines",
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


  return {
    fetchData,
    getSummarizedParameters,
    groupEachStage,
    palette,
    integratedLiquidLine,
    Plotly
  };
}))