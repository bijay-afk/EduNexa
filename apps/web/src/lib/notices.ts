/**
 * Display-ready notices for the marketing site.
 *
 * Dates are pre-formatted strings on purpose: rendering this list on both the
 * server and the client must produce identical markup, so we never call
 * `new Date()` inside a component.
 */
export interface Notice {
  id: string;
  tag: 'Exam' | 'Results' | 'Content' | 'Schedule' | 'General';
  title: string;
  body: string;
  date: string;
}

export const notices: Notice[] = [
  {
    id: 'notice-2026-sep-exam',
    tag: 'Exam',
    title: 'Grade 10 mock examinations open this week',
    body: 'Full-syllabus mock papers for Mathematics and Science are now scheduled. Check the student dashboard for your seat and time slots.',
    date: 'Sep 21, 2026',
  },
  {
    id: 'notice-2026-sep-content',
    tag: 'Content',
    title: 'Live Processes notes published',
    body: 'Nutrition and respiration notes for Science — Chapter 2 have been reviewed and published on the learning path.',
    date: 'Sep 18, 2026',
  },
  {
    id: 'notice-2026-sep-quiz',
    tag: 'Schedule',
    title: 'Weekly practice quizzes go live Fridays',
    body: 'A timed weekly quiz opens every Friday for Mathematics and Science. Each quiz takes about 20 minutes.',
    date: 'Sep 16, 2026',
  },
  {
    id: 'notice-2026-sep-planner',
    tag: 'General',
    title: 'Study planner tool is now available',
    body: 'Plan your revision from your next exam date and daily study hours. Generate, review, and edit your schedule any time.',
    date: 'Sep 12, 2026',
  },
  {
    id: 'notice-2026-sep-teacher',
    tag: 'Content',
    title: 'Teacher question bank expanded',
    body: 'Teachers can regenerate and approve syllabus-grounded questions for every published chapter and topic.',
    date: 'Sep 8, 2026',
  },
];