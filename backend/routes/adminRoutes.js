import express from 'express';
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
  getScheduledPosts,
} from '../controllers/adminController.js';

const router = express.Router();

// Public route for admin login
router.post('/login', adminLogin);

// Protected routes (require admin token)
router.use(verifyAdmin);

// ─── Users ───────────────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.put('/users/:id/credits', updateUserCredits);
router.put('/users/:id/plan', updateUserPlan);
router.put('/users/:id/block', toggleUserBlock);
router.post('/users/:id/impersonate', impersonateUser);
router.post('/users/:id/email', sendManualEmail);
router.post('/users/:id/delete', deleteUserAccount);

// Deep User Details and Controls
router.get('/users/:id/deep', getUserDeepDetails);
router.put('/users/:id/profile', updateUserDeepProfile);
router.put('/users/:id/brand', updateUserBrandProfile);
router.put('/users/:id/flows/:flowId', updateUserFlow);
router.delete('/users/:id/flows/:flowId', deleteUserFlow);
router.put('/users/:id/assets/:assetId', updateUserAsset);
router.delete('/users/:id/assets/:assetId', deleteUserAsset);

// ─── Coupons ─────────────────────────────────────────────────────────────────
router.get('/coupons', getAllCoupons);
router.post('/coupons', createCoupon);
router.delete('/coupons/:id', deleteCoupon);
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

// ─── Meta Testers ─────────────────────────────────────────────────────────────
router.get('/meta-testers', getMetaTesterRequests);
router.put('/meta-testers/:id/approve', toggleMetaTesterApproval);

// ─── Site Settings ────────────────────────────────────────────────────────────
router.get('/settings', getSiteSettings);
router.put('/settings', updateSiteSettings);

// ─── Scheduled Posts ──────────────────────────────────────────────────────────
router.get('/scheduled-posts', getScheduledPosts);

export default router;
