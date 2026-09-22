import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AiService } from './ai.service';
import { UserRole } from '@edunexa/types';

@ApiTags('question-generation')
@Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('question-generation')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  @ApiOperation({ summary: 'Enqueue a syllabus-grounded question generation job' })
  enqueue(@Body() config: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.enqueueGeneration(user.id, config);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Poll generation status' })
  getGeneration(@Param('id') id: string) {
    return this.aiService.getGeneration(id);
  }
}