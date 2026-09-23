import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiQueueService } from './ai-queue.service';
import { AiGenerationProcessor } from './ai-generation.processor';

@Module({
  controllers: [AiController],
  providers: [AiService, AiQueueService, AiGenerationProcessor],
})
export class AiModule {}