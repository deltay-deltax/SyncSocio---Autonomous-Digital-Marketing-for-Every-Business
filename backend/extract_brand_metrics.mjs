/**
 * Brand Metrics Extractor
 * Usage: node extract_brand_metrics.mjs
 * Extracts all 5 metric sections for admin@syncsocio.com
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;
const TARGET_EMAIL = 'admin@syncsocio.com';

// ── Lean schemas (strict: false so we read whatever exists) ──────────────────
const loose = { strict: false };

const UserModel        = mongoose.model('User',             new mongoose.Schema({}, loose), 'users');
const BrandModel       = mongoose.model('BrandProfile',     new mongoose.Schema({}, loose), 'brandprofiles');
const PostAnalysisModel= mongoose.model('PostAnalysis',     new mongoose.Schema({}, loose), 'post_analyses');
const NexaConvoModel   = mongoose.model('NexaConversation', new mongoose.Schema({}, loose), 'nexa_conversations');
const AgentActModel    = mongoose.model('AgentActivity',    new mongoose.Schema({}, loose), 'agentactivities');
const ApiLogModel      = mongoose.model('ApiLog',           new mongoose.Schema({}, loose), 'apilogs');

async function main() {
  await mongoose.connect(MONGO_URI);
  console.error('[extractor] Connected to MongoDB');

  // ── Find user ──────────────────────────────────────────────────────────────
  const user = await UserModel.findOne({ email: TARGET_EMAIL }).lean();
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);
  console.error(`[extractor] Found user: ${user._id}  email: ${user.email}`);

  // ── Find brand (active brand first, else first brand) ─────────────────────
  let brand = null;
  if (user.activeBrandId) {
    brand = await BrandModel.findOne({ _id: user.activeBrandId, user: user._id }).lean();
  }
  if (!brand) {
    brand = await BrandModel.findOne({ user: user._id }).lean();
  }
  if (!brand) throw new Error(`No BrandProfile found for user ${user._id}`);
  console.error(`[extractor] Brand: ${brand.brandName} (${brand._id})`);

  const brandId = brand._id;
  const userId  = user._id;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — Per-post table
  // ═══════════════════════════════════════════════════════════════════════════
  console.error('[extractor] Building section 1: per-post table...');

  const cachedMedia = brand.cachedMedia || [];
  console.error(`[extractor]   cachedMedia length: ${cachedMedia.length}`);

  // Build a lookup map: instagramMediaId → PostAnalysis doc
  const postAnalysisDocs = await PostAnalysisModel.find({
    $or: [
      { userId: userId },
      { user:   userId }
    ]
  }).lean();
  console.error(`[extractor]   PostAnalysis docs found: ${postAnalysisDocs.length}`);

  const paByMediaId = {};
  for (const pa of postAnalysisDocs) {
    if (pa.instagramMediaId) {
      paByMediaId[pa.instagramMediaId] = pa;
    }
  }

  const perPostTable = cachedMedia.map(post => {
    const pa = paByMediaId[post.id] || null;

    // Extract insight data stored on the cached media item
    const insightsData = post.insightsData || [];
    const getInsight = name => {
      const m = insightsData.find(x => x.name === name);
      if (!m) return null;
      if (m.total_value != null) return m.total_value.value ?? null;
      if (Array.isArray(m.values) && m.values.length > 0) return m.values[0].value ?? null;
      return null;
    };

    const reach    = getInsight('reach') ?? getInsight('views') ?? null;
    const saved    = getInsight('saved') ?? null;
    const likes    = post.like_count    ?? null;
    const comments = post.comments_count ?? null;

    let actualEngagementRate = null;
    if (reach != null && reach > 0 && likes != null && comments != null && saved != null) {
      actualEngagementRate = (likes + comments + saved) / reach;
    }

    return {
      instagramMediaId : post.id            ?? null,
      timestamp        : post.timestamp     ?? null,
      mediaType        : post.media_type    ?? null,
      caption          : post.caption       ? post.caption.substring(0, 80) : null,
      like_count       : likes,
      comments_count   : comments,
      reach            : reach,
      saved            : saved,
      actualEngagementRate,
      // PostAnalysis fields
      isAgentAssisted  : pa ? (pa.isAgentAssisted ?? null) : null,
      hasPostAnalysis  : !!pa,
      contentType      : pa?.contentType      ?? null,
      growthFactor     : pa?.growthFactor     ?? null,
      predictedEngagement : pa?.predictedEngagement ?? null,
      verdict          : pa?.verdict          ?? null,
      postAnalysisId   : pa?._id             ?? null,
    };
  });

  // Also include PostAnalysis docs that have NO cached media match (older posts not in cache)
  const cachedMediaIds = new Set(cachedMedia.map(m => m.id).filter(Boolean));
  const unmatched = postAnalysisDocs.filter(pa => pa.instagramMediaId && !cachedMediaIds.has(pa.instagramMediaId));
  const unmatchedRows = unmatched.map(pa => ({
    instagramMediaId : pa.instagramMediaId ?? null,
    timestamp        : pa.createdAt        ?? null,
    mediaType        : null,
    caption          : null,
    like_count       : null,
    comments_count   : null,
    reach            : null,
    saved            : null,
    actualEngagementRate : null,
    isAgentAssisted  : pa.isAgentAssisted ?? null,
    hasPostAnalysis  : true,
    contentType      : pa.contentType      ?? null,
    growthFactor     : pa.growthFactor     ?? null,
    predictedEngagement : pa.predictedEngagement ?? null,
    verdict          : pa.verdict          ?? null,
    postAnalysisId   : pa._id             ?? null,
    note             : 'PostAnalysis exists but post not in current cachedMedia (older post)'
  }));

  const section1 = {
    totalCachedMediaPosts  : cachedMedia.length,
    totalPostAnalysisDocs  : postAnalysisDocs.length,
    matchedPosts           : perPostTable.filter(p => p.hasPostAnalysis).length,
    unmatchedCachedPosts   : perPostTable.filter(p => !p.hasPostAnalysis).length,
    postAnalysisNoCache    : unmatchedRows.length,
    posts                  : [...perPostTable, ...unmatchedRows],
    dataNote               : cachedMedia.length < 10
      ? `WARNING: Only ${cachedMedia.length} posts in cachedMedia — not enough for meaningful chart`
      : null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Weekly agent-vs-self reach reconstruction
  // ═══════════════════════════════════════════════════════════════════════════
  console.error('[extractor] Building section 2: weekly reach by agent vs self...');

  // We only have reach stored on cachedMedia (top 10 only).
  // Reconstruct from PostAnalysis instagramMediaId joins + cachedMedia reach.
  // For posts outside cachedMedia we have no reach — note this limitation.

  const postsWithReach = perPostTable
    .filter(p => p.timestamp && p.reach != null)
    .map(p => ({
      timestamp    : new Date(p.timestamp),
      reach        : p.reach,
      isAgent      : p.isAgentAssisted === true
    }));

  console.error(`[extractor]   Posts with reach data: ${postsWithReach.length}`);

  // Group by ISO week (Monday-based)
  function getISOWeekKey(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Monday = 1, Sunday = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  const weekMap = {};
  for (const p of postsWithReach) {
    const wk = getISOWeekKey(p.timestamp);
    if (!weekMap[wk]) weekMap[wk] = { week: wk, agentPosts: [], selfPosts: [] };
    if (p.isAgent) weekMap[wk].agentPosts.push(p.reach);
    else           weekMap[wk].selfPosts.push(p.reach);
  }

  const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const sum = arr => arr.reduce((s, v) => s + v, 0);

  const weeklyReach = Object.values(weekMap)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map(w => ({
      week          : w.week,
      agentPostCount: w.agentPosts.length,
      selfPostCount : w.selfPosts.length,
      avgAgentReach : avg(w.agentPosts),
      avgSelfReach  : avg(w.selfPosts),
      totalAgentReach: sum(w.agentPosts),
      totalSelfReach : sum(w.selfPosts),
    }));

  const section2 = {
    weeksWithData       : weeklyReach.length,
    coverageNote        : 'Reach data only available for posts in cachedMedia (up to 10 posts with insights). Older posts lack reach data.',
    agentPostsTotal     : postsWithReach.filter(p => p.isAgent).length,
    selfPostsTotal      : postsWithReach.filter(p => !p.isAgent).length,
    weeklyReach,
    dataNote            : weeklyReach.length < 4
      ? `WARNING: Only ${weeklyReach.length} weeks of data — not enough for a meaningful trend chart`
      : null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — Follower history
  // ═══════════════════════════════════════════════════════════════════════════
  console.error('[extractor] Building section 3: follower history...');

  const followerHistory = (brand.followerHistory || []).map(h => ({
    date      : h.date,
    count     : h.count,
    timestamp : h.timestamp ?? null
  }));

  const section3 = {
    totalSnapshots : followerHistory.length,
    oldestSnapshot : followerHistory.length > 0 ? followerHistory[0]  : null,
    latestSnapshot : followerHistory.length > 0 ? followerHistory[followerHistory.length - 1] : null,
    followerHistory,
    dataNote       : followerHistory.length < 5
      ? `WARNING: Only ${followerHistory.length} snapshots — not enough for meaningful chart`
      : null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Nexa funnel counts
  // ═══════════════════════════════════════════════════════════════════════════
  console.error('[extractor] Building section 4: Nexa funnel...');

  const [
    nexaByStage,
    nexaEscalated,
    nexaByOrderStatus,
    nexaTotalCount
  ] = await Promise.all([
    NexaConvoModel.aggregate([
      { $match: { $or: [{ brand_id: brandId }, { user: userId }] } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $sort:  { count: -1 } }
    ]),
    NexaConvoModel.countDocuments({
      $or: [{ brand_id: brandId }, { user: userId }],
      escalate_to_human: true
    }),
    NexaConvoModel.aggregate([
      { $match: { $or: [{ brand_id: brandId }, { user: userId }] } },
      { $group: { _id: '$order_status', count: { $sum: 1 } } },
      { $sort:  { count: -1 } }
    ]),
    NexaConvoModel.countDocuments({
      $or: [{ brand_id: brandId }, { user: userId }]
    })
  ]);

  // Payment stats
  const nexaPaymentStats = await NexaConvoModel.aggregate([
    { $match: { $or: [{ brand_id: brandId }, { user: userId }] } },
    { $group: {
      _id: '$payment.payment_status',
      count: { $sum: 1 },
      totalAmountPaise: { $sum: '$payment.amount_paise' }
    }},
    { $sort: { count: -1 } }
  ]);

  const section4 = {
    totalConversations : nexaTotalCount,
    escalatedToHuman   : nexaEscalated,
    byStage            : nexaByStage.map(s => ({ stage: s._id, count: s.count })),
    byOrderStatus      : nexaByOrderStatus.map(s => ({ orderStatus: s._id, count: s.count })),
    byPaymentStatus    : nexaPaymentStats.map(s => ({
      paymentStatus    : s._id,
      count            : s.count,
      totalAmountPaise : s.totalAmountPaise,
      totalAmountINR   : s.totalAmountPaise != null ? s.totalAmountPaise / 100 : null
    })),
    dataNote           : nexaTotalCount < 5
      ? `WARNING: Only ${nexaTotalCount} Nexa conversations — not enough for funnel analysis`
      : null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — Pipeline counters
  // ═══════════════════════════════════════════════════════════════════════════
  console.error('[extractor] Building section 5: pipeline counters...');

  const [agentByNameStatus, apiByProviderError] = await Promise.all([
    AgentActModel.aggregate([
      { $match: { $or: [{ brandId: brandId }, { user: userId }] } },
      { $group: {
        _id: { agentName: '$agentName', status: '$status' },
        count: { $sum: 1 },
        avgDurationMs: {
          $avg: {
            $convert: {
              input: {
                $replaceAll: {
                  input: { $ifNull: ['$duration', '0'] },
                  find: 's', replacement: ''
                }
              },
              to: 'double',
              onError: 0,
              onNull: 0
            }
          }
        }
      }},
      { $sort: { count: -1 } }
    ]),
    ApiLogModel.aggregate([
      { $match: { user: userId } },
      { $group: {
        _id: { provider: '$provider', isError: '$isError' },
        count: { $sum: 1 },
        totalCostCents: { $sum: '$costInCents' }
      }},
      { $sort: { count: -1 } }
    ])
  ]);

  const totalAgentEvents = agentByNameStatus.reduce((s, r) => s + r.count, 0);
  const totalApiCalls    = apiByProviderError.reduce((s, r) => s + r.count, 0);
  const totalApiErrors   = apiByProviderError.filter(r => r._id.isError).reduce((s, r) => s + r.count, 0);

  const section5 = {
    generationCount         : brand.generationCount     ?? 0,
    lastPlanGeneratedAt     : brand.lastPlanGeneratedAt ?? null,
    lastStrategicAudit      : brand.lastStrategicAudit  ?? null,
    lastMetricsUpdate       : brand.lastMetricsUpdate   ?? null,
    agentActivityTotal      : totalAgentEvents,
    agentActivityByNameStatus: agentByNameStatus.map(r => ({
      agentName   : r._id.agentName,
      status      : r._id.status,
      count       : r.count,
      avgDurationSeconds: r.avgDurationMs != null ? +r.avgDurationMs.toFixed(3) : null
    })),
    apiLogTotal             : totalApiCalls,
    apiLogErrors            : totalApiErrors,
    apiLogErrorRate         : totalApiCalls > 0 ? +(totalApiErrors / totalApiCalls * 100).toFixed(2) : null,
    apiLogByProviderError   : apiByProviderError.map(r => ({
      provider        : r._id.provider,
      isError         : r._id.isError,
      count           : r.count,
      totalCostCents  : r.totalCostCents,
      totalCostINR    : r.totalCostCents != null ? +(r.totalCostCents / 100 * 83).toFixed(2) : null
    })),
    agentLearningCount      : (brand.agentLearnings || []).length,
    agentLearnings          : (brand.agentLearnings || []).map(l => ({
      category   : l.category,
      insight    : l.insight,
      confidence : l.confidence,
      createdAt  : l.createdAt,
      isFresh    : l.isFresh
    })),
    dataNote: totalAgentEvents < 5
      ? `WARNING: Only ${totalAgentEvents} AgentActivity events — limited pipeline visibility`
      : null
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  const output = {
    _meta: {
      extractedAt     : new Date().toISOString(),
      targetEmail     : TARGET_EMAIL,
      userId          : userId.toString(),
      brandId         : brandId.toString(),
      brandName       : brand.brandName ?? null,
      instagramHandle : brand.instagramUsername ?? null,
      instagramConnected: brand.instagramIsConnected ?? false,
    },
    section1_perPostTable    : section1,
    section2_weeklyReach     : section2,
    section3_followerHistory : section3,
    section4_nexaFunnel      : section4,
    section5_pipeline        : section5
  };

  process.stdout.write(JSON.stringify(output, null, 2));
  console.error('\n[extractor] Done.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[extractor] FATAL:', err);
  process.exit(1);
});
