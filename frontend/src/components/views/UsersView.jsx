import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserRole } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchUsers();
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId, targetRole) => {
    setUpdatingId(userId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateUserRole(userId, targetRole);
      if (res.success) {
        setStatusMessage(`Successfully updated role to ${targetRole}.`);
        await loadUsers();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search and Filters */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', maxWidth: '380px', padding: '0.6rem 0.85rem' }}
          />
          <select
            className="input-field"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: '0.6rem 0.85rem', width: 'auto' }}
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadUsers}
          disabled={isLoading}
          style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh Directory'}
        </button>
      </div>

      {statusMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-success)', color: 'var(--status-success)', fontSize: '0.9rem' }}>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', borderLeft: '4px solid var(--status-error)', color: 'var(--status-error)', fontSize: '0.9rem' }}>
          {errorMessage}
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '0.75rem' }}>User</th>
              <th style={{ padding: '0.75rem' }}>Role</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Created</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Role Assignment (Super Admin Only)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No users found matching filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-highlight)' }}>{u.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {u.role === 'SUPER_ADMIN' && <span className="badge badge-superadmin">👑 SUPER_ADMIN</span>}
                    {u.role === 'ADMIN' && <span className="badge badge-admin">🛡️ ADMIN</span>}
                    {u.role === 'USER' && <span className="badge badge-user">🚀 USER</span>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className="badge badge-success">ACTIVE</span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <select
                      className="input-field"
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto', display: 'inline-block' }}
                    >
                      <option value="USER">USER (Creator)</option>
                      <option value="ADMIN">ADMIN (Moderator)</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Owner)</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
