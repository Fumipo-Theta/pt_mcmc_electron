
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(
      undefined,
      undefined,
      root.MathJax,
      root.hljs
    );
  } else {
    root.ModalMedia = factory(
      root.Media,
      root.PubSub,
      root.MathJax,
      root.hljs
    );
  }
}(this, function (_Media, _PubSub/*, MathJax, hljs*/) {

  const Media = (typeof require === 'undefined' && (typeof _Media === 'object' || typeof _Media === 'function'))
    ? _Media
    : require("./modules/modalWindow/media");

  const { Publisher } = (typeof require === 'undefined' && (typeof _PubSub === 'object' || typeof _PubSub === 'function'))
    ? _PubSub
    : require("../../../jslib/pub_sub");


  return (dom_container, dom_window) => {

    /** モーダルウィンドウの操作を行うPublisher
       * 
      */
    const modalWindowPublisher = new Publisher();
    const modalWindow = modalWindowPublisher.subscriber();

    modalWindow.subscribe("open", function () {
      dom_container.classList.add("active");
      dom_window.scrollTo(0, 0);
    });
    modalWindow.subscribe("close", function () {
      dom_container.classList.remove("active");
    })


    dom_container.addEventListener("click", (ev) => modalWindowPublisher.publish("close"), false);

    dom_window.addEventListener("click", function (ev) {
      ev.stopPropagation();
    }, false)


    /** 文字列パーサ
     * 
    */



    const parseMathJax = function (domRoot) {
      const convert = function (domRoot) {
        return new Promise((res, rej) => {
          res(MathJax.Hub.Typeset(domRoot));
        })
      }

      return new Promise((res, rej) => {
        convert(domRoot)
          .then(() => res(domRoot))
          .catch(rej);

        setTimeout(rej, 5000, "MathJax timed out")
      })
    }


    const highlight = function (dom) {
      return new Promise((res, rej) => {
        const block = dom.querySelectorAll("pre code");
        for (let i = 0, l = block.length; i < l; i++) {
          hljs.highlightBlock(block[i]);
        }
        res(dom);
      })
    }

    const media = new Media(
      dom_window,
      [
        parseMathJax,
        highlight
      ]
    )


    return { media, modalWindowPublisher };
  }
}))