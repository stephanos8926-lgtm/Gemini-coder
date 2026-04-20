import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TelemetryMetrics } from './TelemetryAggregator';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [insights, setInsights] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/telemetry')
      .then(res => res.json())
      .then(data => setMetrics(data));
      
    fetch('/api/admin/insights')
      .then(res => res.json())
      .then(data => setInsights(data.insights));
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#2d2d2d] p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-2">GenAI Usage (Tokens)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.genAiUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="tokens" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-[#2d2d2d] p-4 rounded-lg">
          <h2 className="text-lg font-bold mb-2">AI Insights & Recommendations</h2>
          <pre className="whitespace-pre-wrap text-sm">{insights}</pre>
        </div>
      </div>
    </div>
  );
};
