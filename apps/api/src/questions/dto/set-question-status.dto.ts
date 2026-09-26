import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const statuses = ['DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;

export class SetQuestionStatusDto {
  @IsIn(statuses)
  status!: (typeof statuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}