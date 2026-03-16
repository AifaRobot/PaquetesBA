import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';

export class UsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
