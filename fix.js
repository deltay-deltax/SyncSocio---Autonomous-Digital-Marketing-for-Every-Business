const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/CreatorDashboard.tsx', 'utf8');
const search = '              </div>\r\n            </div>\r\n          </CardContent>\r\n        </Card>';
const replace =               </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Important Guidelines
              </h4>
              <ul className="space-y-3 text-sm text-slate-600 pl-1">
                <li className="flex gap-2"><span className="text-amber-500 font-bold">-</span> <span><strong>Rolling Payouts:</strong> Payouts are processed on a rolling basis, typically within 7 days of the request.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">-</span> <span><strong>Retention Required:</strong> Commissions are tied to customer retention. If a referred customer cancels or doesn't retain their subscription, you will not receive commissions for that user.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">-</span> <span><strong>No Self-Referrals:</strong> Self-referrals or using secondary accounts to earn commissions on your own purchases is strictly prohibited.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">-</span> <span><strong>Ethical Promotion:</strong> Ensure you are promoting the service ethically. Spamming links or misleading promotions may result in account suspension.</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>;
const searchUnix = search.replace(/\r\n/g, '\n');
if (code.includes(search)) {
  fs.writeFileSync('frontend/src/pages/CreatorDashboard.tsx', code.replace(search, replace));
  console.log('Successfully replaced CRLF');
} else if (code.includes(searchUnix)) {
  fs.writeFileSync('frontend/src/pages/CreatorDashboard.tsx', code.replace(searchUnix, replace));
  console.log('Successfully replaced LF');
} else {
  console.log('Search block not found');
}
