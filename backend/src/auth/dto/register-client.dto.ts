import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterClientDto {
  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;
}
