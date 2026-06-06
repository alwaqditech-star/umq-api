import { IsNumber, IsOptional, IsString, MinLength } from "class-validator";

export class CategoryDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  nameAr!: string;

  @IsString()
  @MinLength(1)
  nameEn!: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
