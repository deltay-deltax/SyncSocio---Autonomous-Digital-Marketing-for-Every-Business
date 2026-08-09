import express from 'express';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  updateUserCreditsSchema,
  updateUserPlanSchema,
  updateUserDeepProfileSchema,
  toggleBlockUserSchema,
  sendManualEmailSchema,
  deleteUserAccountSchema,
  createCouponSchema,
} from '../validators/adminSchemas.js';
import {
  adminLogin,
  verifyAdmin,
  getAllUsers,
  getMetrics,
  updateUserCredits,
  updateUserPlan,
  getUserDeepDetails,
  updateUserDeepProfile,
  updateUserBrandProfile,
  updateUserFlow,
  deleteUserFlow,
  updateUserAsset,
  deleteUserAsset,
  toggleUserBlock,
  getAllCoupons,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  impersonateUser,
  sendManualEmail,
  deleteUserAccount,
  getAllBrands,
  getRevenueAnalytics,
  getTransactions,
  refundTransaction,
  getSystemHealth,
  getWaitlist,
  deleteWaitlistEntry,
  getMetaTesterRequests,
  toggleMetaTesterApproval,
  getDiscountDetails,
  getApiCostDetails,
  getRevenueDetails,
  getCreditDetails,
  getCreativesDetails,
  getActiveUsersDetails,
  getSiteSettings,
  updateSiteSettings,
  getLeads,
  addLead,
  updateLead,
  getScheduledPosts,
  getGenerations,
  getWhatsAppTemplates,
  updateWhatsAppTemplateStatus,
  getNexaConversations,
  getNexaConversationDetail,
  getNexaStats,
  getAllDMFlows,
  getAllProducts,
  getCampaignStats,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/adminController.js';

const router = express.Router();

// Public route for admin login
router.post('/login', adminLogin);

// Protected routes (require admin token)
router.use(verifyAdmin);

// ─── Users ───────────────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.put('/users/:id/credits', validate({ params: idParamSchema, body: updateUserCreditsSchema }), updateUserCredits);
router.put('/users/:id/plan', validate({ params: idParamSchema, body: updateUserPlanSchema }), updateUserPlan);
router.put('/users/:id/block', validate({ params: idParamSchema, body: toggleBlockUserSchema }), toggleUserBlock);
router.post('/users/:id/impersonate', validate({ params: idParamSchema }), impersonateUser);
router.post('/users/:id/email', validate({ params: idParamSchema, body: sendManualEmailSchema }), sendManualEmail);
router.post('/users/:id/delete', validate({ params: idParamSchema, body: deleteUserAccountSchema }), deleteUserAccount);

// Deep User Details and Controls
router.get('/users/:id/deep', validate({ params: idParamSchema }), getUserDeepDetails);
router.put('/users/:id/profile', validate({ params: idParamSchema, body: updateUserDeepProfileSchema }), updateUserDeepProfile);
router.put('/users/:id/brand', updateUserBrandProfile);
router.put('/users/:id/flows/:flowId', updateUserFlow);
router.delete('/users/:id/flows/:flowId', deleteUserFlow);
router.put('/users/:id/assets/:assetId', updateUserAsset);
router.delete('/users/:id/assets/:assetId', deleteUserAsset);

// ─── Coupons ─────────────────────────────────────────────────────────────────
router.get('/coupons', getAllCoupons);
router.post('/coupons', validate({ body: createCouponSchema }), createCoupon);
router.delete('/coupons/:id', validate({ params: idParamSchema }), deleteCoupon);
router.patch('/coupons/:id/toggle', toggleCouponStatus);

// ─── Brands ──────────────────────────────────────────────────────────────────
router.get('/brands', getAllBrands);

// ─── Dashboard Metrics ───────────────────────────────────────────────────────
router.get('/metrics', getMetrics);

// ─── Analytics ───────────────────────────────────────────────────────────────
router.get('/analytics/revenue', getRevenueAnalytics);

// ─── KPI Detail Drill-Down Endpoints ─────────────────────────────────────────
router.get('/details/discounts', getDiscountDetails);
router.get('/details/api-cost', getApiCostDetails);
router.get('/details/revenue', getRevenueDetails);
router.get('/details/credits', getCreditDetails);
router.get('/details/creatives', getCreativesDetails);
router.get('/details/active-users', getActiveUsersDetails);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', getTransactions);
router.patch('/transactions/:id/refund', refundTransaction);

// ─── System Health ───────────────────────────────────────────────────────────
router.get('/system/health', getSystemHealth);

// ─── Waitlist ─────────────────────────────────────────────────────────────────
router.get('/waitlist', getWaitlist);
router.delete('/waitlist/:id', deleteWaitlistEntry);

// ─── Leads ────────────────────────────────────────────────────────────────────
router.get('/leads', getLeads);
router.post('/leads', addLead);
router.put('/leads/:id', updateLead);

// ─── Meta Testers ─────────────────────────────────────────────────────────────
router.get('/meta-testers', getMetaTesterRequests);
router.put('/meta-testers/:id/approve', toggleMetaTesterApproval);

// ─── Site Settings ────────────────────────────────────────────────────────────
router.get('/settings', getSiteSettings);
router.put('/settings', updateSiteSettings);

// ─── Scheduled Posts ──────────────────────────────────────────────────────────
router.get('/scheduled-posts', getScheduledPosts);

// ─── Generations ──────────────────────────────────────────────────────────────
router.get('/generations', getGenerations);

// ─── WhatsApp Templates ──────────────────────
router.get('/whatsapp-templates', getWhatsAppTemplates);
router.put('/whatsapp-templates/:id/status', updateWhatsAppTemplateStatus);

// ─── Nexa Conversations ─────────────────────
router.get('/nexa/conversations', getNexaConversations);
router.get('/nexa/conversations/:id', getNexaConversationDetail);
router.get('/nexa/stats', getNexaStats);

// ─── DM Automations ─────────────────────────
router.get('/dm-flows', getAllDMFlows);

// ─── Products ────────────────────────────────
router.get('/products', getAllProducts);

// ─── Campaigns ───────────────────────────────
router.get('/campaigns/stats', getCampaignStats);

// ─── Admin Notifications ──────────────────────────────────────────────────────
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

export default router;
