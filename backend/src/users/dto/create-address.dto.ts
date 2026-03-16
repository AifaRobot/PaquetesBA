import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  label: string;

  @IsString()
  street: string;

  @IsString()
  streetNumber: string;

  @IsOptional()
  @IsString()
  apartment?: string;

  @IsString()
  city: string;

  @IsString()
  province: string;

  @IsString()
  postalCode: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
