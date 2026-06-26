import { Request } from 'express';
import { TrajectoryUser } from '../../../shared/types/auth';

export interface AuthenticatedRequest extends Request {
  user?: TrajectoryUser;
}

export interface StandardAPIResponse<T = any> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
}

export interface AIAgentResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  metadata: {
    agent: 'planning' | 'prioritization' | 'adaptation';
    model: string;
    timestamp: string;
    version: string;
    latency: number;
  };
}
