(function (root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.plotAfterEvent = factory(
      root.Plotly
    )
  }
}(this, function (_Plotly) {

  const Plotly = (typeof require === 'undefined' && (typeof _Plotly === 'object' || typeof _Plotly === 'function'))
    ? _Plotly
    : require('plotly.js/lib/core');


  if (typeof require !== 'undefined') Plotly.register(
    [
      require("plotly.js/lib/scatter")
    ]
  )

  /**
       * Plotlyのサブプロットを複数horizontalに並べる時のdomainを計算する
       * 
       * @param{Number} i : 何番目のサブプロットか
       * @param{Number} l : サブプロットのトータル数
       * @param{Number} gap : サブプロット間の隙間の広さ(domainスケール)
       */
  const getDomain = (i, l, gap = 0.1) => {
    const d = (1 - gap * (l - 1)) / l;
    return [
      (d + gap) * i,
      (d + gap) * (i + 1) - gap
    ]
  }

  const getDataAndModel_plotly = (data, error, model, primaryKey) => {
    /**
     *  model: {
     *  x : [],
     *  y : [],
     *  z : []
     * }
     */
    const xy = Object.keys(model)
      .filter(v => v !== primaryKey)
      .map(v => { return { x: primaryKey, y: v } });
    /**
     * xy = [{x:"x",y:"y"},{x:"x",y:"z"}]
     */

    const trace = xy.map(({ x, y }, i) => {
      return [
        {
          x: data[x],
          y: data[y],
          error_x: {
            type: data,
            array: error[x],
            visible: true,
            color: "gray"
          },
          error_y: {
            type: data,
            array: error[y],
            visible: true,
            color: "gray"
          },
          "showlegend": false,
          name: "Observed",
          type: "scatter",
          mode: "lines+markers",
          xaxis: `x${i + 1}`,
          yaxis: `y${i + 1}`,
          line: {
            color: "gray"
          },
          marker: {
            color: "black"
          }
        },
        {
          x: model[x],
          y: model[y],
          "showlegend": false,
          name: "Modeled",
          type: "scatter",
          xaxis: `x${i + 1}`,
          yaxis: `y${i + 1}`,
          line: {
            color: "#2196f3"
          },
          marker: {
            color: "2196f3"
          }
        }
      ].reduce((a, b) => a.concat(b), []);
    }).reduce((a, b) => a.concat(b), [])

    const layout = {
      "width": 750 * xy.length,
      "height": 750
    };

    xy.map(({ x, y }, i) => {
      if (i + 1 > 1) {
        layout["xaxis" + (i + 1)] = {
          title: x,
          domain: getDomain(i, xy.length, 0.1)
        }
        layout["yaxis" + (i + 1)] = {
          title: y,
          anchor: "x" + (i + 1)
        }
      } else {
        layout.xaxis = {
          title: x,
          domain: getDomain(i, xy.length, 0.1)
        }
        layout.yaxis = {
          title: y
        }
      }
    })

    return { trace, layout };
  }

  const getParameter_plotly = (parameter) => {
    const layout = {
      showlegend: false
    }

    const l_p = parameter.length;
    const trace = parameter.map((p, i) => {
      let l = Object.entries(p).length;
      return Object.entries(p).map(([k, v], j) => {
        layout["xaxis" + (l * i + j + 1)] = {
          showticklabels: false,
          domain: getDomain(i, l_p, 0.01)
        };
        layout["yaxis" + (l * i + j + 1)] = {
          title: k + " " + i,
          anchor: "x" + (l * i + j + 1),
          domain: getDomain(l - j - 1, l, 0.01)
        };
        return {
          y: v,
          xaxis: "x" + (l * i + j + 1),
          yaxis: "y" + (l * i + j + 1),
          type: "scatter",
          mode: "lines",
          line: {
            color: "#2196f3"
          }
        }
      })
    }).reduce((a, b) => a.concat(b), []);

    layout.width = 400 * parameter.length;
    layout.height = 300 * Object.keys(parameter[0]).length

    return { trace, layout };
  }






  const plotAfterSample = async (ptmcmc, msg, state) => {
    // 0番目(最も低温のMCMCのモデルのみプロットする)
    //if (msg.id !== 0) return false;
    const plot_model = getDataAndModel_plotly(
      state.data,
      state.error,
      msg.modeled,
      state.primaryKey
    )

    const plot_parameter = getParameter_plotly(
      ptmcmc.parameterStorage[0]
    )

    const plotMethod = (ptmcmc.totalIteration === 1 || ptmcmc.totalIteration === state.totalIteration)
      ? Plotly.newPlot
      : (ptmcmc.totalIteration % state.plotInterval === 0)
        ? Plotly.react
        : (_) => null;

    const plotOption = (ptmcmc.totalIteration === state.totalIteration)
      ? { staticPlot: false }
      : { staticPlot: true };
    // ここでグラフを更新する
    await plotMethod(
      "wrapper_data_and_model",
      plot_model.trace,
      plot_model.layout,
      plotOption
    )

    await plotMethod(
      "param_wrapper",
      plot_parameter.trace,
      plot_parameter.layout,
      plotOption
    )

    return true;
  }

  /**
     * Plotlyのためのtraceとlayoutを返す.
     * lnPとinvT*lnP2つのグラフを作成する.
     * それぞれのサブプロット内で, 全てのMCMCの値をプロットする.
     * 
     * Issue:
     * LaTeXがレンダリングされない.
     * 
     * lnPs : [[],[],...]
     * invTs : [,,]
     */
  const getLnP_plotly = (lnPs, invTs, colorMap) => {
    const traceRaw = lnPs.map((lnP, i) => {
      return {
        y: lnP,
        name: "MCMC No." + i,
        xaxis: "x1",
        yaxis: "y1",
        type: 'scatter',
        mode: "lines",
        line: {
          color: "#" + colorMap[i]
        }
      }
    })

    const traceHeated =
      lnPs.map((lnP, i) => {
        return {
          y: lnP.map(v => v * invTs[i]),
          name: "MCMC No." + i,
          xaxis: "x2",
          yaxis: "y2",
          type: 'scatter',
          mode: "lines",
          line: {
            color: "#" + colorMap[i]
          }
        }
      })

    const trace = traceRaw.concat(traceHeated);
    const layout = {
      width: 750 * 2,
      height: 500,
      xaxis: {
        domain: getDomain(0, 2, 0.1),
        title: "traial",
        showticklabels: false
      },
      yaxis: {
        title: 'log P'
      },
      xaxis2: {
        domain: getDomain(1, 2, 0.1),
        title: "traial",
        showticklabels: false
      },
      yaxis2: {
        anchor: 'x2',
        title: '1/T log P'
      }
    }
    return { trace, layout }
  }



  const plotAfterSwap = (ptmcmc, msg, state) => {
    const plot_lnP = getLnP_plotly(
      ptmcmc.lnPStorage,
      ptmcmc.invTs,
      state.colorMap
    )

    const plotMethod = (ptmcmc.totalIteration === 1 || ptmcmc.totalIteration === state.totalIteration)
      ? Plotly.newPlot
      : (ptmcmc.totalIteration % state.plotInterval === 0)
        ? Plotly.react
        : (_) => null;

    const plotOption = (ptmcmc.totalIteration === state.totalIteration)
      ? { staticPlot: false }
      : { staticPlot: true };

    plotMethod(
      "energy_chart",
      plot_lnP.trace,
      plot_lnP.layout,
      plotOption
    )
    return true
  }

  return {
    plotAfterSample,
    plotAfterSwap
  };
}))