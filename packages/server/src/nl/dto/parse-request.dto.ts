import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ParseRequestDto {
  @IsString()
  @IsNotEmpty()
  inputText!: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
