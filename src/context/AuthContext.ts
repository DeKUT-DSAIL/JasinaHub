import { createContext } from 'react';
import { User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  /** True once the initial session + role lookup have resolved. */
  initialized: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  loading: true,
  initialized: false,
});
