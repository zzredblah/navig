import { z } from 'zod';

/**
 * Dashboard API Validation Schemas
 */

// GET /api/dashboard/projects
export const projectsQuerySchema = z.object({
  status: z.enum(['planning', 'production', 'review', 'completed']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type ProjectsQuery = z.infer<typeof projectsQuerySchema>;

// GET /api/dashboard/activities
export const activitiesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export type ActivitiesQuery = z.infer<typeof activitiesQuerySchema>;
