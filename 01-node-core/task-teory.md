##Теорія-мінімум

- Runtime: V8 + libuv, single-thread JS + thread pool для I/O
- Event loop: черги macrotask / microtask; чому await не блокує потік, а while(true) блокує
- ESM vs CommonJS ("type": "module"), node:-префікс для вбудованих модулів
- Вбудовані модулі: fs/promises, path, http, stream, events, os, crypto, worker_threads
- Streams і backpressure
- Сучасний Node: fetch, AbortController, node --watch, node --env-file=.env, вбудований test runner node:test
- process.env, process.argv, сигнали (SIGTERM, SIGINT)