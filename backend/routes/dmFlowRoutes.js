import express from 'express';
import {
  createDMFlow,
  deleteDMFlow,
  getDMFlowById,
  incrementDMFlowStat,
  listDMFlows,
  matchDMFlowByKeyword,
  setDMFlowActiveState,
  trackDMFlowClick,
  updateDMFlow,
} from '../controllers/dmFlowController.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicRateLimiter } from '../middleware/rateLimitMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  listFlowsSchema,
  createFlowSchema,
  setFlowActiveSchema,
  matchByKeywordSchema,
  incrementStatSchema,
  trackClickSchema,
} from '../validators/dmFlowSchemas.js';

const router = express.Router();

router.get('/track-click', publicRateLimiter, validate({ query: trackClickSchema }), trackDMFlowClick);

router.get('/', protect, validate({ query: listFlowsSchema }), listDMFlows);
router.post('/', protect, validate({ body: createFlowSchema }), createDMFlow);
router.post('/match', protect, validate({ body: matchByKeywordSchema }), matchDMFlowByKeyword);
router.get('/:id', protect, validate({ params: idParamSchema }), getDMFlowById);
router.put('/:id', protect, validate({ params: idParamSchema, body: createFlowSchema }), updateDMFlow);
router.patch('/:id/active', protect, validate({ params: idParamSchema, body: setFlowActiveSchema }), setDMFlowActiveState);
router.post('/:id/stats', protect, validate({ params: idParamSchema, body: incrementStatSchema }), incrementDMFlowStat);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteDMFlow);

export default router;
