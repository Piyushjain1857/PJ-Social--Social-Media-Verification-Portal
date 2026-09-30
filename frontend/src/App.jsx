import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleOverview from './components/RoleOverview';
import HealthCheckWidget from './components/HealthCheckWidget';
import TechStackBadge from './components/TechStackBadge';
import DevDatabaseDashboard from './components/DevDatabaseDashboard';
import Footer from './components/Footer';
import { fetchHealth } from './services/api';
import './styles/index.css';
import './styles/app.css';

export default function App() {
  const [currentView, setCurrentView] = useState('portal'); // 'portal' | 'dev-dashboard'

  const [apiStatus, setApiStatus] = useState({
    healthy: false,
    loading: true,
    latency: null,
    data: null,
    raw: null,
    error: null,
  });

  const [selectedRole, setSelectedRole] = useState('SUPER_ADMIN');

  const checkHealth = async () => {
    setApiStatus((prev) => ({ ...prev, loading: true }));
    const result = await fetchHealth();

    if (result.success) {
      setApiStatus({
        healthy: true,
        loading: false,
        latency: result.latency,
        data: result.data,
        raw: result.raw,
        error: null,
      });
    } else {
      setApiStatus({
        healthy: false,
        loading: false,
        latency: result.latency,
        data: null,
        raw: null,
        error: result.error,
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const scrollToRoles = () => {
    setCurrentView('portal');
    setTimeout(() => {
      document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const scrollToHealth = () => {
    setCurrentView('portal');
    setTimeout(() => {
      document.getElementById('health-check')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="app-container">
      <Header 
        apiStatus={apiStatus} 
        currentView={currentView}
        onToggleView={setCurrentView}
      />
      
      <main className="main-content">
        {currentView === 'dev-dashboard' ? (
          <DevDatabaseDashboard onBackToPortal={() => setCurrentView('portal')} />
        ) : (
          <>
            <Hero 
              onRoleClick={scrollToRoles} 
              onTestHealthClick={scrollToHealth} 
            />

            <RoleOverview 
              selectedRole={selectedRole} 
              onSelectRole={setSelectedRole} 
            />

            <HealthCheckWidget 
              apiStatus={apiStatus} 
              onRefresh={checkHealth} 
            />

            <TechStackBadge />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
