import { IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value === '' ? undefined : value))
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @Transform(({ value }) => (value === '' ? undefined : value))
  lastName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  avatarUrl?: string;
}
