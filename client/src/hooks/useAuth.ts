import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { AuthState } from '@shared/types/auth';

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
