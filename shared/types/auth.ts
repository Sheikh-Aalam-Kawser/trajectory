export interface TrajectoryUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastSignInAt: string;
  onboardingCompleted: boolean;
  theme?: string;
}

export interface AuthState {
  user: TrajectoryUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
