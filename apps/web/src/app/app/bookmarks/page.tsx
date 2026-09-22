import { Card, CardContent } from '@class10/ui';

export const metadata = { title: 'Bookmarks' };

const bookmarks = [
  { type: 'Formula', title: 'Quadratic formula', ref: 'Mathematics · Quadratic Equations' },
  { type: 'Note', title: 'Photosynthesis overview', ref: 'Science · Life Processes' },
  { type: 'Question', title: 'Factorise x² - 9', ref: 'Mathematics · Algebra' },
];

export default function BookmarksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bookmarks</h1>
      <div className="grid gap-4">
        {bookmarks.map((bookmark) => (
          <Card key={bookmark.title}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{bookmark.title}</p>
                <p className="text-sm text-muted-foreground">{bookmark.ref}</p>
              </div>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                {bookmark.type}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}