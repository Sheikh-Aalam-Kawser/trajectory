import { Type } from '@google/genai';

export const AdaptationResponseSchema = {
  type: Type.OBJECT,
  properties: {
    adaptation_summary: {
      type: Type.STRING,
      description: 'A concise explanation of why the adaptation/re-scheduling is necessary, detailing the schedule drift and velocity issues.'
    },
    risk_assessment: {
      type: Type.STRING,
      description: 'An explanation of newly introduced risks (e.g. condensed schedules, tighter deadlines, fatigue).'
    },
    recovery_strategy: {
      type: Type.STRING,
      description: 'The minimum strategic changes required to maximize overall completion probability before the hard deadline.'
    },
    confidence_change: {
      type: Type.OBJECT,
      properties: {
        before: {
          type: Type.INTEGER,
          description: 'The overall confidence percentage BEFORE this adaptation (typically the current commitment overallConfidence).'
        },
        after: {
          type: Type.INTEGER,
          description: 'The recalculated realistic confidence percentage AFTER applying this revised adaptation (0-100).'
        },
        explanation: {
          type: Type.STRING,
          description: 'A detailed explanation for why the confidence shifted.'
        }
      },
      required: ['before', 'after', 'explanation']
    },
    revised_milestones: {
      type: Type.ARRAY,
      description: 'The list of revised future milestones. ONLY FUTURE OR IN-PROGRESS MILESTONES / TASKS SHOULD BE MODIFIED. Completed milestones or tasks must remain identical and untouched.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'The EXACT same ID of the milestone being revised.'
          },
          title: {
            type: Type.STRING,
            description: 'The title of the milestone (keep original or slightly adjust if description changed).'
          },
          description: {
            type: Type.STRING,
            description: 'The description of the milestone.'
          },
          targetDate: {
            type: Type.STRING,
            description: 'The revised target completion date in YYYY-MM-DD format. Must not exceed the commitment main due date.'
          },
          estimatedHours: {
            type: Type.INTEGER,
            description: 'The revised estimated hours.'
          },
          tasks: {
            type: Type.ARRAY,
            description: 'The revised list of tasks for this milestone.',
            items: {
              type: Type.OBJECT,
              properties: {
                id: {
                  type: Type.STRING,
                  description: 'The EXACT same ID of the task being revised.'
                },
                title: {
                  type: Type.STRING,
                  description: 'The title of the task.'
                },
                date: {
                  type: Type.STRING,
                  description: 'The revised date in YYYY-MM-DD format. Must be within the milestone targetDate range and not in the past.'
                },
                estimatedHours: {
                  type: Type.INTEGER,
                  description: 'The revised hours.'
                },
                isCriticalPath: {
                  type: Type.BOOLEAN,
                  description: 'Whether this task lies on the critical execution path.'
                }
              },
              required: ['id', 'title', 'date', 'estimatedHours', 'isCriticalPath']
            }
          }
        },
        required: ['id', 'title', 'description', 'targetDate', 'estimatedHours', 'tasks']
      }
    }
  },
  required: ['adaptation_summary', 'risk_assessment', 'recovery_strategy', 'confidence_change', 'revised_milestones']
};
