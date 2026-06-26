import React from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { RefreshCw, Star, Compass, AlertTriangle } from 'lucide-react';

export default function ReflectionPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="pb-6 border-b border-slate-200/60">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
            Adaptive Reflection Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze historical trajectories and capture learning metrics to optimize future execution paths.
          </p>
        </div>

        {/* Informational Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-display text-slate-900">What is Adaptive Reflection?</h3>
            <p className="text-sm text-slate-500 max-w-xl">
              Trajectory doesn't just adapt when you are in flight. After a project completes, we evaluate delay reasons, structural estimates, and your performance, tuning the underlying Gemini planners for your unique working cadence.
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 text-indigo-700 font-semibold shrink-0">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <div className="text-xs">
              <span className="block font-bold">Optimization Engine:</span>
              <span>Running Calibrated Model</span>
            </div>
          </div>
        </div>

        {/* Historical Logs List */}
        <div className="space-y-4">
          <h3 className="text-base font-bold font-display text-slate-900">Historical Reflection Sessions</h3>
          
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Case #712
                  </span>
                  <h4 className="text-base font-bold text-slate-900 font-display mt-1">
                    Midterm Exam Study Heuristics
                  </h4>
                </div>
                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>A- Grade Delivered</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-400 font-mono">ADAPTATION ANALYSIS</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Planning model predicted 12 hours of deep practice. Reality required 15 hours. The Adaptation Agent successfully shifted study milestones forward to accommodate an unexpected homework overload.
                  </p>
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-400 font-mono">FEEDBACK LOOP ADJUSTMENT</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Next time, Trajectory will buffer your academic commitments by 15% automatically to prevent cramming when structural deadlines coincide with secondary coursework.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm opacity-70">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Case #608
                  </span>
                  <h4 className="text-base font-bold text-slate-900 font-display mt-1">
                    System Design Mock Prep Block
                  </h4>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>Fully Completed</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-400 font-mono">ADAPTATION ANALYSIS</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Estimated 8 hours. Actual effort matched the schedule precisely (100% calibration accuracy). No adaptation required.
                  </p>
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-400 font-mono">FEEDBACK LOOP ADJUSTMENT</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Heuristics are highly accurate for mock interviews and routing case reviews. Buffer parameters maintained at 0% for these categories.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
