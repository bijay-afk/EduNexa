import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiQueueService } from './ai-queue.service';
import { AiGenerationWorker } from './ai-generation.worker';
import { AiGenerationProcessor } from './ai-generation.processor';
import { AiGenerationService } from './ai-generation.service';
import { RetrievalService } from './retrieval.service';
import { LlmProvider } from './providers/llm-provider';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    AiQueueService,
    AiGenerationWorker,
    AiGenerationProcessor,
    AiGenerationService,
    RetrievalService,
    LlmProvider,
  ],
})
export class AiModule {}