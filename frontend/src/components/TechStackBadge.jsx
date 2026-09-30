import React from 'react';

const STACK_ITEMS = [
  {
    icon: '⚛️',
    name: 'React + Vite',
    role: 'Frontend Framework',
    description: 'Ultra-fast HMR and modular component architecture.'
  },
  {
    icon: '🎨',
    name: 'Pure Vanilla CSS',
    role: 'Design System',
    description: 'Custom glassmorphic tokens, zero Tailwind or Bootstrap dependencies.'
  },
  {
    icon: '⚡',
    name: 'Node.js + Express',
    role: 'Backend API',
    description: 'Clean REST endpoints with CORS and modular routing.'
  },
  {
    icon: '🐘',
    name: 'PostgreSQL',
    role: 'Relational Database',
    description: 'Structured storage for users, accounts, and submissions.'
  },
  {
    icon: '💎',
    name: 'Prisma ORM',
    role: 'Database Client',
    description: 'Declarative data modeling, migrations, and query generation.'
  },
  {
    icon: '🔒',
    name: 'JWT + bcrypt',
    role: 'Security & Auth',
    description: 'Cryptographic password hashing and role-gated bearer tokens.'
  }
];

export default function TechStackBadge() {
  return (
    <section className="container" id="tech-stack">
      <div className="section-header">
        <span className="section-tag">Foundation Stack</span>
        <h2 className="section-title">Production-Grade Architecture</h2>
        <p>
          Each layer has been structured for maintainability, independent deployment,
          and seamless expansion into upcoming verification business workflows.
        </p>
      </div>

      <div className="tech-grid">
        {STACK_ITEMS.map((item, idx) => (
          <div key={idx} className="glass-panel tech-card">
            <div className="tech-icon">{item.icon}</div>
            <div className="tech-name">{item.name}</div>
            <div className="tech-role">{item.role}</div>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
