import { Badge } from '@edunexa/ui';
import { Formula } from '@/components/math/formula';
import type { ContentBlock } from '@/lib/api';

/** Renders the structured content blocks served by the API (spec §9). */
export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2 key={i} className="text-2xl font-medium md:text-3xl">
                {block.text}
              </h2>
            );
          case 'paragraph':
            return (
              <p key={i} className="text-[1.0625rem] leading-8 text-muted-foreground">
                {block.text}
              </p>
            );
          case 'formula':
            return <Formula key={i} latex={block.latex ?? ''} block />;
          case 'list':
            return (
              <ul key={i} className="ml-6 list-disc space-y-2.5 text-[1.0625rem] leading-7 text-muted-foreground">
                {block.items?.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          case 'image':
            return block.src ? (
              <img key={i} src={block.src} alt={block.alt ?? block.text ?? ''} className="rounded-xl" />
            ) : null;
          case 'example':
            return (
              <div key={i} className="rounded-xl border bg-muted/40 p-6">
                <p className="font-medium">{block.text}</p>
                {block.children?.map((child, j) => (
                  <ContentBlocks key={j} blocks={[child]} />
                ))}
                {block.solution ? (
                  <p className="mt-3 text-muted-foreground">{block.solution}</p>
                ) : null}
              </div>
            );
          case 'important':
            return (
              <div key={i} className="rounded-md border border-primary/40 bg-primary/5 p-4 text-muted-foreground">
                <Badge variant="outline" className="mr-2">
                  Important
                </Badge>
                {block.text}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}