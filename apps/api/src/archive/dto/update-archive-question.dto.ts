import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ArchiveQuestionState, MappingStatus, QuestionType } from '@prisma/client';

export class SaveOcrDto {
  @IsString()
  @MinLength(1)
  ocrText!: string;

  @IsOptional() @IsString() @Max(500) reason?: string;
}

export class ApprovePageDto {
  @IsOptional() @IsString() @Max(500) note?: string;
}

export class RejectPageDto {
  @IsString() @MinLength(1) note!: string;
}

export class UpdateArchiveQuestionDto {
  @IsOptional() @IsString() @MinLength(10) sourceText?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(100) marks?: number;
  @IsOptional() @IsIn(Object.values(QuestionType)) questionType?: QuestionType;
  @IsOptional() @IsString() subjectId?: string;
  @IsOptional() @IsString() chapterId?: string;
  @IsOptional() @IsString() topicId?: string;
  @IsOptional() @IsIn(Object.values(MappingStatus)) mappingStatus?: MappingStatus;
  @IsOptional() @IsIn(Object.values(ArchiveQuestionState)) state?: ArchiveQuestionState;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options?: string[];
}

export class ImportArchiveQuestionDto {
  @IsOptional() @IsString() topicId?: string;
}