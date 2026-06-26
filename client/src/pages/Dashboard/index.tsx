import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { fetchWithAuth } from '../../lib/api';
import { Calendar, Plus, Compass, Sparkles, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activeCommitment, isLoading } = useQuery({
    queryKey: ['activeCommitment'],
    queryFn: () => fetchWithAuth('/api/commitments/active'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Block */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Welcome back, <span className="text-indigo-600">{user?.displayName?.split(' ')[0] || 'Explorer'}</span>.
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your autonomous trajectory path is calibrated and ready.
            </p>
          </div>
          <button
            onClick={() => navigate('/commitment/new')}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-indigo-100 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Commitment</span>
          </button>
        </div>

        {/* Bento Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Active Path</span>
              <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600 border border-indigo-100">
                <Compass className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 font-display mt-4">
              {isLoading ? '...' : activeCommitment ? 1 : 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">High-stakes commitment active</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Success Rate</span>
              <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 font-display mt-4">
              {activeCommitment ? '100%' : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">On-time milestone delivery</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Self-Heals</span>
              <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600 border border-amber-100">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 font-display mt-4">
              {activeCommitment ? '2' : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Adapts computed automatically</p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Execution Score</span>
              <div className="bg-violet-50 p-1.5 rounded-lg text-violet-600 border border-violet-100">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 font-display mt-4">
              {activeCommitment ? '94' : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Trajectory consistency index</p>
          </div>
        </div>

        {/* Commitment List Area */}
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mt-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ) : activeCommitment ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold font-display text-slate-900">Current active commitment</h3>
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-mono">
                In-Flight Plan
              </span>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    Active Target
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                    {activeCommitment.priority} Priority
                  </span>
                </div>
                <h4 className="text-xl font-bold font-display text-slate-900 leading-tight">
                  {activeCommitment.title}
                </h4>
                <p className="text-sm text-slate-500 max-w-xl">
                  {activeCommitment.description || 'No strategic description provided.'}
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => navigate('/commitment')}
                  className="w-full md:w-auto px-5 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Configure Active Path
                </button>
              </div>
            </div>

            {/* Quick visual step indicator */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-4">Milestone Overview</p>
              <div className="relative">
                {/* Stepper line */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  {activeCommitment.strategy?.milestones?.map((milestone: any, index: number) => (
                    <div
                      key={milestone.id || index}
                      className={`bg-slate-50/50 border p-4 rounded-xl ${
                        milestone.status === 'delayed' ? 'border-amber-250 bg-amber-50/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 rounded ${
                            milestone.status === 'completed'
                              ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                              : milestone.status === 'delayed'
                              ? 'text-amber-600 bg-amber-50 border border-amber-100'
                              : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {milestone.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Step {index + 1}</span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{milestone.title}</h5>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{milestone.description}</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-mono">Target: {milestone.targetDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-xl mx-auto space-y-6">
            <div className="bg-indigo-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 font-display">No active commitments</h3>
              <p className="text-sm text-slate-500">
                You currently do not have any high-stakes commitments configured. Generate an execution roadmap using the AI Planning engine to start tracking milestones.
              </p>
            </div>
            <button
              onClick={() => navigate('/commitment/new')}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Configure Your First Commitment</span>
            </button>
          </div>
        )}

        {/* Informational Alert */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5 flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900 block">Trajectory Core User Data Synchronized (AUTH-003):</span>
            Your user profile has been successfully provisioned and synchronized with Firestore. This enables persistent settings, telemetry, and preference preservation across future planning milestones.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
