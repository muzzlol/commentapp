import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class FindRepliesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  offset = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class EditCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}