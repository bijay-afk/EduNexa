import { describe, expect, it, vi, type Mock } from 'vitest';
import { runQueueJob, withTimeout, friendlyError } from './ai-generation.worker';

type Deps = Parameters<typeof runQueueJob>[0];

function makeDeps(generateImpl: () => Promise<void>) {
  const prisma = {
    aiGeneration: { update: vi.fn().mockResolvedValue({}) },
  };
  const generationService = { generate: vi.fn(generateImpl) };
  return {
    deps: { prisma, generationService } as unknown as Deps,
    prisma,
    generationService,
  };
}

const job = { data: { generationId: 'gen-1', generator: 'LLM' as const } };

describe('runQueueJob', () => {
  it('marks the generation PROCESSING and runs the trusted pipeline', async () => {
    const { deps, prisma, generationService } = makeDeps(() => Promise.resolve());

    await runQueueJob(deps, job, 1000);

    expect(prisma.aiGeneration.update).toHaveBeenCalledWith({
      where: { id: 'gen-1' },
      data: { state: 'PROCESSING' },
    });
    expect(generationService.generate).toHaveBeenCalledWith('gen-1');
  });

  it('records FAILED with a friendly error and rethrows on pipeline failure', async () => {
    const { deps, prisma } = makeDeps(() => Promise.reject(new Error('boom')));

    await expect(runQueueJob(deps, job, 1000)).rejects.toThrow('boom');

    expect(prisma.aiGeneration.update).toHaveBeenCalledWith({
      where: { id: 'gen-1' },
      data: { state: 'PROCESSING' },
    });
    expect(prisma.aiGeneration.update).toHaveBeenCalledWith({
      where: { id: 'gen-1' },
      data: { state: 'FAILED', error: 'boom' },
    });
  });

  it('fails the job (and surfaces a friendly error) when Ollama is unreachable', async () => {
    const { deps, prisma } = makeDeps(() =>
      Promise.reject(new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:11434')),
    );

    await expect(runQueueJob(deps, job, 1000)).rejects.toThrow();

    const failCall = (prisma.aiGeneration.update as Mock).mock.calls.find(
      (c: unknown[]) => (c[0] as { data?: { state?: string } }).data?.state === 'FAILED',
    );
    expect(failCall).toBeDefined();
    const failData = (failCall as unknown[])[0] as { data: { error: string } };
    expect(failData.data.error).toContain('ollama serve');
  });
});

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it('rejects with a timeout error when the promise never settles', async () => {
    await expect(withTimeout(new Promise<void>(() => undefined), 10)).rejects.toThrow(/timed out/);
  });
});

describe('friendlyError', () => {
  it('maps Ollama connection failures to an actionable message', () => {
    expect(friendlyError(new Error('ECONNREFUSED 127.0.0.1:11434'))).toContain('ollama serve');
  });

  it('maps markdown-fence JSON parse errors to nothing special', () => {
    const msg = friendlyError(new Error('Unexpected token < in JSON'));
    expect(msg).toContain('Unexpected token');
  });

  it('handles non-Error values', () => {
    expect(friendlyError('nope')).toBe('nope');
  });
});