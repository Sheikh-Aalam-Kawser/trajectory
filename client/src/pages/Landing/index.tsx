import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'motion/react';
import { Compass, Sparkles, AlertCircle, Shield, Brain, Layers, Zap, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../lib/firebase';
import InteractiveTrajectoryDemo from '../../components/InteractiveTrajectoryDemo';

export default function LandingPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      // Auth success is captured by AuthContext state listener, triggering redirect
    } catch (err: any) {
      console.error('Sign-in Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. The authorization popup was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('The sign-in popup was blocked by your browser. Please allow popups for Trajectory to sign in.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('A network connection error occurred. Please check your internet connection.');
      } else {
        setError(err.message || 'An unexpected error occurred during Google Sign-In.');
      }
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 font-mono">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Elegant Header */}
      <header className="border-b border-slate-200/60 bg-white/85 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm shadow-indigo-100">
              <Compass className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight font-display text-slate-900">
              Trajectory
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
              ● Server Online
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Headline & Sign-in */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-7 flex flex-col space-y-6"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 text-xs font-semibold w-fit">
              <Sparkles className="h-3 w-3" />
              <span>Vibe2Ship Hackathon Project</span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 font-display leading-[1.05]"
            >
              The Self-Healing <br />
              <span className="text-indigo-600">Roadmap.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg text-slate-500 max-w-xl leading-relaxed"
            >
              Stop managing lists. Trajectory actively decomposes, structures, schedules, and adaptive-replans your high-stakes commitments so they finish before deadline.
            </motion.p>

            {/* Error UI */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start space-x-3 max-w-lg"
                role="alert"
              >
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">
                  <span className="font-bold">Authentication Mismatch: </span>
                  {error}
                </div>
              </motion.div>
            )}

            {/* Google Sign-in Card */}
            <motion.div 
              variants={itemVariants}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-lg"
            >
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Secure Partner Authorization
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Join with Google. Trajectory handles access seamlessly using isolated cryptographic standard credentials.
              </p>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                aria-label="Sign in with Google"
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed font-medium transition cursor-pointer shadow-sm select-none"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-hidden="true" />
                ) : (
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-5.84-4.53z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="font-semibold text-slate-900 text-sm">
                  {loading ? 'Opening Google Dialog...' : 'Continue with Google'}
                </span>
              </button>

              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-4">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-500" /> Secure Firebase Auth
                </span>
                <span>•</span>
                <span>Isolated Client Sandbox</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Interactive Simulator Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 flex justify-center"
          >
            <InteractiveTrajectoryDemo />
          </motion.div>
        </div>

        {/* Feature Grid Section (Bento Box style) */}
        <section className="max-w-6xl mx-auto mt-24 md:mt-32 border-t border-slate-200/70 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
              Three Specialized AI Agents. One Autonomous Engine.
            </h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Trajectory relies on real-time task partitioning and adaptation heuristics, eliminating raw checklists entirely.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-150 transition-all duration-350">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <Brain className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold font-display text-slate-900">Planning Agent</h4>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Ingests vague commitments and extracts logical progression paths, auto-assigning realistic hour budgets per milestone block.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-150 transition-all duration-350">
              <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-5">
                <Layers className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold font-display text-slate-900">Prioritization Agent</h4>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Evaluates active scope dependencies. Dynamically orders priority queues and prevents bottle-necks automatically.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-150 transition-all duration-350">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold font-display text-slate-900">Adaptation Agent</h4>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Performs impact diagnostics when milestones slip. Computes structural trade-offs to automatically self-heal the remaining path.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-200/60 bg-white/60 py-8 px-6 text-center text-xs text-slate-400 font-mono mt-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Trajectory. Fully sovereign architecture.</p>
          <p className="text-slate-400">
            Crafted for Coding Ninjas × Google for Developers Hackathon
          </p>
        </div>
      </footer>
    </div>
  );
}
