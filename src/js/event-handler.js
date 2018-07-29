(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.eventHandler = factory(
      root.PubSub,
      root.TextParser,
      root.palette,
      root.ModalMedia,
      root.plotAfterEvent
    );
  }
}(this, function (_PubSub, _tf, _palette, _ModalMedia, _plotAfterEvent) {

  const { Publisher, Subscriber } = (typeof require === 'undefined' && (typeof _PubSub === 'object' || typeof _PubSub === 'function'))
    ? _PubSub
    : require("../../../jslib/pub_sub.js");

  const tf = (typeof require === 'undefined' && (typeof _tf === 'object' || typeof _tf === 'function'))
    ? _tf
    : require("../../../jslib/textParser.js");

  const palette = (typeof require === 'undefined' && (typeof _palette === 'object' || typeof _palette === 'function'))
    ? _palette
    : require("../../../jslib/palette.js");

  const ModalMedia = (typeof require === 'undefined' && (typeof _ModalMedia === 'object' || typeof _ModalMedia === 'function'))
    ? _ModalMedia
    : require("./modal-media");

  const {plotAfterSample} = (typeof require === 'undefined' && (typeof _plotAfterEvent === 'object' || typeof _plotAfterEvent === 'function'))
      ? _plotAfterEvent
      : require("./plot-after-event.js");


  const fetchFunc = (url, option) => (typeof require !== 'undefined')
    ? (fs => {
      return new Promise((res, rej) => {
        fs.readFile(url, option)
          .then(text => res(text))
      })
    })(require("fs-extra"))
    : new Promise((res, rej) => {
      fetch(url)
        .then(response => res(response.text()))
    });

  const df2table = df => {
    const thead = Object.keys(df);
    const data = Object.values(df);
    const tbody = []

    for (let i = 0, l = data[0].length; i < l; i++) {
      tbody[i] = [];
      for (let entry of data) {
        tbody[i].push(entry[i]);
      }
    }

    return "<table class='tableblock'>"
      + `<thead>${thead.map(v => `<th>${v.replace(/_/g, " ")}</th>`).reduce((a, b) => a + b, "")}</thead>`
      + `<tbody>
    ${tbody.map((rowAsArray, i) => {
        return `<tr>
        ${rowAsArray.map(v => `<td>${v}</td>`).reduce((a, b) => a + b, "")}
      </tr>`
      }).reduce((a, b) => a + "\n" + b, "")}
    </tbody></table>`

  }

  /**
   * 
   * Workerからmodelなどをstringifyして受け取ったものをmarkdownのコードブロックとして表示する.
   * data.replace(/\\r\\n/g, "\n").replace(/\\["']/g, "").replace(/"/g, "")は,
   * 余分な改行を削除,
   * クォーテーションマークを削除, 
   * することでFunction.toString()されたも含めてjavascriptコードとして認識されるようにしている
   * 
   * @param {String} text 
   * @param {String} title 
   */
  const text2md_code = (text, title = "") => '## ' + title + '\n```javascript\n' + text.replace(/\\r\\n/g, "\n").replace(/\\"/g, "").replace(/"/g, "") + '\n```'

  const { media, modalWindowPublisher } = ModalMedia(
    document.querySelector("#modal_container"),
    document.querySelector("#modal_window")
  )

  const dom_totalIteration = document.querySelector("#totalCount");

  const dom_input = {
    totalIteration: document.querySelector("#totalCount"),
    iteration: document.querySelector("#iteration_input"),
    workerNum: document.querySelector("#worker_number_input"),
    outputDir: document.querySelector("#output_dir_input"),
    outputPrefix: document.querySelector("#output_prefix_input"),
    alpha: document.querySelector("#alpha_input"),
    model: document.querySelector("#model_file_name_input"),
    plotInterval: document.querySelector("#plotInterval_input"),
    idPlotMCMC: document.querySelector("#idPlotMCMC_input")
  }

  const dom_show = {
    readme: document.querySelector("#readme"),
    model: document.querySelector("#show_model"),
    option: document.querySelector("#option_file_name"),
    data: document.querySelector("#data_file_name"),
    error: document.querySelector("#error_file_name")
  }

  const dom_currentIteration = document.querySelector("#presentCount");
  const dom_acceptedTable = document.querySelector("#accepted_table table");
  const dom_exchangeTable = document.querySelector("#exchange_table table");


  const updateTable = (dom_table, tbodyArray, thead = [], tbodyHead = []) => {
    const dom_thead = dom_table.querySelector("thead");
    const dom_tbody = dom_table.querySelector("tbody");

    if (thead.length > 0) {
      dom_thead.innerHTML = `<thead><th></th>${thead.map(v => `<th>${v.replace(/_/g, " ")}</th>`).reduce((a, b) => a + b, "")}</thead>`
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

  const initialize = state => {
    Object.entries(dom_input).map(([k, dom]) => {
      dom.value = state[k];
    })
  }

  const updateAcceptedRate = (ptmcmc, state, id) => {
    if (parseInt(id) === parseInt(state.idPlotMCMC)) updateTable(
      dom_acceptedTable,
      state.acceptedTime[id].map(paramSet => Object.values(paramSet)),
      Object.keys(state.acceptedTime[id][0]),
      state.acceptedTime[id].map((_, i) => "parameter set " + i)
    )
  }

  const updateExchangeRate = (ptmcmc, state) => {
    dom_currentIteration.innerHTML = ptmcmc.totalIteration;

    updateTable(
      dom_exchangeTable,
      [state.exchangeTime],
      Array(state.workerNum - 1).fill(0).map((_, i) => `${i}-${i + 1}`)
    )
  }

  const eventHandler = (ptmcmc, state) => {

    initialize(state);

    return (ev) => {
      /**
           * Define publisher and subscriber
           */
      const publisher = new Publisher()
      const subscriber = publisher.subscriber();

      subscriber.subscribe("restart", ({ file, state, ptmcmc }) => {
        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = ev => {
          const meta = JSON.parse(reader.result);

          [
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
            "option",
            "idPlotMCMC"
          ].map(key => {
            if (!meta.hasOwnProperty(key)) throw new Error("Invaild back up format.");
            publisher.publish("change_value", {
              value: meta[key],
              key: key,
              state: state
            })
          })

          document.querySelector("#model_file_name_input").value = state.model;

          document.querySelector("#data_file_name").innerHTML = state.data_file;

          document.querySelector("#error_file_name").innerHTML = state.error_file;
          state.mcmcInternalState = meta.mcmcInternalState;


          ptmcmc
            .reStartSession(
              state.workerNum,
              {
                "observed": {
                  "data": state.data,
                  "error": state.error
                },
                "model": state.model,
                "alpha": state.alpha,
                "option": state.option
              }
            );
          ptmcmc.setInternalState(meta.ptmcmcInternalState)
          ptmcmc.restoreInternalStateOfMCMC(state.mcmcInternalState);
          state.colorMap = palette("tol-rainbow", state.workerNum)
          state.totalIteration += parseInt(state.iteration);
          dom_totalIteration.innerHTML = state.totalIteration;

          state.mcmcState = "running";

          ptmcmc.startSampling(
            state.iteration,
            state.outputDir + state.outputPrefix
          )

        }

        reader.onerror = err => {
          //document.querySelector(label).innerHTML = "Not loaded !"
        }
      })

      subscriber.subscribe("change_data", ({ file, key, state, label, format }) => {

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = ev => {
          switch (format) {
            case "csv":
              /**
              * csvファイルを読み込んでDataframeに変換する
              */
              state[key] = tf.text2Dataframe(reader.result, "csv");
              break;
            case "json":
              state[key] = JSON.parse(reader.result);
              break;
            default:
              break;
          }
          document.querySelector(label).innerHTML = file.name;
          state[key + "_file"] = file.name;
        }

        reader.onerror = err => {
          document.querySelector(label).innerHTML = "Not loaded !"
        }
      })



      subscriber.subscribe("change_value", ({ value, key, state }) => {
        if (dom_input.hasOwnProperty(key)) dom_input[key].value = value;
        state[key] = value
      })


      subscriber.subscribe("execute", function (state) {

        // コントローラーを定義したほうが良さそう
        if (state.isDirty) {
          ptmcmc
            .startSession(
              state.workerNum,
              {
                "observed": {
                  "data": state.data,
                  "error": state.error
                },
                "model": state.model,
                "alpha": state.alpha,
                "option": state.option
              });
          state.seed = [];
          state.totalIteration = 0;
          state.isDirty = false;
          state.colorMap = palette("tol-rainbow", state.workerNum)
          state.acceptedTime = []
        }

        state.totalIteration += parseInt(state.iteration);
        dom_totalIteration.innerHTML = state.totalIteration;

        state.mcmcState = "running";

        ptmcmc.startSampling(
          state.iteration,
          state.outputDir + state.outputPrefix
        )
      })

      subscriber.subscribe("pause", ({ ptmcmc, state }) => {
        state.mcmcState = "paused";
        ptmcmc.pauseSampling = true;
      })

      subscriber.subscribe("continue", ({ ptmcmc, state }) => {
        state.mcmcState = "running";
        ptmcmc.pauseSampling = false;
      })

      /**
       * Add event listener to DOM
       */

      document.ondragover = document.ondrop = function (e) {
        e.preventDefault(); // イベントの伝搬を止めて、アプリケーションのHTMLとファイルが差し替わらないようにする
        return false;
      };


      const start_button = document.querySelector("#start_button")
      start_button.addEventListener("click", ev => {

        switch (state.mcmcState) {
          case "running":
            publisher.publish("pause", { ptmcmc, state });
            start_button.value = "Continue";
            break;
          case "initial":
            publisher.publish("execute", state);
            start_button.value = "Pause";
            break;
          case "idle":
            publisher.publish("execute", state);
            start_button.value = "Pause";
            break;
          case "paused":
            publisher.publish("continue", { ptmcmc, state });
            start_button.value = "Pause";
            break;
          default:
            break;
        }
      }, false)


      start_button.ondragover = ev => {

        switch (state.mcmcState) {
          case "running":
            break;
          case "initial":
            start_button.value = "Restart"
            break;
          case "idle":
            start_button.value = "Restart"
            break;
          case "paused":
            break;
          default:
            break;
        }
        return false
      }
      start_button.ondragleave = ev => {
        return false
      }

      start_button.ondrop = ev => {
        ev.preventDefault();

        switch (state.mcmcState) {
          case "running":
            break;
          case "idle":
            publisher.publish("restart", {
              file: ev.dataTransfer.files[0],
              state: state,
              ptmcmc: ptmcmc
            })
            start_button.value = "Pause"
            break;
          case "paused":
            break;
          default:
            break;
        }
        return false
      }


      dom_input.iteration
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: parseInt(dom_input.iteration.value),
            key: "iteration",
            state: state
          })
        })

      dom_input.model
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: dom_input.model.value,
            key: "model",
            state: state,
            "label": "#model_file_name"
          })
          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        })

      dom_input.alpha
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: parseFloat(dom_input.alpha.value),
            key: "alpha",
            state: state
          })
          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        })

      dom_input.workerNum
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: parseInt(dom_input.workerNum.value),
            key: "workerNum",
            state: state
          })
          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        })

      dom_input.outputDir
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: dom_input.outputDir.value,
            key: "outputDir",
            state: state
          })
        })

      dom_input.outputPrefix
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: dom_input.outputPrefix.value,
            key: "outputPrefix",
            state: state
          })
        })

      dom_input.plotInterval
        .addEventListener("change", _ => {
          publisher.publish("change_value", {
            value: dom_input.plotInterval.value,
            key: "plotInterval",
            state: state
          })
        });

      dom_input.idPlotMCMC
        .addEventListener("change", ev => {
          ev.preventDefault();
          publisher.publish("change_value", {
            value: dom_input.idPlotMCMC.value,
            key: "idPlotMCMC",
            state: state
          })

          if (state.mcmcState === "idle"){
            updateAcceptedRate(ptmcmc, state, dom_input.idPlotMCMC.value);
            updateExchangeRate(ptmcmc,state);
            plotAfterSample(ptmcmc, { id: dom_input.idPlotMCMC.value},state);
          }

        }, false);

      dom_input.idPlotMCMC
        .addEventListener("keydown", ev => {

        }, false);


      [["option", "json"], ["data", "csv"], ["error", "csv"]].map(([key, format]) => {
        const dom_list = document.querySelector(`#${key}_file_list`)
        dom_list.ondragover = function () {
          dom_list.classList.add("drag-over")
          return false;
        };
        dom_list.ondragleave = function () {
          dom_list.classList.remove("drag-over")
          return false;
        };
        dom_list.ondrop =
          ev => {
            ev.preventDefault();
            dom_list.classList.remove("drag-over")
            publisher.publish("change_data", {
              file: ev.dataTransfer.files[0], key: key, state: state,
              label: `#${key}_file_name`,
              format: format
            })

            publisher.publish("change_value", {
              value: true,
              key: "isDirty",
              state: state
            })
            return false
          }

        const dom_label = document.querySelector(`#${key}_file_select`);
        dom_label.addEventListener("change", ev => {
          publisher.publish("change_data", {
            file: ev.target.files[0], key: key, state: state,
            label: `#${key}_file_name`,
            format: format
          })

          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        }, false)
      })



      /**
       * modal windowへの表示
       */
      dom_show.model.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          const prefix = (typeof require !== "undefined")
            ? ""
            : "../"
          fetchFunc(prefix + state.model, "utf8")
            .then(res => {
              media.show(text2md_code(res, "Model"));
            });
        },
        false
      )

      dom_show.readme.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          media.show("../doc/readme.adoc")
        },
        false
      )

      dom_show.option.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          media.show(text2md_code(JSON.stringify(state.option, null, 2), "External parameters"));
        },
        false
      )


      dom_show.data.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          media.show(df2table(state.data));
        },
        false
      )

      dom_show.error.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          media.show(df2table(state.error));
        },
        false
      )
    }
  }

  return {
    updateAcceptedRate,
    updateExchangeRate,
    eventHandler
  }
}))