import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Check, X, Eye, Ban, ShieldCheck, Mail, LogIn, Trash2, Search, ChevronLeft, ChevronRight, Download, UserPlus, Users as UsersIcon } from 'lucide-react';

const getAvatarColor = (name: string, email: string) => {
  const str = name || email || 'X';
  const char = str.charAt(0).toUpperCase();
  const colors = [
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-green-100 text-green-600',
    'bg-orange-100 text-orange-600'
  ];
  const idx = char.charCodeAt(0) % colors.length;
  return colors[idx];
};

const getInitials = (name: string, email: string) => {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/);
    if (parts.length > 1 && parts[1].length > 0) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  }
  return (email || 'X').substring(0, 2).toUpperCase();
};

interface User {
  _id: string;
  email: string;
  name?: string;
  credits: number;
  plan: string;
  isVerified: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ credits: 0, plan: '' });

  // Filters & Search
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState(location.state?.planFilter || '');
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || '');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [emailModalOpen, setEmailModalOpen] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  
  const [deleteModalOpen, setDeleteModalOpen] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [deleteReason, setDeleteReason] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user._id);
    setEditForm({ credits: user.credits || 0, plan: user.plan || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${userId}/credits`, 
        { credits: editForm.credits },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${userId}/plan`, 
        { plan: editForm.plan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Failed to update user');
    }
  };

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    const action = currentBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${userId}/block`,
        { isBlocked: !currentBlocked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (err) {
      alert(`Failed to ${action} user`);
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${userId}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        // Save the impersonation token and open the user dashboard in a new tab
        const impersonationToken = res.data.token;
        const targetUrl = `${import.meta.env.VITE_APP_URL || 'https://syncsocio.com'}/dashboard?impersonate=${impersonationToken}`;
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      alert('Failed to generate impersonation token.');
    }
  };

  const handleSendEmail = async () => {
    if (!emailModalOpen.user) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${emailModalOpen.user._id}/email`, 
        emailForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Email queued to send successfully');
      setEmailModalOpen({open: false, user: null});
      setEmailForm({subject: '', message: ''});
    } catch (err) {
      alert('Failed to send email. Ensure SMTP is configured correctly.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModalOpen.user) return;
    if (!deleteReason.trim()) {
      alert('You must provide a reason for deleting this user to comply with GDPR logs.');
      return;
    }

    const confirm2 = window.confirm('FINAL WARNING: This is a HARD DELETE. All data associated with this user will be wiped permanently. Proceed?');
    if (!confirm2) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin/users/${deleteModalOpen.user._id}/delete`, 
        { reason: deleteReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User deleted permanently.');
      setDeleteModalOpen({open: false, user: null});
      setDeleteReason('');
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchSearch = (u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPlan = planFilter ? (u.plan || 'Trial').toLowerCase() === planFilter.toLowerCase() : true;
      let matchStatus = true;
      if (statusFilter === 'blocked') matchStatus = !!u.isBlocked;
      if (statusFilter === 'active') matchStatus = !u.isBlocked;
      let matchVerified = true;
      if (verifiedFilter === 'verified') matchVerified = !!u.isVerified;
      if (verifiedFilter === 'unverified') matchVerified = !u.isVerified;
      return matchSearch && matchPlan && matchStatus && matchVerified;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'createdAt_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'createdAt_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'credits_desc') return (b.credits || 0) - (a.credits || 0);
      if (sortBy === 'credits_asc') return (a.credits || 0) - (b.credits || 0);
      return 0;
    });

    return result;
  }, [users, searchQuery, planFilter, statusFilter, verifiedFilter, sortBy]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useMemo(() => setPage(1), [searchQuery, planFilter, statusFilter, verifiedFilter, sortBy]);

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-1">View and manage platform users, adjust credits/plans, and restrict access.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-lg border border-indigo-100">
            <UsersIcon size={16} />
            {filteredUsers.length} users
          </span>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            <UserPlus size={16} /> Add User
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full lg:flex-1 lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search by email or name..."
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto ml-auto pr-2">
          <select 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-medium focus:outline-none appearance-none pr-8 cursor-pointer hover:border-slate-300 transition-colors"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">All Plans</option>
            <option value="trial">Trial</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
          <select 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-medium focus:outline-none appearance-none pr-8 cursor-pointer hover:border-slate-300 transition-colors"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <select 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-medium focus:outline-none appearance-none pr-8 cursor-pointer hover:border-slate-300 transition-colors"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
          >
            <option value="">All Verified</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
          <select 
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 font-medium focus:outline-none appearance-none pr-8 cursor-pointer hover:border-slate-300 transition-colors"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="credits_desc">Most Credits</option>
            <option value="credits_asc">Least Credits</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 bg-white tracking-wider">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Email / Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Plan</th>
                <th className="px-6 py-4 whitespace-nowrap">Credits</th>
                <th className="px-6 py-4 whitespace-nowrap">Joined</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.map((user) => (
                <tr key={user._id} className={`hover:bg-slate-50/50 transition-colors bg-white ${user.isBlocked ? 'opacity-70' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(user.name || '', user.email)}`}>
                        {getInitials(user.name || '', user.email)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{user.email}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{user.name || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.isBlocked ? 'bg-red-500' : user.isVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`text-xs font-semibold ${user.isBlocked ? 'text-red-500' : user.isVerified ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {user.isBlocked ? 'Blocked' : user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </td>
                  
                  {/* Edit Mode toggles for Plan and Credits */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === user._id ? (
                      <input 
                        type="text" 
                        value={editForm.plan}
                        onChange={(e) => setEditForm({...editForm, plan: e.target.value})}
                        className="bg-white border border-slate-200 rounded px-2 py-1 w-24 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-400"
                        placeholder="e.g. Pro"
                      />
                    ) : (
                      <span className="font-semibold text-slate-700 capitalize">{user.plan || 'Trial'}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === user._id ? (
                      <input 
                        type="number" 
                        value={editForm.credits}
                        onChange={(e) => setEditForm({...editForm, credits: parseInt(e.target.value) || 0})}
                        className="bg-white border border-slate-200 rounded px-2 py-1 w-20 text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-400"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{user.credits || 0}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        {new Date(user.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === user._id ? (
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleSave(user._id)}
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={handleCancel}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-4 text-slate-400">
                        <button 
                          onClick={() => handleImpersonate(user._id)}
                          className="text-indigo-500 hover:text-indigo-600 transition-colors"
                        >
                          <LogIn size={15} />
                        </button>
                        <button 
                          onClick={() => setEmailModalOpen({open: true, user})}
                          className="text-amber-500 hover:text-amber-600 transition-colors"
                        >
                          <Mail size={15} />
                        </button>
                        <Link 
                          to={`/users/${user._id}`}
                          className="text-emerald-500 hover:text-emerald-600 transition-colors"
                        >
                          <Eye size={15} />
                        </Link>
                        <button 
                          onClick={() => handleEdit(user)}
                          className="text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => handleToggleBlock(user._id, !!user.isBlocked)}
                          className={`transition-colors ${user.isBlocked ? 'text-emerald-500 hover:text-emerald-600' : 'text-orange-500 hover:text-orange-600'}`}
                        >
                          {user.isBlocked ? <ShieldCheck size={15} /> : <Ban size={15} />}
                        </button>
                        <button 
                          onClick={() => setDeleteModalOpen({open: true, user})}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {pagedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
            <p className="text-xs font-semibold text-slate-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Rows per page</span>
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none hover:border-slate-300 transition-colors"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (totalPages > 5) {
                    if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                      if (p === 2 || p === totalPages - 1) return <span key={p} className="text-slate-400 text-xs px-1">...</span>;
                      return null;
                    }
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {emailModalOpen.open && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 relative">
            <button onClick={() => setEmailModalOpen({open: false, user: null})} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-foreground mb-4">Send Email</h3>
            <p className="text-sm text-muted-foreground mb-4">To: {emailModalOpen.user?.email}</p>
            <input 
              type="text" placeholder="Subject" 
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm mb-4"
              value={emailForm.subject} onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
            />
            <textarea 
              placeholder="Message..." rows={5}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm mb-4 resize-none"
              value={emailForm.message} onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEmailModalOpen({open: false, user: null})} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg">Cancel</button>
              <button onClick={handleSendEmail} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send Mail</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-red-500/30 p-6 relative">
            <button onClick={() => setDeleteModalOpen({open: false, user: null})} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <Trash2 size={24} />
              <h3 className="text-xl font-bold">Hard Delete User</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              You are about to permanently delete <strong className="text-foreground">{deleteModalOpen.user?.email}</strong>. This will wipe all Brands, DMFlows, Assets, and Transactions to comply with GDPR.
            </p>
            <label className="block text-sm font-medium text-foreground mb-2">Mandatory Deletion Reason</label>
            <input 
              type="text" placeholder="e.g. GDPR Request, Terms Violation..." 
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm mb-6 focus:border-red-500 focus:outline-none"
              value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModalOpen({open: false, user: null})} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Confirm Deletion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
