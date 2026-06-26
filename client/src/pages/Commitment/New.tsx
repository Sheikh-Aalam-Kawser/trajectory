import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { ArrowLeft, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function NewCommitmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (newCommitment: {
      title: string;
      description: string;
      dueDate: string;
      priority: 'high' | 'medium' | 'low';
    }) => {
      return fetchWithAuth('/api/commitments', {
        method: 'POST',
        body: JSON.stringify(newCommitment),
      });
    },
    onSuccess: () => {
      // Invalidate queries so dashboard and active commitment components refresh with the new data
      queryClient.invalidateQueries({ queryKey: ['activeCommitment'] });
      queryClient.invalidateQueries({ queryKey: ['commitments'] });
      navigate('/dashboard');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side validations
    if (!title.trim() || title.length < 3) {
      setValidationError('Commitment Title must be at least 3 characters long.');
      return;
    }

    if (!dueDate) {
      setValidationError('Please specify a target completion date.');
      return;
    }

    const selectedDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setValidationError('Target completion date cannot be in the past.');
      return;
    }

    mutation.mutate({
      title,
      description,
      dueDate,
      priority,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Navigation Link back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="group flex items-center space-x-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition duration-150 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        {/* Page Header */}
        <div className="pb-4 border-b border-slate-200/60">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-2">
            New Autonomous Commitment
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trajectory will run a real-time planning pipeline using Gemini to design a chronologically staggered milestone strategy.
          </p>
        </div>

        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Invalid Configuration</p>
              <p className="text-rose-700 mt-0.5">{validationError}</p>
            </div>
          </motion.div>
        )}

        {mutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Planning Agent Error</p>
              <p className="text-rose-700 mt-0.5">{(mutation.error as any)?.message || 'Generation failed.'}</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Commitment Title
            </label>
            <input
              id="title"
              type="text"
              required
              disabled={mutation.isPending}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Build a complete subscription engine"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 text-slate-900 font-medium"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Strategic Context / Notes
            </label>
            <textarea
              id="description"
              rows={3}
              disabled={mutation.isPending}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide constraints, tech stack preferences, or notes for the AI planning engine..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 text-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="dueDate" className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Overall Target Date
              </label>
              <div className="relative">
                <input
                  id="dueDate"
                  type="date"
                  required
                  disabled={mutation.isPending}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-slate-900 font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                Priority Class
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => setPriority(p)}
                    className={`px-3 py-3 rounded-xl text-xs font-bold capitalize border transition cursor-pointer ${
                      priority === p
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className={`flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm shadow-indigo-150 transition cursor-pointer w-full sm:w-auto ${
                mutation.isPending ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {mutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Synthesizing Strategy...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-indigo-200" />
                  <span>Execute AI Planning</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
