(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.eventHandler = factory(
      root.PubSub,
      root.textFile,
      root.palette,
      root.ModalMedia
    );
  }
}(this, function (_PubSub, _tf, _palette, _Modal_Media) {

  const { Publisher, Subscriber } = (typeof require === 'undefined' && (typeof _PubSub === 'object' || typeof _PubSub === 'function'))
    ? _PubSub
    : require("../../../jslib/pub_sub.js");

  const tf = (typeof require === 'undefined' && (typeof _tf === 'object' || typeof _tf === 'function'))
    ? _tf
    : require("../../../jslib/textFile.js");

  const palette = (typeof require === 'undefined' && (typeof _palette === 'object' || typeof _palette === 'function'))
    ? _palette
    : require("../../../jslib/palette.js");

  const ModalMedia = (typeof require === 'undefined' && (typeof _ModalMedia === 'object' || typeof _ModalMedia === 'function'))
    ? _ModalMedia
    : require("./modal-media");


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
      + `<thead>${thead.map(v => `<th>${v}</th>`).reduce((a, b) => a + b, "")}</thead>`
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
   * @param {String} data 
   * @param {String} title 
   */
  const data2md_code = (data, title = "") => '## ' + title + '\n```javascript\n' + data.replace(/\\r\\n/g, "\n").replace(/\\"/g, "").replace(/"/g, "") + '\n```'

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
    model: document.querySelector("#model_file_name_input")
  }

  const dom_show = {
    readme: document.querySelector("#readme"),
    model: document.querySelector("#show_model"),
    option: document.querySelector("#option_file_name"),
    data: document.querySelector("#data_file_name"),
    error: document.querySelector("#error_file_name")
  }



  const initialize = state => {
    Object.entries(dom_input).map(([k, dom]) => {
      dom.value = state[k];
    })
  }

  return (ptmcmc, state) => {

    initialize(state);

    return (ev) => {
      /**
           * Define publisher and subscriber
           */
      const publisher = new Publisher()
      const subscriber = publisher.subscriber();

      subscriber.subscribe("change_data", ({ ev, key, state, label, format }) => {
        const file = ev.target.files[0];
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
        }

        reader.onerror = err => {
          document.querySelector(label).innerHTML = "Not loaded !"
        }
      })



      subscriber.subscribe("change_value", ({ value, key, state }) => {
        state[key] = value
      })


      subscriber.subscribe("execute", function (state) {

        // コントローラーを定義したほうが良さそう
        if (state.isDirty) {
          ptmcmc
            .createChain(
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
          state.totalIteration = 0;
          state.isDirty = false;
          state.colorMap = palette("tol-rainbow", state.workerNum)
          state.acceptedTime = []
        }

        state.totalIteration += parseInt(state.iteration);
        dom_totalIteration.innerHTML = state.totalIteration;

        ptmcmc.execute(
          state.iteration,
          state.outputDir + state.outputPrefix
        )
      })



      /**
       * Add event listener to DOM
       */
      document.querySelector("#start_button")
        .addEventListener("click", ev => {
          publisher.publish("execute", state);
        }, false)

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

      document.querySelector("#option_file_select")
        .addEventListener("change", ev => {
          publisher.publish("change_data", {
            ev: ev, key: "option", state: state,
            label: "#option_file_name",
            format: "json"
          })

          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        }, false)

      document.querySelector("#data_file_select")
        .addEventListener("change", ev => {
          publisher.publish("change_data", {
            ev: ev, key: "data", state: state,
            label: "#data_file_name",
            format: "csv"
          })

          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        }, false)

      document.querySelector("#error_file_select")
        .addEventListener("change", ev => {
          publisher.publish("change_data", {
            ev: ev, key: "error", state: state,
            label: "#error_file_name",
            format: "csv"
          })

          publisher.publish("change_value", {
            value: true,
            key: "isDirty",
            state: state
          })
        }, false)

      /**
       * modal windowへの表示
       */
      dom_show.model.addEventListener("click",
        ev => {
          modalWindowPublisher.publish("open");
          media.show(data2md_code(state.__model__, "Model"))
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
          media.show(data2md_code(JSON.stringify(state.option, null, 2), "External parameters"));
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
}))