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
  @ApiOperation({ summary: 'Generate syllabus-grounded questions from the paper-archive database' })
  enqueue(@Body() config: unknown, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.enqueueGeneration(user.id, config);
  }

  @Get('archive-subjects')
  @ApiOperation({ summary: 'List paper-archive subjects + exam types for the generator form' })
  archiveSubjects() {
    return this.aiService.listArchiveSubjects();
  }

  @Get('archive-papers')
  @ApiOperation({ summary: 'List paper-archive papers for the generator form' })
  archivePapers() {
    return this.aiService.listArchivePapers();
  }

  @Get()
  @ApiOperation({ summary: 'A teacher\'s recent generations (audit trail)' })
  getGenerations(@CurrentUser() user: AuthenticatedUser) {
    return this.aiService.listGenerations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Poll generation status (includes generated item ids + validation)' })
  getGeneration(@Param('id') id: string) {
    return this.aiService.getGeneration(id);
  }
}