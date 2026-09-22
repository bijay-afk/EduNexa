import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ' };

const faqs = [
  ['Is the content aligned to the official curriculum?', 'Yes. Content is authored, reviewed, and published through the content-management workflow, then organised under the official grade/subject/chapter/topic structure. Nothing enters the syllabus without an approved source.'],
  ['How does AI question generation stay on-syllabus?', 'Teachers select the curriculum, grade, subject, chapters, and topics. The generator only consumes approved content retrieved for those selections, then validates, de-duplicates, and presents the results as drafts for the teacher to approve. The AI never publishes directly.'],
  ['Who writes the questions?', 'Content authors and teachers. AI-generated questions are draft suggestions with visible source references for every question.'],
  ['Can I practise anywhere?', 'Yes — the platform is mobile-first, installable (PWA), and responsive across devices.'],
  ['Do mock exams time out?', 'Yes. Duration is enforced by the server; the client timer is informational only.'],
  ['How is my data protected?', 'Secure authentication, role-based access control, HTTPS, and audit logging. Passwords are hashed; secrets never leave the server environment.'],
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Frequently asked questions</h1>
      <div className="mt-8 space-y-4">
        {faqs.map(([q, a]) => (
          <div key={q} className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="font-semibold">{q}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}