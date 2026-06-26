import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  HelpCircle,
  Activity,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';

interface ReflectionReport {
  id: string;
  commitmentId: string;
  userId: string;
  generatedAt: string;
  execution_summary: string;
  success_factors: string[];
  improvement_opportunities: string[];
  adaptation_effectiveness: string;
  execution_patterns: string[];
  recommendations: string[];
  overall_execution_score: number;
}

interface Commitment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  progressPercentage: number;
  completedTasksCount: number;
  totalTasksCount: number;
  overallConfidence: number;
}

export default function ReflectionPage() {
  const queryClient = useQueryClient();
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>('');
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // 1. Fetch all user commitments to let them select one
  const { data: commitmentsResponse, isLoading: isCommitmentsLoading } = useQuery<{ success: boolean; data: Commitment[] }>({
    queryKey: ['allCommitments'],
    queryFn: () => fetchWithAuth('/api/commitments'),
  });

  const commitments = commitmentsResponse?.data || [];

  // Automatically select the first commitment or active one if not selected
  React.useEffect(() => {
    if (commitments.length > 0 && !selectedCommitmentId) {
      // Prefer active or completed first
      const active = commitments.find(c => c.status === 'active') || commitments[0];
      setSelectedCommitmentId(active.id);
    }
  }, [commitments, selectedCommitmentId]);

  const selectedCommitment = commitments.find(c => c.id === selectedCommitmentId);

  // 2. Fetch the reflection report for the selected commitment
  const { data: reflectionResponse, isLoading: isReflectionLoading, error: reflectionError } = useQuery<{ success: boolean; data: ReflectionReport }>({
    queryKey: ['reflectionReport', selectedCommitmentId],
    queryFn: () => fetchWithAuth(`/api/commitments/${selectedCommitmentId}/reflection`),
    enabled: !!selectedCommitmentId,
  });

  const reflection = reflectionResponse?.data;

  // 3. Mutation to explicitly regenerate reflection
  const regenerateMutation = useMutation({
    mutationFn: () => fetchWithAuth(`/api/commitments/${selectedCommitmentId}/reflection`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflectionReport', selectedCommitmentId] });
    },
  });

  const handleRegenerate = () => {
    if (selectedCommitmentId) {
      regenerateMutation.mutate();
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const scoreDialColor = (score: number) => {
    if (score >= 85) return 'stroke-emerald-500';
    if (score >= 70) return 'stroke-indigo-500';
    if (score >= 50) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="pb-6 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Retrospective Reflection Logs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Deterministic retrospective reviews of execution history, course corrections, and adaptive habit metrics.
            </p>
          </div>
          {selectedCommitmentId && (
            <button
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending || isReflectionLoading}
              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer select-none"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              <span>{regenerateMutation.isPending ? 'Recalculating...' : 'Recalculate Metrics'}</span>
            </button>
          )}
        </div>

        {/* Commitment Selector Pane */}
        {isCommitmentsLoading ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-pulse h-20" />
        ) : commitments.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100">
              <Compass className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-display">No Commitments Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Reflection logs are generated using actual execution histories. Create and update a commitment first to see metrics.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 w-full md:w-auto">
              <label htmlFor="commitment-select" className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">
                Target Commitment
              </label>
              <select
                id="commitment-select"
                value={selectedCommitmentId}
                onChange={(e) => setSelectedCommitmentId(e.target.value)}
                className="mt-1 block w-full md:w-80 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {commitments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {selectedCommitment && (
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span>
                    Progress: <strong className="text-slate-800">{selectedCommitment.progressPercentage}%</strong>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>
                    Due: <strong className="text-slate-800">{new Date(selectedCommitment.dueDate).toLocaleDateString()}</strong>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2">
                  <Award className="h-4 w-4 text-violet-600" />
                  <span>
                    Status: <strong className="text-slate-800 capitalize">{selectedCommitment.status}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reflection Details */}
        {selectedCommitmentId && (
          isReflectionLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm animate-pulse h-80" />
            </div>
          ) : reflectionError || !reflection ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Failed to Load Reflection</h4>
                <p className="text-xs text-rose-700 mt-1">
                  We encountered an error calculating reflection logs. Click the recalculate button above to retry.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Score & Left Column Info */}
              <div className="space-y-6 lg:col-span-1">
                {/* Score Card */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
                  
                  <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mb-4 block">
                    Execution Score
                  </span>

                  {/* Circular Dial */}
                  <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        className="stroke-slate-100 fill-none"
                        strokeWidth="10"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        className={`fill-none transition-all duration-1000 ${scoreDialColor(reflection.overall_execution_score)}`}
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 64}
                        strokeDashoffset={2 * Math.PI * 64 * (1 - reflection.overall_execution_score / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-slate-900 font-display">
                        {reflection.overall_execution_score}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                        / 100 PTS
                      </span>
                    </div>
                  </div>

                  {/* Score Tagline */}
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${scoreColor(reflection.overall_execution_score)}`}>
                    {reflection.overall_execution_score >= 85 ? 'Superior Adherence' :
                     reflection.overall_execution_score >= 70 ? 'Highly Resilient' :
                     reflection.overall_execution_score >= 50 ? 'Moderate Consistency' : 'Low Velocity'}
                  </div>

                  {/* Score Explanation toggle */}
                  <button
                    onClick={() => setShowScoreInfo(!showScoreInfo)}
                    className="mt-6 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer select-none"
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>How is this calculated?</span>
                  </button>

                  {showScoreInfo && (
                    <div className="mt-4 text-left bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-600 leading-normal animate-fadeIn">
                      <p className="font-bold text-slate-800">Scoring Algorithm:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Task Completion</strong>: Deducts up to 50 points proportionally to incomplete tasks.</li>
                        <li><strong>Skipped Tasks</strong>: -8 points per skip (max -40 points).</li>
                        <li><strong>Milestone Delays</strong>: -10 points per delayed milestone (max -30 points).</li>
                        <li><strong>Planning Volatility</strong>: -5 points per applied adaptation (max -15 points).</li>
                        <li><strong>Schedule Drift</strong>: Deducts up to 20 points for drift exceeding 10%.</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Detected Patterns Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">
                    Detected Execution Patterns
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {reflection.execution_patterns.map((pattern, index) => (
                      <span
                        key={index}
                        className="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Adaptation Effectiveness Box */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 font-mono">
                      Adaptation Loop Impact
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-light">
                    {reflection.adaptation_effectiveness}
                  </p>
                </div>
              </div>

              {/* Core Retrospective & Recommendations */}
              <div className="space-y-6 lg:col-span-2">
                {/* Execution Summary Block */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase">
                    Retrospective Case Summary
                  </h3>
                  <p className="text-base text-slate-800 leading-relaxed font-medium">
                    {reflection.execution_summary}
                  </p>
                </div>

                {/* Split Success/Failure Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Success Factors */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Success Accelerators
                      </h4>
                    </div>
                    <ul className="space-y-3">
                      {reflection.success_factors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Failure Factors / Improvement Opportunities */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Slippage & Vulnerabilities
                      </h4>
                    </div>
                    <ul className="space-y-3">
                      {reflection.improvement_opportunities.map((opp, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                          <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actionable Recommendations for Next Commitment */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-white relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-400 shrink-0" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Actionable Recommendations for Future Paths
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {reflection.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-slate-800/60 border border-slate-800 rounded-2xl p-4 flex gap-3 hover:bg-slate-800 transition duration-150"
                      >
                        <div className="bg-indigo-900/40 border border-indigo-700/30 text-indigo-300 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                          {index + 1}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
