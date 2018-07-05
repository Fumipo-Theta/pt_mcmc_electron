(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.PubSub = factory();
  }
}(this, function () {

  class Publisher {
    constructor() {
      this._subscriber = [];
      return this;
    }

    mayAdd(subscriber) {
      if (!this._subscriber.includes(subscriber)) {
        this._subscriber.push(subscriber);
      }
    }

    subscriber() {
      const subscriber = new Subscriber();
      this.mayAdd(subscriber);
      return subscriber;
    }

    register(subscriber) {
      this.mayAdd(subscriber);
      return this;
    }

    publish(ev, arg) {
      for (let subscriber of this._subscriber) {
        subscriber.listen(ev, arg);
      }
    }
  }

  class Subscriber {
    constructor(ev, callback) {
      this.subscribedList = [];
      return this;
    }

    subscribe(ev, callback) {
      /*
        本来重複を避ける処理を入れる
      */
      this.subscribedList.push({
        event: ev,
        callback: callback
      })
      return this;
    }


    listen(ev, arg) {
      for (let subscription of this.subscribedList) {
        if (ev === subscription.event) subscription.callback(arg);
      }
    }
  }

  return { Publisher, Subscriber };
}))