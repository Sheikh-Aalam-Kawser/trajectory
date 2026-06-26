import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../lib/userService';
import { UserProfile } from '@shared/types/auth';

/**
 * Custom hook to load user profile from Firestore using TanStack Query.
 */
export function useUserProfile(uid: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery<UserProfile | null, Error>({
    queryKey: ['userProfile', uid],
    queryFn: async () => {
      if (!uid) return null;
      return userService.getUserProfile(uid);
    },
    enabled: !!uid,
    staleTime: 1000 * 60 * 5, // 5 minutes cache stale time
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!uid) throw new Error('No user authenticated');
      await userService.updateUserProfile(uid, updates);
      return updates;
    },
    onSuccess: (data) => {
      // Optimistically update query cache
      queryClient.setQueryData<UserProfile | null>(['userProfile', uid], (old) => {
        if (!old) return null;
        return { ...old, ...data };
      });
    },
  });

  return {
    ...query,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
