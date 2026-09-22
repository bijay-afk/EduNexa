export const metadata = { title: 'Admin' };

const tiles = [
  ['Users & roles', 'Manage students, teachers, admins; RBAC permission grants'],
  ['Curriculum', 'Grades, subjects, chapters, topics — versioned and reviewed'],
  ['Content workflow', 'Drafts → review → approval → publication; version history'],
  ['Questions', 'Question bank overview, statuses, and teacher generation audit'],
  ['Audit log', 'Actions across the platform for compliance and security'],
  ['Analytics', 'Usage, performance, and AI generation costs'],
];

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold">Administration console</h1>
      <p className="mt-2 text-sm text-gray-500">
        Scaffold — the admin portal ships with Phase 1/2 (user management, curriculum, content
        workflow, audit logs).
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tiles.map(([title, description]) => (
          <div key={title} className="rounded-lg border p-5 shadow-sm">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}