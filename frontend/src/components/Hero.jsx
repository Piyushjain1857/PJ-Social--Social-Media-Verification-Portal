import React from 'react';

export default function Hero({ onTestHealthClick, onRoleClick }) {
  return (
    <section className="hero-section" id="overview">
      <div className="container">
        <div className="hero-pill-badge">
          <span>✨</span> Full-Stack Monorepo Foundation v1.0.0
        </div>

        <h1 className="hero-title">
          Social Media Activity <br />
          <span className="gradient-accent">Verification Portal</span>
        </h1>

        <p className="hero-subtitle">
          An enterprise verification engine engineered with a modern full-stack stack:
          React + Vite on the frontend, Express + Prisma + PostgreSQL on the backend, 
          featuring granular 3-tier role governance.
        </p>

        <div className="hero-cta-group">
          <button 
            type="button" 
            className="btn-primary" 
            id="explore-roles-cta"
            onClick={onRoleClick}
          >
            <span>Explore 3 Roles</span>
            <span>→</span>
          </button>
          
          <button 
            type="button" 
            className="btn-secondary" 
            id="test-health-cta"
            onClick={onTestHealthClick}
          >
            <span>Run Health Check</span>
            <span>⚡</span>
          </button>
        </div>

        <div className="hero-metrics-bar">
          <div className="metric-item">
            <span className="metric-number gradient-text">3 Roles</span>
            <span className="metric-label">Super Admin • Admin • User</span>
          </div>
          <div className="metric-item">
            <span className="metric-number gradient-text">6 Platforms</span>
            <span className="metric-label">X, YouTube, Instagram & more</span>
          </div>
          <div className="metric-item">
            <span className="metric-number gradient-text">PostgreSQL</span>
            <span className="metric-label">Prisma ORM & Migration Ready</span>
          </div>
        </div>
      </div>
    </section>
  );
}
