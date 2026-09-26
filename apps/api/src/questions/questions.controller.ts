import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { SetQuestionStatusDto } from './dto/set-question-status.dto';
import { BankQueryDto } from './dto/bank-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UserRole } from '@edunexa/types';
import type { QuestionStatus } from '@prisma/client';

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

  @Get('bank')
  @ApiOperation({ summary: 'A teacher\'s question bank with curriculum + provenance; filter by status' })
  getBank(@Query() query: BankQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.listByOwner(user.id, {
      status: query.status ? (query.status as QuestionStatus) : undefined,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'List questions for a topic' })
  listByTopic(
    @Param('topicId') topicId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.questionsService.listByTopic(topicId, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned question with curriculum join + provenance' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.questionsService.getOne(user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Teacher review gate: approve, reject, or move through review states' })
  setStatus(
    @Param('id') id: string,
    @Body() body: SetQuestionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.setStatus(user.id, id, body.status, body.note);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an owned question (not approved/archived); bumps version + audit' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.questionsService.update(user.id, id, dto);
  }
}