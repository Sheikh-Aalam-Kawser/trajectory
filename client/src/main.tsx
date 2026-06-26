import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/Landing';
import DashboardPage from './pages/Dashboard';
import CommitmentPage from './pages/Commitment';
import NewCommitmentPage from './pages/Commitment/New';
import ReflectionPage from './pages/Reflection';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commitment"
              element={
                <ProtectedRoute>
                  <CommitmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commitment/new"
              element={
                <ProtectedRoute>
                  <NewCommitmentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reflection"
              element={
                <ProtectedRoute>
                  <ReflectionPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
