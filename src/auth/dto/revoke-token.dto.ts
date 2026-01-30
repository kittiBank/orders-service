import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RevokeTokenDto {
  @ApiProperty({
    description: 'The access token to revoke',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Optional reason for revoking the token',
    example: 'Security breach',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
