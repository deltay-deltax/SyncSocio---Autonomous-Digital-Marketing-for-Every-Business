import { validate } from './middleware/validate.js';
import { listNexaConversationsSchema } from './validators/nexaSchemas.js';

try {
  const req = { query: { limit: '50' } };
  const res = {
    status: (code) => ({ json: (data) => console.log('res.status', code, data) })
  };
  const next = () => console.log('next called. req.query is:', req.query);

  const middleware = validate({ query: listNexaConversationsSchema });
  middleware(req, res, next);
} catch (e) {
  console.error('Middleware threw an error:', e);
}
