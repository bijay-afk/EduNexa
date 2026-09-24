/**
 * Display-ready notices for the marketing site.
 *
 * Notices are published by the EduNexa API. This placeholder stays empty until
 * the notices endpoint is wired up.
 */
export interface Notice {
  id: string;
  tag: 'Exam' | 'Results' | 'Content' | 'Schedule' | 'General';
  title: string;
  body: string;
  date: string;
}

export const notices: Notice[] = [];