import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurriculumService } from './curriculum.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('curriculum')
@Public()
@Controller()
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get('curriculums')
  @ApiOperation({ summary: 'List published curriculums' })
  listCurriculums() {
    return this.curriculumService.listCurriculums();
  }

  @Get('curriculums/:curriculumId/grades')
  @ApiOperation({ summary: 'List grades within a curriculum' })
  listGrades(@Param('curriculumId') curriculumId: string) {
    return this.curriculumService.listGrades(curriculumId);
  }

  @Get('grades/:gradeId/subjects')
  @ApiOperation({ summary: 'List subjects for a grade' })
  listSubjects(
    @Param('gradeId') gradeId: string,
    @Query() query: PaginationQueryDto,
  ) {
    const { page, limit } = query;
    return this.curriculumService.listSubjects(gradeId, page, limit);
  }

  @Get('subjects/:id')
  @ApiOperation({ summary: 'Subject detail with chapters' })
  getSubject(@Param('id') id: string) {
    return this.curriculumService.getSubject(id);
  }

  @Get('chapters/:id')
  @ApiOperation({ summary: 'Chapter detail with topics' })
  getChapter(@Param('id') id: string) {
    return this.curriculumService.getChapter(id);
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Topic detail' })
  getTopic(@Param('id') id: string) {
    return this.curriculumService.getTopic(id);
  }

  @Get('topics/:id/content')
  @ApiOperation({ summary: 'Published structured content for a topic' })
  getTopicContent(@Param('id') id: string) {
    return this.curriculumService.getTopicContent(id);
  }
}