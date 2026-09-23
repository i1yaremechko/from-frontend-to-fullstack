import crypto from 'node:crypto';

const start = Date.now();

function runHash(id) {
  // pbkdf2 виконується в Thread Pool libuv
  crypto.pbkdf2('password', 'salt', 100000, 512, 'sha512', () => {
    console.log(`Hash ${id}:`, Date.now() - start, 'ms');
  });
}

// Запускаємо 5 важких операцій
runHash(1);
runHash(2);
runHash(3);
runHash(4);
runHash(5);