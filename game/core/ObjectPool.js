export class ObjectPool {
  constructor(factory, capacity) { this.items = Array.from({ length: capacity }, factory); }
  acquire() { return this.items.find(item => !item.active) || null; }
  get activeCount() { return this.items.filter(item => item.active).length; }
}
