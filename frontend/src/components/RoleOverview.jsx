import React, { useState } from 'react';

const ROLES_DATA = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    badgeClass: 'badge-superadmin',
    cardClass: 'super-admin',
    icon: '👑',
    summary: 'Full platform governance, security control, and administrative privileges.',
    capabilities: [
      'Full system access across all portal resources',
      'Manage user roles and elevate moderator privileges',
      'System-wide audit trail and security telemetry',
      'Supervise all creator submissions and reviewer decisions',
      'Direct database console and schema constraint oversight'
    ]
  },
  {
    id: 'ADMIN',
    name: 'Admin Moderator',
    badgeClass: 'badge-admin',
    cardClass: 'admin',
    icon: '🛡️',
    summary: 'Operational verification review, evidence checking, and moderation queue.',
    capabilities: [
      'Review submissions: approve or reject with moderator feedback',
      'View relevant users and submission information',
      'Inspect post URLs, action types, and proof screenshots',
      'Strictly restricted: Cannot manage Super Admin privileges',
      'Real-time verification queue performance tracking'
    ]
  },
  {
    id: 'USER',
    name: 'Creator User',
    badgeClass: 'badge-user',
    cardClass: 'user',
    icon: '🚀',
    summary: 'Submits campaign activity proofs and tracks verification status.',
    capabilities: [
      'Create submissions for Instagram, LinkedIn, and Facebook activities',
      'View own submissions and moderator feedback history',
      'View own profile and real-time review notifications',
      'Real-time status tracking (Pending, Approved, Rejected)',
      'Protected from unauthorized access to staff queues'
    ]
  }
];

export default function RoleOverview({ selectedRole, onSelectRole }) {
  return (
    <section className="container" id="roles">
      <div className="section-header">
        <span className="section-tag">Role-Based Access Control</span>
        <h2 className="section-title">Built For 3 Dedicated User Personas</h2>
        <p>
          Architected with strict JWT-based authorization gates to ensure seamless separation of duties
          between platform administrators, review moderators, and end users.
        </p>
      </div>

      <div className="roles-grid">
        {ROLES_DATA.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <div
              key={role.id}
              id={`role-card-${role.id.toLowerCase()}`}
              className={`glass-panel role-card ${role.cardClass} ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectRole(role.id)}
            >
              <div className="role-header">
                <div className="role-icon-box">{role.icon}</div>
                <span className={`badge ${role.badgeClass}`}>{role.name}</span>
              </div>

              <h3 className="role-card-title">{role.name}</h3>
              <p className="role-card-desc">{role.summary}</p>

              <ul className="role-features-list">
                {role.capabilities.map((cap, idx) => (
                  <li key={idx} className="role-feature-item">
                    <span className="feature-check-icon">✓</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
