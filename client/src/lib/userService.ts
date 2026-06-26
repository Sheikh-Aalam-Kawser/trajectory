import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '@shared/types/auth';

const USERS_COLLECTION = 'users';

export const userService = {
  /**
   * Retrieves a user profile from Firestore by UID.
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile from Firestore:', error);
      throw error;
    }
  },

  /**
   * Creates a new user profile document in Firestore.
   */
  async createUserProfile(uid: string, profile: UserProfile): Promise<UserProfile> {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(docRef, profile);
      return profile;
    } catch (error) {
      console.error('Error creating user profile in Firestore:', error);
      throw error;
    }
  },

  /**
   * Updates an existing user profile document in Firestore.
   */
  async updateUserProfile(uid: string, profileUpdates: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(docRef, profileUpdates);
    } catch (error) {
      console.error('Error updating user profile in Firestore:', error);
      throw error;
    }
  },
};
