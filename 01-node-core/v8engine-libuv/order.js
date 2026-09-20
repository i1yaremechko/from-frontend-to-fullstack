console.log('1: sync');

setTimeout(() => console.log('4: timer (macrotask)'), 0);

Promise.resolve().then(() => console.log('3: promise (microtask)'));

queueMicrotask(() => console.log('3b: queueMicrotask'));

console.log('2: sync end');
// Порядок: 1 → 2 → 3 → 3b → 4