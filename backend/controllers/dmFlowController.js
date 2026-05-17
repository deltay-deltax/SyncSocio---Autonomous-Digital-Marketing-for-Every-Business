import DMFlow, { FLOW_TARGET_TYPES, FLOW_TRIGGERS, normalizeKeywordInput } from '../models/DMFlow.js';

const FLOW_STAT_EVENTS = new Set(['triggered', 'replied', 'clicked', 'conversions']);

const toTrimmedString = (value) => (typeof value === 'string' ? value.trim() : value);

const pickDefined = (input) => {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries);
};

const buildFlowPayload = (body = {}) => {
  const payload = {
    name: toTrimmedString(body.name),
    trigger: body.trigger,
    targetType: body.targetType,
    targetMediaId: toTrimmedString(body.targetMediaId),
    keyword: toTrimmedString(body.keyword),
    commentReplyMessage: toTrimmedString(body.commentReplyMessage),
    messages: Array.isArray(body.messages) ? body.messages : undefined,
    source: body.source,
  };

  if (typeof body.active === 'boolean') {
    payload.active = body.active;
  }

  return pickDefined(payload);
};

const handleControllerError = (res, error, fallbackMessage) => {
  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid DM flow id.' });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ message: fallbackMessage });
};

export const listDMFlows = async (req, res) => {
  try {
    const query = {}; // Bypassing user check for hackathon to share flows among teammates

    if (req.query.active === 'true' || req.query.active === 'false') {
      query.active = req.query.active === 'true';
    }

    if (typeof req.query.trigger === 'string' && FLOW_TRIGGERS.includes(req.query.trigger)) {
      query.trigger = req.query.trigger;
    }

    if (typeof req.query.targetType === 'string' && FLOW_TARGET_TYPES.includes(req.query.targetType)) {
      query.targetType = req.query.targetType;
    }

    const flows = await DMFlow.find(query).sort({ updatedAt: -1 });
    return res.status(200).json({ data: flows });
  } catch (error) {
    return handleControllerError(res, error, 'Failed to fetch DM flows.');
  }
};

export const getDMFlowById = async (req, res) => {
  try {
    const flow = await DMFlow.findOne({ _id: req.params.id });
    if (!flow) {
      return res.status(404).json({ message: 'DM flow not found.' });
    }

    return res.status(200).json(flow);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to fetch DM flow.');
  }
};

export const createDMFlow = async (req, res) => {
  try {
    const payload = buildFlowPayload(req.body);
    const flow = await DMFlow.create({
      user: req.user._id,
      ...payload,
    });

    return res.status(201).json(flow);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to create DM flow.');
  }
};

export const updateDMFlow = async (req, res) => {
  try {
    const flow = await DMFlow.findOne({ _id: req.params.id });
    if (!flow) {
      return res.status(404).json({ message: 'DM flow not found.' });
    }

    const payload = buildFlowPayload(req.body);
    Object.assign(flow, payload);
    await flow.save();

    return res.status(200).json(flow);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to update DM flow.');
  }
};

export const setDMFlowActiveState = async (req, res) => {
  try {
    if (typeof req.body.active !== 'boolean') {
      return res.status(400).json({ message: 'active must be a boolean value.' });
    }

    const flow = await DMFlow.findOneAndUpdate(
      { _id: req.params.id },
      { active: req.body.active, source: 'user' },
      { new: true }
    );

    if (!flow) {
      return res.status(404).json({ message: 'DM flow not found.' });
    }

    return res.status(200).json(flow);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to update DM flow active state.');
  }
};

export const deleteDMFlow = async (req, res) => {
  try {
    const deletedFlow = await DMFlow.findOneAndDelete({ _id: req.params.id });
    if (!deletedFlow) {
      return res.status(404).json({ message: 'DM flow not found.' });
    }

    return res.status(200).json({ message: 'DM flow deleted successfully.' });
  } catch (error) {
    return handleControllerError(res, error, 'Failed to delete DM flow.');
  }
};

export const matchDMFlowByKeyword = async (req, res) => {
  try {
    const { trigger, incomingText } = req.body;
    const targetMediaId = toTrimmedString(req.body?.targetMediaId) || '';

    if (!FLOW_TRIGGERS.includes(trigger)) {
      return res.status(400).json({ message: 'Invalid trigger type.' });
    }

    if (typeof incomingText !== 'string' || !incomingText.trim()) {
      return res.status(400).json({ message: 'incomingText is required.' });
    }

    const normalizedIncomingText = normalizeKeywordInput(incomingText);
    const query = {
      user: req.user._id,
      active: true,
      trigger,
      keywordNormalized: normalizedIncomingText,
    };

    if (targetMediaId) {
      query.$or = [
        { targetType: 'all' },
        { targetType: 'specific', targetMediaId },
      ];
    } else {
      query.targetType = 'all';
    }

    const flow = await DMFlow.findOne(query).sort({ updatedAt: -1 });
    if (!flow) {
      return res.status(200).json({
        matched: false,
        reason: 'no_exact_keyword_match',
        normalizedIncomingText,
      });
    }

    flow.stats.triggered += 1;
    await flow.save();

    return res.status(200).json({
      matched: true,
      normalizedIncomingText,
      flow,
    });
  } catch (error) {
    return handleControllerError(res, error, 'Failed to match DM flow.');
  }
};

export const incrementDMFlowStat = async (req, res) => {
  try {
    const { event, count = 1 } = req.body;
    const numericCount = Number(count);

    if (!FLOW_STAT_EVENTS.has(event)) {
      return res.status(400).json({ message: 'Invalid stat event.' });
    }

    if (!Number.isInteger(numericCount) || numericCount <= 0) {
      return res.status(400).json({ message: 'count must be a positive integer.' });
    }

    const flow = await DMFlow.findOneAndUpdate(
      { _id: req.params.id },
      { $inc: { [`stats.${event}`]: numericCount } },
      { new: true }
    );

    if (!flow) {
      return res.status(404).json({ message: 'DM flow not found.' });
    }

    return res.status(200).json(flow);
  } catch (error) {
    return handleControllerError(res, error, 'Failed to update DM flow stats.');
  }
};

export const trackDMFlowClick = async (req, res) => {
  try {
    const flowId = toTrimmedString(req.query.flowId);
    const targetUrl = toTrimmedString(req.query.url);

    if (!flowId || typeof flowId !== 'string') {
      return res.status(400).send('Missing flowId');
    }

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).send('Missing url');
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).send('Invalid url');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Unsupported url protocol');
    }

    await DMFlow.updateOne({ _id: flowId }, { $inc: { 'stats.clicked': 1 } });
    return res.redirect(302, parsed.toString());
  } catch (error) {
    console.error('Failed to track DM flow click.', error);
    return res.status(500).send('Failed to track click');
  }
};
