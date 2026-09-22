import katex from 'katex';

/** Server-safe LaTeX renderer using KaTeX (spec §10). */
export function Formula({ latex, block = false }: { latex: string; block?: boolean }) {
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: block,
    strict: false,
  });
  return (
    <span
      className={block ? 'my-3 flex justify-center' : ''}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}