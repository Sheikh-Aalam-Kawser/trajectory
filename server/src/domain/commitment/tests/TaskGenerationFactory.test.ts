import { describe, it, expect } from 'vitest';
import { TaskGenerationFactory } from '../TaskGenerationFactory';

describe('TaskGenerationFactory Unit Tests', () => {
  it('generates exactly 4 tasks for the first milestone (index 0) with distinct stages', () => {
    const tasks = TaskGenerationFactory.generate('Phase 1: Foundation', '2026-07-01', 0);
    
    expect(tasks).toHaveLength(4);
    expect(tasks[0].title).toContain('UX constraints');
    expect(tasks[1].title).toContain('workspace structure');
    expect(tasks[2].title).toContain('core database schema');
    expect(tasks[3].title).toContain('structural validation');

    // Verify properties
    tasks.forEach((t) => {
      expect(t.status).toBe('pending');
      expect(t.estimatedHours).toBeGreaterThan(0);
      expect(typeof t.isCriticalPath).toBe('boolean');
      expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD
    });

    // Check critical path
    expect(tasks[0].isCriticalPath).toBe(true);
    expect(tasks[1].isCriticalPath).toBe(false);
  });

  it('generates correct tasks for second milestone (index 1) and third milestone (index 2)', () => {
    const m2Tasks = TaskGenerationFactory.generate('Phase 2: Core Engineering', '2026-07-10', 1);
    expect(m2Tasks).toHaveLength(4);
    expect(m2Tasks[0].title).toContain('API integration');

    const m3Tasks = TaskGenerationFactory.generate('Phase 3: Launch Ready', '2026-07-20', 2);
    expect(m3Tasks).toHaveLength(4);
    expect(m3Tasks[0].title).toContain('system performance');
  });
});
