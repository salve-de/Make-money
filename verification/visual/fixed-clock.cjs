// Test-only server preload. Used exclusively by the isolated visual comparison runner.
// Keep constructor arguments intact (cookies, dates in data, parsing); freeze only "now".
const NativeDate = globalThis.Date;
const epoch = NativeDate.parse('2026-09-15T00:00:00.000Z');
globalThis.Date = new Proxy(NativeDate, {
  construct(target, args, newTarget) { return Reflect.construct(target, args.length ? args : [epoch], newTarget); },
  apply() { return new NativeDate(epoch).toString(); },
  get(target, key, receiver) { return key === 'now' ? () => epoch : Reflect.get(target, key, receiver); },
});
