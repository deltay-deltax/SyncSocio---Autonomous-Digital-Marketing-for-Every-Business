import app from './app.js';

const req = {
  method: 'GET',
  url: '/api/admin/fake-route',
  headers: {}
};

const res = {
  status: function(s) { console.log('STATUS:', s); return this; },
  json: function(j) { console.log('JSON:', j); return this; },
  send: function(s) { console.log('SEND:', s); return this; },
  end: function() { console.log('END'); },
  getHeader: () => undefined,
  setHeader: () => {},
  removeHeader: () => {},
  on: () => {}
};

app(req, res, (err) => {
  if (err) console.log('ERR:', err);
  else console.log('NEXT CALLED - Route not found!');
});
