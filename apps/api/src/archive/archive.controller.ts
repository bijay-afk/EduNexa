import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@edunexa/types';
import { ArchiveService } from './archive.service';
import {
  ListArchiveQuestionsDto,
  ListPapersDto,
  ListRevisionsDto,
} from './dto/archive-query.dto';
import {
  ApprovePageDto,
  ImportArchiveQuestionDto,
  RejectPageDto,
  SaveOcrDto,
  UpdateArchiveQuestionDto,
} from './dto/update-archive-question.dto';

const REVIEW_ROLES = [UserRole.TEACHER, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@ApiTags('archive')
@Roles(...REVIEW_ROLES)
@Controller('archive')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  // ------------------------------------------------------------------ papers

  @Get('papers')
  @ApiOperation({ summary: 'List SEE papers with OCR roll-up + mapped-question counts' })
  listPapers(@Query() query: ListPapersDto) {
    return this.archiveService.listPapers(query);
  }

  @Get('papers/:id')
  @ApiOperation({ summary: 'Paper detail with pages (OCR state + extracted-question counts)' })
  getPaper(@Param('id') id: string) {
    return this.archiveService.getPaper(id);
  }

  @Post('papers/:id/extract')
  @ApiOperation({ summary: 'Re-run deterministic question extraction; preserves curation' })
  extract(@Param('id') id: string) {
    return this.archiveService.extractQuestions(id);
  }

  // ----------------------------------------------------------------- questions

  @Get('questions')
  @ApiOperation({ summary: 'List extracted SEE questions with provenance + mapping filters' })
  listQuestions(@Query() query: ListArchiveQuestionsDto) {
    return this.archiveService.listQuestions(query);
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'Extracted question detail incl. source paper + scan page' })
  getQuestion(@Param('id') id: string) {
    return this.archiveService.getQuestion(id);
  }

  @Patch('questions/:id')
  @ApiOperation({
    summary: 'Curate / map an extracted question (edit text, marks, options, chapter/topic)',
  })
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateArchiveQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveService.updateQuestion(id, user.id, dto);
  }

  @Post('questions/:id/import')
  @ApiOperation({
    summary: 'Import a human-mapped extracted question into the teacher question bank',
  })
  importQuestion(
    @Param('id') id: string,
    @Body() dto: ImportArchiveQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveService.importQuestion(id, user.id, dto.topicId);
  }

  // ------------------------------------------------------------------ pages

  @Get('pages/:id')
  @ApiOperation({ summary: 'Page detail: scan URL, OCR text/state, recent revisions' })
  getPage(@Param('id') id: string) {
    return this.archiveService.getPage(id);
  }

  @Patch('pages/:id/ocr')
  @ApiOperation({ summary: 'Correct OCR text — stores a versioned revision, moves page to review' })
  saveOcr(@Param('id') id: string, @Body() dto: SaveOcrDto, @CurrentUser() user: AuthenticatedUser) {
    return this.archiveService.saveOcr(id, user.id, dto);
  }

  @Post('pages/:id/approve')
  @ApiOperation({ summary: 'Approve the current OCR text for this scan page' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveService.approvePage(id, user.id, dto.note);
  }

  @Post('pages/:id/reject')
  @ApiOperation({ summary: 'Reject the OCR for this scan page (requires a reason)' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.archiveService.rejectPage(id, user.id, dto.note);
  }

  @Get('pages/:id/revisions')
  @ApiOperation({ summary: 'OCR correction history for a page' })
  revisions(@Param('id') id: string, @Query() query: ListRevisionsDto) {
    return this.archiveService.listRevisions(id, query.limit);
  }

  // ----------------------------------------------------------------- health

  @Get('coverage')
  @ApiOperation({
    summary: 'Data-health counts + per-chapter mapped-question coverage for Grade 10',
  })
  coverage() {
    return this.archiveService.coverage();
  }
}