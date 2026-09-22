import { BookmarksView } from '@/components/student/bookmarks-view';

export const metadata = { title: 'Bookmarks' };

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bookmarks</h1>
      <BookmarksView />
    </div>
  );
}