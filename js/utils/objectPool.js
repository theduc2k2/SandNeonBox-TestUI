export default class ObjectPool {
  constructor(createFn, resetFn, initialSize = 0) {
    this._create = createFn;
    this._reset = resetFn;
    this._pool = [];
    if (initialSize > 0) {
      this.preload(initialSize);
    }
  }

  get() {
    return this._pool.length > 0 ? this._pool.pop() : this._create();
  }

  release(obj) {
    this._reset(obj);
    this._pool.push(obj);
  }

  preload(count) {
    for (let i = 0; i < count; i++) {
      this._pool.push(this._create());
    }
  }

  size() {
    return this._pool.length;
  }
}
