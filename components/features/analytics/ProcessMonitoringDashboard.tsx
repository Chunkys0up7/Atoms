/**
 * Process Monitoring Dashboard
 *
 * Real-time dashboard for monitoring workflow processes and tasks.
 * Features:
 * - Active processes list
 * - Task queue management
 * - SLA monitoring and alerts
 * - Workload distribution
 * - Performance metrics
 */

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../../constants';

interface Process {
  id: string;
  process_name: string;
  process_type: string;
  status: string;
  progress_percentage: number;
  assigned_to: string | null;
  priority: string;
  sla_status: string;
  created_at: string;
  due_date: string | null;
}

interface Task {
  id: string;
  task_name: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  sla_status: string;
  process_name: string;
  created_at: string;
}

interface ProcessStats {
  total_processes: number;
  running: number;
  completed: number;
  failed: number;
  suspended: number;
  sla_breached: number;
  avg_progress: number;
  avg_duration_mins: number;
}

interface WorkloadStats {
  user_workloads: {
    assigned_to: string;
    active_tasks: number;
    in_progress: number;
    at_risk: number;
    breached: number;
  }[];
}

export default function ProcessMonitoringDashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<ProcessStats | null>(null);
  const [workload, setWorkload] = useState<WorkloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'processes' | 'tasks' | 'workload'>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStartModal, setShowStartModal] = useState(false);
  const [newProcessDefId, setNewProcessDefId] = useState('document_approval');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [processesRes, tasksRes, statsRes, workloadRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.processes}?limit=50`),
        fetch(`${API_ENDPOINTS.tasks}?limit=50`),
        fetch(`${API_ENDPOINTS.processes}/stats/summary`),
        fetch(`${API_ENDPOINTS.tasks}/stats/workload`)
      ]);

      if (processesRes.ok) {
        const data = await processesRes.json();
        setProcesses(data.processes || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (workloadRes.ok) {
        const data = await workloadRes.json();
        setWorkload(data);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
      case 'in_progress':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      case 'failed':
        return '#ef4444'; // red
      case 'suspended':
        return '#f59e0b'; // orange
      case 'pending':
      case 'assigned':
        return '#6b7280'; // gray
      default:
        return '#9ca3af';
    }
  };

  const getSLAColor = (slaStatus: string): string => {
    switch (slaStatus) {
      case 'on_track':
        return '#10b981'; // green
      case 'at_risk':
        return '#f59e0b'; // orange
      case 'breached':
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return '#dc2626'; // dark red
      case 'high':
        return '#f59e0b'; // orange
      case 'medium':
        return '#3b82f6'; // blue
      case 'low':
        return '#6b7280'; // gray
      default:
        return '#9ca3af';
    }
  };

  const formatDuration = (mins: number | null): string => {
    if (!mins) return 'N/A';
    if (mins < 60) return `${Math.round(mins)}m`;
    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      {/* Stats Cards */}
      <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total Processes</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          {stats?.total_processes || 0}
        </div>
        <div style={{ fontSize: '12px', color: '#10b981', marginTop: '8px' }}>
          {stats?.running || 0} running
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Completion Rate</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
          {stats && stats.total_processes > 0
            ? `${Math.round((stats.completed / stats.total_processes) * 100)}%`
            : '0%'}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
          {stats?.completed || 0} completed
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Avg Duration</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6' }}>
          {formatDuration(stats?.avg_duration_mins || null)}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
          per process
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>SLA Breaches</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: stats?.sla_breached ? '#ef4444' : '#10b981' }}>
          {stats?.sla_breached || 0}
        </div>
        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
          {stats?.failed || 0} failed
        </div>
      </div>

      {/* Active Processes Chart */}
      <div style={{
        gridColumn: '1 / -1',
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
          Process Status Distribution
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Running', value: stats?.running || 0, color: '#3b82f6' },
            { label: 'Completed', value: stats?.completed || 0, color: '#10b981' },
            { label: 'Failed', value: stats?.failed || 0, color: '#ef4444' },
            { label: 'Suspended', value: stats?.suspended || 0, color: '#f59e0b' }
          ].map(item => (
            <div key={item.label} style={{
              flex: '1 1 150px',
              padding: '12px',
              backgroundColor: item.color + '10',
              border: `1px solid ${item.color}30`,
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: item.color, marginTop: '4px' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProcesses = () => (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>Filter:</span>
        {['all', 'running', 'completed', 'failed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: statusFilter === status ? '#3b82f6' : '#fff',
              color: statusFilter === status ? '#fff' : '#374151',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Process</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Progress</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>SLA</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Assigned To</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {processes
              .filter(p => statusFilter === 'all' || p.status === statusFilter)
              .map((process, idx) => (
                <tr key={process.id} style={{ borderBottom: idx < processes.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{process.process_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{process.process_type}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: getStatusColor(process.status) + '20',
                      color: getStatusColor(process.status)
                    }}>
                      {process.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ width: '100px' }}>
                      <div style={{
                        height: '8px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${process.progress_percentage}%`,
                          backgroundColor: '#3b82f6',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        {Math.round(process.progress_percentage)}%
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: getSLAColor(process.sla_status) + '20',
                      color: getSLAColor(process.sla_status)
                    }}>
                      {process.sla_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: getPriorityColor(process.priority) + '20',
                      color: getPriorityColor(process.priority)
                    }}>
                      {process.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                    {process.assigned_to || 'Unassigned'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                    {formatDate(process.created_at)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {processes.filter(p => statusFilter === 'all' || p.status === statusFilter).length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            No processes found
          </div>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Task</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Process</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Status</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>SLA</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Priority</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Assigned To</th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {tasks.slice(0, 50).map((task, idx) => (
            <tr key={task.id} style={{ borderBottom: idx < tasks.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                {task.task_name}
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                {task.process_name}
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: getStatusColor(task.status) + '20',
                  color: getStatusColor(task.status)
                }}>
                  {task.status}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: getSLAColor(task.sla_status) + '20',
                  color: getSLAColor(task.sla_status)
                }}>
                  {task.sla_status.replace('_', ' ')}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: getPriorityColor(task.priority) + '20',
                  color: getPriorityColor(task.priority)
                }}>
                  {task.priority}
                </span>
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                {task.assigned_to || 'Unassigned'}
              </td>
              <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                {formatDate(task.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
          No tasks found
        </div>
      )}
    </div>
  );

  const renderWorkload = () => (
    <div>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
        User Workload Distribution
      </h3>
      <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>User</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Active Tasks</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>In Progress</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>At Risk</th>
              <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Breached</th>
              <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Load</th>
            </tr>
          </thead>
          <tbody>
            {(workload?.user_workloads || []).map((user, idx) => (
              <tr key={user.assigned_to} style={{ borderBottom: idx < (workload?.user_workloads.length || 0) - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  {user.assigned_to}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', fontWeight: '600', color: '#3b82f6' }}>
                  {user.active_tasks}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                  {user.in_progress}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: user.at_risk > 0 ? '#f59e0b' : '#6b7280' }}>
                  {user.at_risk}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: user.breached > 0 ? '#ef4444' : '#6b7280' }}>
                  {user.breached}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ width: '200px' }}>
                    <div style={{
                      height: '24px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((user.active_tasks / 10) * 100, 100)}%`,
                        backgroundColor: user.active_tasks > 8 ? '#ef4444' : user.active_tasks > 5 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s, background-color 0.3s'
                      }} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: user.active_tasks > 3 ? '#fff' : '#374151'
                      }}>
                        {user.active_tasks > 8 ? 'Overloaded' : user.active_tasks > 5 ? 'Busy' : 'Available'}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!workload?.user_workloads || workload.user_workloads.length === 0) && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
            No workload data available
          </div>
        )}
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="content-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="loading-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
        <div style={{ marginLeft: '12px', color: '#6b7280' }}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area" style={{ padding: '40px' }}>
        <div style={{ color: '#ef4444', fontSize: '16px', fontWeight: '600' }}>Error Loading Dashboard</div>
        <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>{error}</div>
        <button onClick={loadDashboardData} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="content-area" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
            Process Monitoring
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Real-time workflow monitoring and analytics
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          title="Refresh dashboard"
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        <button
          onClick={() => setShowStartModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start Request
        </button>
      </div>

      {showStartModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', width: '400px' }}>
            <h3 style={{ marginTop: 0 }}>Start New Process</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Process Definition ID</label>
              <input
                type="text"
                value={newProcessDefId}
                onChange={(e) => setNewProcessDefId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <small style={{ color: '#666' }}>Try 'document_approval'</small>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStartModal(false)}
                style={{ padding: '8px 16px', background: 'none', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newProcessDefId) return;
                  setStarting(true);
                  try {
                    const res = await fetch(API_ENDPOINTS.processes, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        process_definition_id: newProcessDefId,
                        process_name: `${newProcessDefId} - ${new Date().toLocaleTimeString()}`,
                        process_type: 'workflow',
                        initiated_by: 'user-demo'
                      })
                    });
                    if (!res.ok) throw new Error('Failed to start process');
                    setShowStartModal(false);
                    loadDashboardData();
                  } catch (e) {
                    alert('Error starting process: ' + e);
                  } finally {
                    setStarting(false);
                  }
                }}
                disabled={starting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: starting ? 'wait' : 'pointer',
                  opacity: starting ? 0.7 : 1
                }}
              >
                {starting ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div style={{
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '24px',
        display: 'flex',
        gap: '32px'
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'processes', label: 'Processes' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'workload', label: 'Workload' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            style={{
              padding: '12px 0',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: selectedTab === tab.id ? '600' : '400',
              color: selectedTab === tab.id ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              borderBottom: selectedTab === tab.id ? '2px solid #3b82f6' : 'none',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'processes' && renderProcesses()}
      {selectedTab === 'tasks' && renderTasks()}
      {selectedTab === 'workload' && renderWorkload()}
    </div >
  );
}
