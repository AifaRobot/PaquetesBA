import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
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

  @IsString()
  vehicleType: string;

  @IsString()
  licensePlate: string;

  @IsString()
  licenseNumber: string;
}
