import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserRole } from '../../services/api';

export default function AdminsView() {
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadAdmins = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchUsers();
      if (res.success) {
        const adminUsers = (res.data || []).filter(
          u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'
        );
        setAdmins(adminUsers);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load administrator directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleDemoteAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to demote this administrator to regular USER?')) return;
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await updateUserRole(userId, 'USER');
      if (res.success) {
        setStatusMessage('Administrator successfully demoted to Creator USER.');
        await loadAdmins();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update administrator role.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Security Clearance Overview */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--role-superadmin)' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-highlight)' }}>
          🛡️ Administrative Governance & Security Clearances
        </h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          This view monitors all personnel possessing privileged access. Strictly enforced by server-side RBAC: 
          Admin moderators cannot promote users to Super Admin or modify other administrator roles. Only authenticated 
          Super Administrators retain governance authority.
        </p>
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

      {/* Admin Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {admins.map((adm) => (
          <div key={adm.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin-bg)' : 'var(--role-admin-bg)',
                  border: `1px solid ${adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin-border)' : 'var(--role-admin-border)'}`,
                  color: adm.role === 'SUPER_ADMIN' ? 'var(--role-superadmin)' : 'var(--role-admin)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 800
                }}>
                  {adm.role === 'SUPER_ADMIN' ? '👑' : '🛡️'}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-highlight)' }}>
                    {adm.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {adm.email}
                  </div>
                </div>
              </div>

              <span className={`badge ${adm.role === 'SUPER_ADMIN' ? 'badge-superadmin' : 'badge-admin'}`}>
                {adm.role}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <div><strong>Clearance Level:</strong> {adm.role === 'SUPER_ADMIN' ? 'Tier 1 (Root Authority)' : 'Tier 2 (Queue Moderator)'}</div>
              <div><strong>Access Granted:</strong> {new Date(adm.createdAt).toLocaleDateString()}</div>
              <div><strong>Status:</strong> <span style={{ color: 'var(--status-success)' }}>Active & Verified</span></div>
            </div>

            {adm.role !== 'SUPER_ADMIN' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleDemoteAdmin(adm.id)}
                style={{ fontSize: '0.82rem', padding: '0.45rem', marginTop: 'auto', color: 'var(--status-error)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              >
                Revoke Admin Privileges
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
