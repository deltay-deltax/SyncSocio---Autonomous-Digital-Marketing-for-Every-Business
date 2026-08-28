import adminRoutes from './routes/adminRoutes.js';
adminRoutes.stack.forEach(r => {
  if (r.route && r.route.path) {
    console.log(Object.keys(r.route.methods)[0].toUpperCase() + ' ' + r.route.path);
  }
});
