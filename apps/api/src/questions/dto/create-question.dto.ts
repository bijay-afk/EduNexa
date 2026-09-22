import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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

export class CreateQuestionDto {
  @IsIn(questionTypes)
  questionType!: (typeof questionTypes)[number];

  @IsObject()
  question!: { content: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  correctAnswer!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  explanation?: string;

  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';

  @IsNumber()
  @Min(0.5)
  @Max(50)
  marks: number = 1;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hint?: string;

  @IsString()
  @MinLength(1)
  topicId!: string;
}