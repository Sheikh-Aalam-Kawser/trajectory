import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Play, 
  SkipForward, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  ArrowLeft,
  MapPin,
  Flame,
  Milestone as MilestoneIcon,
  Check,
  X,
  ArrowRight,
  History,
  RefreshCw,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed' | 'skipped' | 'in_progress';
  estimatedHours: number;
  isCriticalPath: boolean;
  date: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  estimatedHours: number;
  status: 'pending' | 'completed' | 'delayed';
  createdAt: string;
  tasks?: Task[];
}

interface Commitment {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  progressPercentage: number;
  completedTasksCount: number;
  totalTasksCount: number;
  overallConfidence: number;
  strategy: {
    title: string;
    description: string;
    milestones: Milestone[];
  };
}

interface ConfidenceChange {
  before: number;
  after: number;
  explanation: string;
}

interface AdaptationPlan {
  id: string;
  commitmentId: string;
  userId: string;
  strategyId: string;
  parentStrategyId: string;
  adaptation_summary: string;
  risk_assessment: string;
  recovery_strategy: string;
  confidence_change: ConfidenceChange;
  revised_milestones: Milestone[];
  createdAt: string;
}

interface AdaptationAgentOutput {
  adaptation_summary: string;
  risk_assessment: string;
  recovery_strategy: string;
  confidence_change: ConfidenceChange;
  revised_milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetDate: string;
    estimatedHours: number;
    tasks: Array<{
      id: string;
      title: string;
      date: string;
      estimatedHours: number;
      isCriticalPath: boolean;
    }>;
  }>;
}

interface DriftAssessment {
  expected_progress_percentage: number;
  actual_progress_percentage: number;
  drift_percentage: number;
  severity: 'on_track' | 'minor' | 'moderate' | 'critical';
  adaptation_recommended: boolean;
  explanation: string;
}

export default function CommitmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: activeCommitment, isLoading } = useQuery<Commitment>({
    queryKey: ['activeCommitment'],
    queryFn: () => fetchWithAuth('/api/commitments/active'),
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Extract all unique task dates and set default selected date
  const uniqueDates = React.useMemo(() => {
    if (!activeCommitment?.strategy?.milestones) return [];
    const dates = activeCommitment.strategy.milestones
      .flatMap((m) => m.tasks || [])
      .map((t) => t.date);
    return Array.from(new Set(dates)).sort();
  }, [activeCommitment]);

  // Handle setting the default date when data loads
  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      const hasToday = uniqueDates.includes(todayStr);
      
      if (hasToday) {
        setSelectedDate(todayStr);
      } else {
        // Find first day with incomplete tasks, otherwise first day
        const firstIncompleteDate = uniqueDates.find((d) => {
          const tasksForDay = activeCommitment?.strategy?.milestones
            .flatMap((m) => m.tasks || [])
            .filter((t) => t.date === d);
          return tasksForDay?.some((t) => t.status !== 'completed' && t.status !== 'skipped');
        });
        setSelectedDate(firstIncompleteDate || uniqueDates[0]);
      }
    }
  }, [uniqueDates, selectedDate, activeCommitment]);

  // Mutation to update task status
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      if (!activeCommitment) throw new Error('No active commitment loaded');
      return fetchWithAuth(`/api/commitments/${activeCommitment.id}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCommitment'] });
      queryClient.invalidateQueries({ queryKey: ['driftAssessment', activeCommitment?.id] });
    },
  });

  const { data: driftAssessment } = useQuery<DriftAssessment>({
    queryKey: ['driftAssessment', activeCommitment?.id],
    queryFn: () => {
      if (!activeCommitment) throw new Error('No active commitment');
      return fetchWithAuth(`/api/commitments/${activeCommitment.id}/drift`);
    },
    enabled: !!activeCommitment?.id,
  });

  // Historical Adaptation state & operations
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [userReason, setUserReason] = useState('');
  const [adaptationProposal, setAdaptationProposal] = useState<AdaptationAgentOutput | null>(null);

  const { data: adaptations = [] } = useQuery<AdaptationPlan[]>({
    queryKey: ['adaptations', activeCommitment?.id],
    queryFn: () => {
      if (!activeCommitment) return [];
      return fetchWithAuth(`/api/commitments/${activeCommitment.id}/adaptations`);
    },
    enabled: !!activeCommitment?.id,
  });

  const proposeMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!activeCommitment) throw new Error('No active commitment');
      return fetchWithAuth(`/api/commitments/${activeCommitment.id}/adaptations/propose`, {
        method: 'POST',
        body: JSON.stringify({ userReason: reason }),
      });
    },
    onSuccess: (data: any) => {
      setAdaptationProposal(data);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (proposal: AdaptationAgentOutput) => {
      if (!activeCommitment) throw new Error('No active commitment');
      return fetchWithAuth(`/api/commitments/${activeCommitment.id}/adaptations/apply`, {
        method: 'POST',
        body: JSON.stringify(proposal),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCommitment'] });
      queryClient.invalidateQueries({ queryKey: ['adaptations', activeCommitment?.id] });
      queryClient.invalidateQueries({ queryKey: ['driftAssessment', activeCommitment?.id] });
      setIsAdaptModalOpen(false);
      setAdaptationProposal(null);
      setUserReason('');
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
          <div className="h-12 bg-slate-200 rounded-2xl w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-slate-200 rounded-2xl" />
              <div className="h-96 bg-slate-200 rounded-2xl" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-slate-200 rounded-2xl" />
              <div className="h-80 bg-slate-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeCommitment) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto text-center space-y-6 py-12">
          <div className="bg-indigo-50 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-indigo-600 border border-indigo-100">
            <Calendar className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 font-display">No In-Flight Trajectory</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              You do not have any high-stakes commitments active in your current workspace path. Plan a strategic roadmap using Trajectory's Gemini Planning Engine.
            </p>
          </div>
          <button
            onClick={() => navigate('/commitment/new')}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Strategic Plan</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate stats
  const remainingDays = (() => {
    const target = new Date(activeCommitment.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  })();

  const allTasks = activeCommitment.strategy.milestones.flatMap((m) => m.tasks || []);
  const selectedDateTasks = allTasks.filter((t) => t.date === selectedDate);
  
  const dailyWorkload = selectedDateTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
  const dailyCompleted = selectedDateTasks.filter((t) => t.status === 'completed').length;
  const dailyTotal = selectedDateTasks.length;

  // Determine focus objective based on the selected day
  const focusObjective = (() => {
    if (!selectedDateTasks || selectedDateTasks.length === 0) return 'Review day constraints';
    
    // Find matching milestone for current selected tasks
    const matchedMilestone = activeCommitment.strategy.milestones.find((m) => 
      m.tasks?.some((t) => t.date === selectedDate)
    );
    
    if (matchedMilestone) {
      if (matchedMilestone.title.includes('Foundation') || matchedMilestone.title.includes('Phase 1')) {
        return 'Consolidate baseline requirements and establish architecture';
      }
      if (matchedMilestone.title.includes('Engineering') || matchedMilestone.title.includes('Phase 2')) {
        return 'Accelerate full-stack delivery and build core endpoints';
      }
      return 'Auditing system safety, polishing user transitions, and launch';
    }
    return 'Calibrating trajectory steps';
  })();

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    // Adjust for timezone offset to show correct local date
    const utcDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return utcDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDayDetails = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    
    const dayTasks = allTasks.filter((t) => t.date === dateStr);
    const doneCount = dayTasks.filter((t) => t.status === 'completed').length;
    const totalCount = dayTasks.length;
    const isDone = totalCount > 0 && doneCount === totalCount;
    const isWorking = totalCount > 0 && doneCount > 0 && doneCount < totalCount;

    return { dayName, dayNum, doneCount, totalCount, isDone, isWorking };
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navigation back and quick breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </button>
          <div className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider">
            Execution Workspace // In-Flight Plan
          </div>
        </div>

        {/* Commitment Hero Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-950/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-md font-mono">
                  ACTIVE PATH
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/25 px-2.5 py-1 rounded-md font-mono capitalize">
                  {activeCommitment.priority} Priority
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white leading-tight">
                {activeCommitment.title}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {activeCommitment.description || 'No strategic description provided for this path.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-col gap-4 lg:gap-3 shrink-0">
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-2.5 text-center lg:text-left min-w-[140px]">
                <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Time Remaining</span>
                <span className="text-xl font-bold font-display text-white mt-1 flex items-center justify-center lg:justify-start gap-1">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  {remainingDays} days
                </span>
              </div>
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-2.5 text-center lg:text-left min-w-[140px]">
                <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Overall Progress</span>
                <span className="text-xl font-bold font-display text-indigo-300 mt-1">
                  {activeCommitment.progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Layout Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main workspace section */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Daily Execution Section */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold font-display text-slate-900">Daily Objectives</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Actionable milestones scheduled for <span className="font-semibold text-indigo-600">{selectedDate ? formatFullDate(selectedDate) : ''}</span>
                  </p>
                </div>
                {selectedDateTasks.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-mono uppercase bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded">
                      Workload: {dailyWorkload}h
                    </span>
                    <span className="text-[10px] font-bold font-mono uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded">
                      Completed: {dailyCompleted}/{dailyTotal}
                    </span>
                  </div>
                )}
              </div>

              {/* Day Objective Display */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-start gap-3">
                <Flame className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed font-medium">
                  <span className="text-slate-900 font-bold">Focus Objective: </span>
                  {focusObjective}
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-6">
                {selectedDateTasks.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium text-slate-500">No scheduled tasks for this day.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDateTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-150 ${
                          task.status === 'completed'
                            ? 'bg-slate-50/70 border-slate-200/80'
                            : task.status === 'in_progress'
                            ? 'bg-indigo-50/10 border-indigo-200/60 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Checkbox button */}
                          <button
                            onClick={() => 
                              updateTaskMutation.mutate({ 
                                taskId: task.id, 
                                status: task.status === 'completed' ? 'pending' : 'completed' 
                              })
                            }
                            className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border cursor-pointer transition-colors ${
                              task.status === 'completed'
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-300 hover:border-indigo-400'
                            }`}
                          >
                            {task.status === 'completed' && <Check className="h-3.5 w-3.5" />}
                          </button>

                          <div className="space-y-1">
                            <p className={`text-sm font-semibold leading-relaxed ${
                              task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-semibold text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedHours}h
                              </span>
                              {task.isCriticalPath && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded">
                                  Critical Path
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                task.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : task.status === 'in_progress'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                  : task.status === 'skipped'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-slate-50 text-slate-400 border border-slate-150'
                              }`}>
                                {task.status === 'in_progress' ? 'in progress' : task.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Status Controls */}
                        <div className="flex items-center gap-1.5 sm:self-center self-end border-t sm:border-t-0 pt-3 sm:pt-0">
                          <button
                            disabled={updateTaskMutation.isPending}
                            onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              task.status === 'in_progress'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Set in progress"
                          >
                            <Play className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">Start</span>
                          </button>
                          <button
                            disabled={updateTaskMutation.isPending}
                            onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'skipped' })}
                            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              task.status === 'skipped'
                                ? 'bg-slate-600 text-white border-slate-600'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Skip task"
                          >
                            <SkipForward className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">Skip</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Complete Milestone Timeline Flow */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <MilestoneIcon className="h-5 w-5 text-indigo-500" />
                <span>Trajectory Milestones</span>
              </h3>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-8">
                  {activeCommitment.strategy.milestones.map((milestone, idx) => {
                    const isCompleted = milestone.status === 'completed';
                    const isDelayed = milestone.status === 'delayed';

                    return (
                      <div key={milestone.id} className="relative">
                        {/* Milestone bullet icon */}
                        <span className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          isCompleted
                            ? 'border-emerald-500'
                            : isDelayed
                            ? 'border-amber-500'
                            : 'border-slate-300'
                        }`}>
                          {isCompleted && <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />}
                          {isDelayed && <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />}
                        </span>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-base font-bold text-slate-900 font-display">
                              {milestone.title}
                            </h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isCompleted
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-150'
                                : isDelayed
                                ? 'text-amber-700 bg-amber-50 border border-amber-150'
                                : 'text-slate-500 bg-slate-100 border border-slate-200'
                            }`}>
                              {milestone.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed font-light">
                            {milestone.description}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 font-semibold pt-1">
                            <span>Deadline: {milestone.targetDate}</span>
                            <span>•</span>
                            <span>Estimate: {milestone.estimatedHours} hrs</span>
                            {idx > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-500">Depends on Phase {idx}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar controls */}
          <div className="space-y-8">
            
            {/* Horizontal Day Tab selector */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Calibrated Schedule</h4>
                <p className="text-xs text-slate-500 mt-0.5">Select a date to inspect and execute milestones.</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {uniqueDates.map((dateStr) => {
                  const details = getDayDetails(dateStr);
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-150 cursor-pointer text-center relative ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className={`text-[10px] font-bold font-mono uppercase ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}>
                        {details.dayName}
                      </span>
                      <span className="text-lg font-extrabold tracking-tight mt-1 font-display">
                        {details.dayNum}
                      </span>
                      
                      {/* Day contribution/completion mini indicator dots */}
                      <span className="flex items-center gap-0.5 mt-2">
                        {Array.from({ length: Math.min(details.totalCount, 3) }).map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected
                                ? idx < details.doneCount ? 'bg-white' : 'bg-indigo-400'
                                : idx < details.doneCount ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Execution Progress Summary Bento Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Progress Summary</h4>
                <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  In-Flight
                </span>
              </div>

              {/* Progress Ring Visualization */}
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="relative flex items-center justify-center h-32 w-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      className="text-slate-100"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      className="text-indigo-600 transition-all duration-300"
                      strokeWidth="8"
                      strokeDasharray={339.29}
                      strokeDashoffset={339.29 - (339.29 * activeCommitment.progressPercentage) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-slate-900 font-display">
                      {activeCommitment.progressPercentage}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase mt-0.5">
                      COMPLETED
                    </span>
                  </div>
                </div>
              </div>

              {/* Incremental Stats list */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Completed Deliverables:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeCommitment.completedTasksCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Pending Workloads:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeCommitment.totalTasksCount - activeCommitment.completedTasksCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Confidence Metric:</span>
                  <span className="font-bold text-indigo-600 font-mono flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {activeCommitment.overallConfidence}%
                  </span>
                </div>
                {driftAssessment && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Schedule Drift:</span>
                    <span className={`font-mono font-bold uppercase ${
                      driftAssessment.severity === 'critical' ? 'text-rose-600' :
                      driftAssessment.severity === 'moderate' ? 'text-amber-600' :
                      driftAssessment.severity === 'minor' ? 'text-yellow-600' : 'text-emerald-600'
                    }`}>
                      {driftAssessment.drift_percentage}% ({driftAssessment.severity.replace('_', ' ')})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Drift Recommendation Alert Box */}
            {driftAssessment && driftAssessment.adaptation_recommended && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start gap-3 relative z-10">
                  <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-800 font-mono">ADAPTATION RECOMMENDED</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-light">
                      {driftAssessment.explanation}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdaptModalOpen(true)}
                  className="w-full relative z-10 bg-rose-600 hover:bg-rose-500 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>Adapt Trajectory Now</span>
                </button>
              </div>
            )}

            {/* Trigger Adaptation Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="space-y-1.5 relative z-10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">ADAPTIVE ENGINE</h4>
                <h3 className="text-base font-bold font-display">Schedule Deviation?</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If real-world delays occur, generate an optimized recovery path. Never rewrites completed history.
                </p>
              </div>
              <button
                onClick={() => setIsAdaptModalOpen(true)}
                className="w-full relative z-10 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-900/30"
              >
                <Sparkles className="h-4 w-4 animate-pulse text-indigo-200" />
                <span>Adapt Trajectory</span>
              </button>
            </div>

            {/* Help and status telemetry info */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-500 leading-relaxed font-light">
                <span className="font-bold text-slate-800 block mb-1">Telemetry Safe Sync (EXEC-001):</span>
                Your milestone execution progress is synced natively via your securely deployed Firebase Security Rules. Any task completion instantly triggers progress recalibration without hitting external networks.
              </div>
            </div>

            {/* Adaptation History Card */}
            {adaptations && adaptations.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Adaptation History</h4>
                </div>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {adaptations.map((adapt) => (
                    <div key={adapt.id} className="border-l-2 border-slate-100 pl-4 py-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{new Date(adapt.createdAt).toLocaleDateString()}</span>
                        <span className="font-bold text-indigo-600">
                          {adapt.confidence_change.before}% → {adapt.confidence_change.after}%
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 font-display">
                        {adapt.adaptation_summary}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        <span className="font-semibold text-slate-700">Strategy:</span> {adapt.recovery_strategy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ADAPTATION DIALOG MODAL */}
      <AnimatePresence>
        {isAdaptModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="adaptation-modal">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (!proposeMutation.isPending && !applyMutation.isPending) {
                    setIsAdaptModalOpen(false);
                    setAdaptationProposal(null);
                    setUserReason('');
                  }
                }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
              />

              {/* Modal card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl transition-all border border-slate-100 z-10"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 border border-indigo-100">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-display">Adapt Strategy & Reschedule</h3>
                      <p className="text-xs text-slate-500">Autonomous deviation calibration and velocity optimization</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsAdaptModalOpen(false);
                      setAdaptationProposal(null);
                      setUserReason('');
                    }}
                    disabled={proposeMutation.isPending || applyMutation.isPending}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="py-6 space-y-6">
                  {!adaptationProposal ? (
                    // Step 1: Input custom reason & trigger proposal
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800 block mb-1">How Trajectory Adaptation Works:</span>
                          Trajectory analyzes your completed tasks, today's date, and remaining velocity. It then uses Gemini AI to strategically redistribute remaining future workloads. Completed and skipped milestones remain completely untouched to preserve execution lineage.
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                          Context / Delay Notes (Optional)
                        </label>
                        <textarea
                          value={userReason}
                          onChange={(e) => setUserReason(e.target.value)}
                          placeholder="e.g. Encountered unexpected deployment bottlenecks in Phase 1, need to condense Phase 2 or optimize upcoming timelines..."
                          disabled={proposeMutation.isPending}
                          rows={4}
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                        <p className="text-[10px] text-slate-400 font-mono">
                          Giving details helps Gemini allocate effort more accurately based on your actual blockages.
                        </p>
                      </div>

                      {proposeMutation.isPending ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                          <div className="text-center space-y-1 animate-pulse">
                            <p className="text-sm font-bold text-slate-800">Calibrating Trajectory...</p>
                            <p className="text-xs text-slate-500">Evaluating velocity, schedule drift, and capacity margins</p>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => proposeMutation.mutate(userReason)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Adaptation Proposal</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    // Step 2: Show adaptation proposal & offer apply option
                    <div className="space-y-6 max-h-[450px] overflow-y-auto pr-1">
                      {/* Impact Highlight */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col items-center text-center justify-center">
                          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">Confidence Impact</span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm line-through text-slate-400 font-semibold">{adaptationProposal.confidence_change.before}%</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xl font-bold text-indigo-600 font-display">{adaptationProposal.confidence_change.after}%</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl md:col-span-2">
                          <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider mb-1">Impact Explanation</span>
                          <p className="text-xs text-slate-600 leading-relaxed font-light">{adaptationProposal.confidence_change.explanation}</p>
                        </div>
                      </div>

                      {/* Summaries */}
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50/20 border border-amber-200/50 rounded-2xl space-y-1">
                          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            AI Schedule Drift Analysis
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{adaptationProposal.adaptation_summary}</p>
                        </div>

                        <div className="p-4 bg-indigo-50/20 border border-indigo-200/50 rounded-2xl space-y-1">
                          <h4 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                            Strategic Recovery Strategy
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{adaptationProposal.recovery_strategy}</p>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-1">
                          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            Risk Assessment
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-light">{adaptationProposal.risk_assessment}</p>
                        </div>
                      </div>

                      {/* Future Milestones Changes */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Proposed Future Schedule</h4>
                        <div className="space-y-3">
                          {adaptationProposal.revised_milestones.map((milestone) => (
                            <div key={milestone.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h5 className="text-sm font-bold text-slate-900 font-display">{milestone.title}</h5>
                                <span className="text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                  Target: {milestone.targetDate}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed">{milestone.description}</p>
                              
                              {/* Tasks */}
                              <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                                {milestone.tasks.map((task) => (
                                  <div key={task.id} className="flex items-center justify-between text-xs py-0.5">
                                    <span className="text-slate-700 font-medium">{task.title}</span>
                                    <div className="flex items-center gap-2">
                                      {task.isCriticalPath && (
                                        <span className="text-[8px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-1 py-0.2 rounded uppercase">Critical</span>
                                      )}
                                      <span className="font-mono text-slate-400 text-[10px]">{task.date}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Navigation and Apply buttons */}
                      <div className="flex gap-3 border-t border-slate-100 pt-5 mt-4">
                        <button
                          disabled={applyMutation.isPending}
                          onClick={() => setAdaptationProposal(null)}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
                        >
                          Back to Notes
                        </button>
                        <button
                          disabled={applyMutation.isPending}
                          onClick={() => applyMutation.mutate(adaptationProposal)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
                        >
                          {applyMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-indigo-200" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span>Apply Revised Plan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
