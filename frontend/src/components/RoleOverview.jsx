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
      'Manage platform administrators and permissions',
      'Global verification policies and scoring algorithms',
      'System-wide audit trail and analytics dashboard',
      'Direct database migration and platform health oversight',
      'Emergency broadcast and platform rate limit control'
    ]
  },
  {
    id: 'ADMIN',
    name: 'Admin',
    badgeClass: 'badge-admin',
    cardClass: 'admin',
    icon: '🛡️',
    summary: 'Operational verification review, evidence checking, and dispute handling.',
    capabilities: [
      'Inspect pending activity submissions queue',
      'Validate proof URLs, screenshots, and engagement metrics',
      'Approve, reject, or request revisions with moderator notes',
      'Escalate suspicious multi-account activities to Super Admin',
      'Real-time verification queue performance tracking'
    ]
  },
  {
    id: 'USER',
    name: 'Normal User',
    badgeClass: 'badge-user',
    cardClass: 'user',
    icon: '🚀',
    summary: 'Connects social identities, submits campaign proofs, and tracks status.',
    capabilities: [
      'Link accounts across X (Twitter), YouTube, Instagram & LinkedIn',
      'Submit activity links (posts, retweets, video reviews)',
      'Real-time status tracking (Pending, Under Review, Verified, Rejected)',
      'Earn verified badges and view activity credit history',
      'Submit appeals and provide updated proof context'
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
