import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import RoleOverview from './components/RoleOverview';
import HealthCheckWidget from './components/HealthCheckWidget';
import TechStackBadge from './components/TechStackBadge';
import Footer from './components/Footer';
import { fetchHealth } from './services/api';
import './styles/index.css';
import './styles/app.css';

export default function App() {
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
    document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHealth = () => {
    document.getElementById('health-check')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <Header apiStatus={apiStatus} />
      
      <main className="main-content">
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
      </main>

      <Footer />
    </div>
  );
}
