import app from './app.js';
console.log(app._router.stack.filter(r => r.name === 'router').map(r => r.regexp));
