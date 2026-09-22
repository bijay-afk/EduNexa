import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Sita Sharma' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ enum: ['STUDENT', 'TEACHER'], default: 'STUDENT' })
  @IsIn(['STUDENT', 'TEACHER'])
  role: 'STUDENT' | 'TEACHER' = 'STUDENT';
}