import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminDashboard } from './AdminDashboard';
import '../index.css';

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminDashboard />
  </React.StrictMode>
);
