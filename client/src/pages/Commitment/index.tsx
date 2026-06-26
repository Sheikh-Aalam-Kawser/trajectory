import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { Calendar, Compass, Layers, CheckCircle, Sparkles, Plus } from 'lucide-react';

export default function CommitmentPage() {
  const navigate = useNavigate();

  const { data: activeCommitment, isLoading } = useQuery({
    queryKey: ['activeCommitment'],
    queryFn: () => fetchWithAuth('/api/commitments/active'),
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="pb-6 border-b border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Active Commitment Details
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time telemetry and schedule optimization metrics for your active milestone paths.
            </p>
          </div>
          {!isLoading && !activeCommitment && (
            <button
              onClick={() => navigate('/commitment/new')}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Commitment</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-3/4 mt-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
        ) : activeCommitment ? (
          <>
            {/* Commitment Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm md:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">ACTIVE PLAN DESCRIPTION</h3>
                <h4 className="text-lg font-bold font-display text-slate-900 mt-2">{activeCommitment.title}</h4>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  {activeCommitment.description || 'No strategic description provided.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                    Target Deadline: {activeCommitment.dueDate}
                  </span>
                  <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold capitalize">
                    Priority: {activeCommitment.priority}
                  </span>
                  <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                    Created: {new Date(activeCommitment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">PLAN METRICS</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Estimated Work:</span>
                    <span className="font-bold font-mono">
                      {activeCommitment.strategy?.milestones?.reduce(
                        (acc: number, cur: any) => acc + (cur.estimatedHours || 0),
                        0
                      ) || 0}{' '}
                      hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Delivered Effort:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {activeCommitment.strategy?.milestones
                        ?.filter((m: any) => m.status === 'completed')
                        ?.reduce((acc: number, cur: any) => acc + (cur.estimatedHours || 0), 0) || 0}{' '}
                      hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Completed Milestones:</span>
                    <span className="font-bold font-mono text-indigo-600">
                      {activeCommitment.strategy?.milestones?.filter((m: any) => m.status === 'completed')?.length || 0}{' '}
                      / {activeCommitment.strategy?.milestones?.length || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ((activeCommitment.strategy?.milestones?.filter((m: any) => m.status === 'completed')
                            ?.length || 0) /
                            (activeCommitment.strategy?.milestones?.length || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Milestone Steps with detail panels */}
            <div className="space-y-4">
              <h3 className="text-base font-bold font-display text-slate-900">Milestone Sequence</h3>
              
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
                {activeCommitment.strategy?.milestones?.map((milestone: any, index: number) => {
                  const isCompleted = milestone.status === 'completed';
                  const isDelayed = milestone.status === 'delayed';
                  
                  return (
                    <div
                      key={milestone.id || index}
                      className={`p-6 flex flex-col sm:flex-row items-start justify-between gap-4 ${
                        isDelayed ? 'bg-amber-50/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1 border ${
                            isCompleted
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : isDelayed
                              ? 'bg-amber-50 border-amber-100 text-amber-600'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Calendar className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-900 font-display">{milestone.title}</h4>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                isCompleted
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-150'
                                  : isDelayed
                                  ? 'text-amber-700 bg-amber-50 border border-amber-150'
                                  : 'text-slate-500 bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {milestone.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{milestone.description}</p>
                          <p className="text-xs text-slate-400 mt-2 font-mono">
                            Allocated: {milestone.estimatedHours}h • Target Date: {milestone.targetDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-xl mx-auto space-y-6">
            <div className="bg-indigo-50 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100">
              <Calendar className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 font-display">No active commitments found</h3>
              <p className="text-sm text-slate-500">
                Create a high-stakes commitment to generate a structured execution sequence and track delivery metrics.
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
      </div>
    </DashboardLayout>
  );
}
