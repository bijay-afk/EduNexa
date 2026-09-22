import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UserRole } from '@class10/types';

@ApiTags('questions')
@Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft question (teacher) — auto-added to their bank' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.create(user.id, dto);
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'List questions for a topic' })
  listByTopic(
    @Param('topicId') topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.questionsService.listByTopic(topicId, query.page, query.limit);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or reject a draft question' })
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.setStatus(id, user.id, body.status);
  }
}