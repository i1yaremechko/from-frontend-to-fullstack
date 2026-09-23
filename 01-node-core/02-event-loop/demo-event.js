import http from 'node:http';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

// Рекурсивне обчислення числа Фібоначчі (важка CPU-bound задача)
function fib(n) {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

if (isMainThread) {
  http
    .createServer((req, res) => {
      if (req.url === '/block') {
        // ❌ Блокує Call Stack головного потоку
        return res.end(String(fib(42)));
      }

      if (req.url === '/worker') {
        // ✅ Делегує обчислення окремому Worker Thread
        const worker = new Worker(new URL(import.meta.url), { workerData: 42 });

        worker.once('message', (result) => res.end(String(result)));
        worker.once('error', (err) => {
          res.statusCode = 500;
          res.end(err.message);
        });
        return;
      }

      res.end('ok');
    })
    .listen(3000, () => console.log('Server running: http://localhost:3000'));
} else {
  // Код, який виконується всередині Worker Thread
  parentPort.postMessage(fib(workerData));
}