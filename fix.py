import os
path = 'frontend/src/pages/CreatorDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

search = '''                </div>
              </div>
            </div>
          </CardContent>'''

replace = '''                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 mb-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Important Guidelines
              </h4>
              <ul className="space-y-3 text-sm text-slate-600 pl-1">
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Rolling Payouts:</strong> Payouts are processed on a rolling basis, typically within 7 days of the request.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Retention Required:</strong> Commissions are tied to customer retention. If a referred customer cancels or doesn't retain their subscription, you will not receive commissions for that user.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>No Self-Referrals:</strong> Self-referrals or using secondary accounts to earn commissions on your own purchases is strictly prohibited.</span></li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">•</span> <span><strong>Ethical Promotion:</strong> Ensure you are promoting the service ethically. Spamming links or misleading promotions may result in account suspension.</span></li>
              </ul>
            </div>
          </CardContent>'''

if search in code:
    code = code.replace(search, replace)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print('Replaced successfully')
else:
    print('Search block not found')
