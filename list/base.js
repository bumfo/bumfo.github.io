((function() {
  class Entry {
    constructor(val, prev = this, next = this) {
      this.val = val;
      this.prev = prev;
      this.next = next;
    }
  }

  function linkBetween(el, prev, next) {
    el.prev = prev;
    el.next = next;

    prev.next = el;
    next.prev = el;
  }

  function removeLink(el, prev, next) {
    prev.next = next;
    next.prev = prev;
  }

  class List {
    constructor() {
      this.nil = new Entry(null);
    }

    add(el, after) {
      var prev = after;
      var next = prev.next;

      linkBetween(el, prev, next);
    }

    delete(el) {
      var prev = el.prev;
      var next = el.next;

      removeLink(el, prev, next);
    }

    addFront(el) {
      this.add(el, this.nil);
    }

    addBack(el) {
      this.add(el, this.nil.prev);
    }

    front() {
      return this.nil.next;
    }

    back() {
      return this.nil.prev;
    }
  }
}).call(this));
