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

const router = express.Router();

router.get('/track-click', trackDMFlowClick);

router.get('/', protect, listDMFlows);
router.post('/', protect, createDMFlow);
router.post('/match', protect, matchDMFlowByKeyword);
router.get('/:id', protect, getDMFlowById);
router.put('/:id', protect, updateDMFlow);
router.patch('/:id/active', protect, setDMFlowActiveState);
router.post('/:id/stats', protect, incrementDMFlowStat);
router.delete('/:id', protect, deleteDMFlow);

export default router;
