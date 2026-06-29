import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Pencil, Check, X, Eye, Ban, ShieldCheck, Mail, LogIn, Trash2, Search, Filter } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [emailModalOpen, setEmailModalOpen] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  
  const [deleteModalOpen, setDeleteModalOpen] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [deleteReason, setDeleteReason] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('http://localhost:5050/api/admin/users', {
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
      await axios.put(`http://localhost:5050/api/admin/users/${userId}/credits`, 
        { credits: editForm.credits },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.put(`http://localhost:5050/api/admin/users/${userId}/plan`, 
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
      await axios.put(`http://localhost:5050/api/admin/users/${userId}/block`,
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
      const res = await axios.post(`http://localhost:5050/api/admin/users/${userId}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        // Save the impersonation token and open the user dashboard in a new tab
        const impersonationToken = res.data.token;
        const targetUrl = `http://localhost:5173/dashboard?impersonate=${impersonationToken}`;
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
      await axios.post(`http://localhost:5050/api/admin/users/${emailModalOpen.user._id}/email`, 
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
      await axios.post(`http://localhost:5050/api/admin/users/${deleteModalOpen.user._id}/delete`, 
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
    return users.filter(u => {
      const matchSearch = (u.email.toLowerCase().includes(searchQuery.toLowerCase())) || 
                          (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPlan = planFilter ? u.plan?.toLowerCase() === planFilter.toLowerCase() : true;
      let matchStatus = true;
      if (statusFilter === 'blocked') matchStatus = !!u.isBlocked;
      if (statusFilter === 'active') matchStatus = !u.isBlocked;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [users, searchQuery, planFilter, statusFilter]);

  if (loading) {
    return <div className="text-muted-foreground animate-pulse">Loading users...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">User Management</h2>
        <p className="text-muted-foreground mt-1">View and manage platform users, adjust credits/plans, and restrict access.</p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text"
            placeholder="Search by email or name..."
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none w-full md:w-40"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
          <select 
            className="bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none w-full md:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Email / Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Credits</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user._id} className={`hover:bg-muted/20 transition-colors ${user.isBlocked ? 'bg-red-500/5' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{user.email}</div>
                    <div className="text-muted-foreground text-xs">{user.name || 'No name'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {user.isBlocked && (
                        <span className="px-2.5 py-1 bg-red-500/15 text-red-400 text-xs rounded-full font-medium">Blocked</span>
                      )}
                      {user.isVerified ? (
                        <span className="px-2.5 py-1 bg-green-500/10 text-green-500 text-xs rounded-full font-medium">Verified</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full font-medium">Pending</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Edit Mode toggles for Plan and Credits */}
                  <td className="px-6 py-4">
                    {editingId === user._id ? (
                      <input 
                        type="text" 
                        value={editForm.plan}
                        onChange={(e) => setEditForm({...editForm, plan: e.target.value})}
                        className="bg-background border border-border rounded px-2 py-1 w-24 text-sm"
                        placeholder="e.g. Pro"
                      />
                    ) : (
                      <span className="text-foreground capitalize">{user.plan || 'Free'}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    {editingId === user._id ? (
                      <input 
                        type="number" 
                        value={editForm.credits}
                        onChange={(e) => setEditForm({...editForm, credits: parseInt(e.target.value) || 0})}
                        className="bg-background border border-border rounded px-2 py-1 w-20 text-sm"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{user.credits || 0}</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === user._id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleSave(user._id)}
                          className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md transition-colors"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={handleCancel}
                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-md transition-colors"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleImpersonate(user._id)}
                          className="p-1.5 text-violet-400 hover:bg-violet-400/10 rounded-md transition-colors"
                          title="Impersonate User"
                        >
                          <LogIn size={16} />
                        </button>
                        <button 
                          onClick={() => setEmailModalOpen({open: true, user})}
                          className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                          title="Send Email"
                        >
                          <Mail size={16} />
                        </button>
                        <Link 
                          to={`/users/${user._id}`}
                          className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors"
                          title="View Deep Details"
                        >
                          <Eye size={16} />
                        </Link>
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          title="Edit Plan/Credits"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleBlock(user._id, !!user.isBlocked)}
                          className={`p-1.5 rounded-md transition-colors ${user.isBlocked ? 'text-green-400 hover:bg-green-400/10' : 'text-orange-400 hover:bg-orange-400/10'}`}
                          title={user.isBlocked ? "Unblock User" : "Block User"}
                        >
                          {user.isBlocked ? <ShieldCheck size={16} /> : <Ban size={16} />}
                        </button>
                        <button 
                          onClick={() => setDeleteModalOpen({open: true, user})}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors ml-2"
                          title="GDPR Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
