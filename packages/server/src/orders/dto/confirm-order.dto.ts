import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class ConfirmOrderDto {
  @IsEnum(['DINE_IN', 'TAKE_OUT'])
  orderType!: 'DINE_IN' | 'TAKE_OUT';

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmOrderItemDto)
  items!: ConfirmOrderItemDto[];
}

export class ConfirmOrderItemDto {
  @IsString()
  @IsNotEmpty()
  sku!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  options?: Record<string, string | number>;
}
