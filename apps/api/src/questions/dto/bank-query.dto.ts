import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class BankQueryDto extends PaginationQueryDto {
  /** QuestionStatus filter, e.g. PENDING_REVIEW. */
  @IsOptional()
  @IsString()
  status?: string;

  /** Free-text search over content + tags. */
  @IsOptional()
  @IsString()
  q?: string;
}