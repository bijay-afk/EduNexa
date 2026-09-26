import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ArrayMinSize,
} from 'class-validator';

const questionTypes = [
  'MCQ',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'FILL_IN_BLANK',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'NUMERICAL',
  'MATCHING',
  'ORDERING',
] as const;

export class UpdateQuestionDto {
  @IsOptional()
  @IsIn(questionTypes)
  questionType?: (typeof questionTypes)[number];

  @IsOptional()
  @IsObject()
  question?: { content: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctAnswer?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  explanation?: string;

  @IsOptional()
  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  marks?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hint?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}