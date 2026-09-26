import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  PaperExamType,
  ArchiveQuestionState,
  MappingStatus,
  ArchiveStatus,
} from '@prisma/client';

const EXAM_TYPES = Object.values(PaperExamType);
const QUESTION_STATES = Object.values(ArchiveQuestionState);
const MAPPING_STATUSES = Object.values(MappingStatus);
const ARCHIVE_STATUSES = Object.values(ArchiveStatus);

export class ListPapersDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsIn(EXAM_TYPES) examType?: PaperExamType;
  @IsOptional() @IsIn(ARCHIVE_STATUSES) processingStatus?: ArchiveStatus;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export class ListArchiveQuestionsDto {
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() paperId?: string;
  @IsOptional() @IsIn(EXAM_TYPES) examType?: PaperExamType;
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @IsIn(QUESTION_STATES) state?: ArchiveQuestionState;
  @IsOptional() @IsIn(MAPPING_STATUSES) mappingStatus?: MappingStatus;
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsIn(['true', 'false']) imported?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export class ListRevisionsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}