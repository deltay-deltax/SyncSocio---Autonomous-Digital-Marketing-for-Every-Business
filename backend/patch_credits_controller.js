import fs from 'fs';

let content = fs.readFileSync('controllers/creditsController.js', 'utf8');

if (!content.includes('import CreditLedger')) {
  content = content.replace("import Coupon from '../models/Coupon.js';", "import Coupon from '../models/Coupon.js';\nimport CreditLedger from '../models/CreditLedger.js';");
}

// In assignCredits
const assignRegex = /(const user = await User\.findByIdAndUpdate\(\n\s*req\.user\._id,\n\s*\{ \$inc: \{ credits: creditsToAdd \}, \$set: \{ plan \} \},\n\s*\{ new: true, select: 'credits plan' \}\n\s*\);)/;
content = content.replace(assignRegex, `$1
    await CreditLedger.create({
      user: req.user._id,
      amount: creditsToAdd,
      balanceAfter: user.credits,
      action: 'added',
      reason: \`Plan assigned (\${plan})\`
    });`);

// In deductCredits
const deductRegex = /(const updated = await User\.findByIdAndUpdate\(\n\s*req\.user\._id,\n\s*\{ \$inc: \{ credits: -cost, totalCreditsConsumed: cost \} \},\n\s*\{ new: true, select: 'credits plan totalCreditsConsumed' \}\n\s*\);)/;
content = content.replace(deductRegex, `$1
    await CreditLedger.create({
      user: req.user._id,
      amount: cost,
      balanceAfter: updated.credits,
      action: 'deducted',
      reason: reason || 'AI generation'
    });`);

// In topupCredits
const topupRegex = /(const user = await User\.findByIdAndUpdate\(\n\s*req\.user\._id,\n\s*\{ \$inc: \{ credits: creditsToAdd \} \},\n\s*\{ new: true, select: 'credits plan' \}\n\s*\);)/;
content = content.replace(topupRegex, `$1
    if (user) {
      await CreditLedger.create({
        user: req.user._id,
        amount: creditsToAdd,
        balanceAfter: user.credits,
        action: 'added',
        reason: 'Credits top-up'
      });
    }`);

// Add getLedger
if (!content.includes('export const getLedger =')) {
  content += `
// ─── GET credit ledger ────────────────────────────────────────────────
export const getLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const ledger = await CreditLedger.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await CreditLedger.countDocuments({ user: req.user._id });

    return res.json({
      ledger,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('[Credits] getLedger error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};
`;
}

fs.writeFileSync('controllers/creditsController.js', content);
console.log('Done!');
