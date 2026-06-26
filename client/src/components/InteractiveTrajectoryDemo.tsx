import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Calendar, ArrowRight } from 'lucide-react';

interface MockMilestone {
  id: string;
  title: string;
  originalDate: string;
  shiftedDate: string;
  status: 'pending' | 'completed' | 'delayed' | 'rescheduled';
  hours: number;
}

export default function InteractiveTrajectoryDemo() {
  const [isDelayed, setIsDelayed] = useState(false);
  const [selectedCommitment, setSelectedCommitment] = useState(0);

  const commitments = [
    {
      title: "Deploy Full-Stack Portfolio App",
      deadline: "July 2, 2026",
      milestones: [
        { id: '1', title: "Database schema & seed script", originalDate: "June 27", shiftedDate: "June 27", status: "completed", hours: 4 },
        { id: '2', title: "Firebase authentication routing", originalDate: "June 29", shiftedDate: "June 30", status: "delayed", hours: 6 },
        { id: '3', title: "Interactive frontend dashboards", originalDate: "July 1", shiftedDate: "July 2", status: "pending", hours: 10 },
      ] as MockMilestone[]
    },
    {
      title: "Prepare for System Design Interview",
      deadline: "July 5, 2026",
      milestones: [
        { id: '1', title: "Review scaling & load balancers", originalDate: "June 28", shiftedDate: "June 28", status: "completed", hours: 3 },
        { id: '2', title: "Mock sharding & replication case", originalDate: "June 30", shiftedDate: "July 1", status: "delayed", hours: 5 },
        { id: '3', title: "Interactive API gateway architecture", originalDate: "July 3", shiftedDate: "July 4", status: "pending", hours: 8 },
      ] as MockMilestone[]
    }
  ];

  const current = commitments[selectedCommitment];

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Live Trajectory Simulator
          </span>
        </div>
        <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-lg">
          {commitments.map((c, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedCommitment(i);
                setIsDelayed(false);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                selectedCommitment === i
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Commitment {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-semibold font-mono text-slate-400">TARGET COMMITMENT</h4>
        <div className="flex items-center justify-between mt-1">
          <p className="text-base font-bold text-slate-900 tracking-tight font-display">
            {current.title}
          </p>
          <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100">
            {current.deadline}
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6 relative">
        <AnimatePresence mode="popLayout">
          {current.milestones.map((milestone) => {
            const hasShifted = isDelayed && milestone.originalDate !== milestone.shiftedDate;
            const isMilestoneDelayed = isDelayed && milestone.status === 'delayed';

            return (
              <motion.div
                key={milestone.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`p-4 border rounded-xl flex items-start justify-between transition-colors ${
                  isMilestoneDelayed
                    ? 'border-amber-200 bg-amber-50/40'
                    : milestone.status === 'completed'
                    ? 'border-emerald-150 bg-emerald-50/10'
                    : hasShifted
                    ? 'border-indigo-200 bg-indigo-50/10'
                    : 'border-slate-150 bg-slate-50/10'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {milestone.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    ) : isMilestoneDelayed ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 animate-bounce" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900">{milestone.title}</h5>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {hasShifted ? (
                        <span className="flex items-center gap-1">
                          <span className="line-through text-slate-400">{milestone.originalDate}</span>
                          <ArrowRight className="h-3 w-3 text-indigo-500" />
                          <span className="font-bold text-indigo-600">{milestone.shiftedDate}</span>
                        </span>
                      ) : (
                        <span>{milestone.originalDate}</span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span>{milestone.hours} hrs est.</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {milestone.status === 'completed' ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                      Done
                    </span>
                  ) : isMilestoneDelayed ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                      Delayed
                    </span>
                  ) : hasShifted ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded">
                      Self-Healed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Scheduled
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Simulation Controller
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {isDelayed 
              ? "The Adaptation Agent has automatically re-balanced future milestones to protect the hard deadline." 
              : "All tasks currently running on schedule. Simulate a milestone delay to trigger self-healing."}
          </p>
        </div>
        <button
          onClick={() => setIsDelayed(!isDelayed)}
          className={`w-full md:w-auto px-4 py-2 text-xs font-bold rounded-lg border transition flex items-center justify-center gap-1.5 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDelayed
              ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 focus:ring-amber-500'
              : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isDelayed ? 'animate-spin' : ''}`} />
          {isDelayed ? "Reset Simulation" : "Simulate 24h Delay"}
        </button>
      </div>
    </div>
  );
}
