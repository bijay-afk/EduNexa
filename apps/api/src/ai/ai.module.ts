import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiQueueService } from './ai-queue.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiQueueService],
})
export class AiModule {}