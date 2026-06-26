import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService } from '../lib/userService';
import { TrajectoryUser, AuthState, UserProfile } from '@shared/types/auth';

export const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        const mappedUser: TrajectoryUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
        };

        try {
          // Attempt to retrieve profile from Firestore
          let profile = await userService.getUserProfile(user.uid);

          if (!profile) {
            // Document creation on first successful sign-in
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              createdAt: new Date().toISOString(),
              lastSignInAt: new Date().toISOString(),
              onboardingCompleted: false,
              theme: 'light',
            };
            profile = await userService.createUserProfile(user.uid, newProfile);
          } else {
            // Automatically synchronize last sign in timestamp
            const updatedProfile = {
              ...profile,
              lastSignInAt: new Date().toISOString(),
            };
            await userService.updateUserProfile(user.uid, { lastSignInAt: updatedProfile.lastSignInAt });
            profile = updatedProfile;
          }

          setState({
            user: mappedUser,
            profile,
            loading: false,
            isAuthenticated: true,
            error: null,
          });
        } catch (error: any) {
          console.error('Error synchronizing user profile with Firestore:', error);
          setState({
            user: mappedUser,
            profile: null,
            loading: false,
            isAuthenticated: true, // Mark authenticated since Firebase login succeeded
            error: error.message || 'Failed to synchronize user profile.',
          });
        }
      } else {
        setState({
          user: null,
          profile: null,
          loading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
};

