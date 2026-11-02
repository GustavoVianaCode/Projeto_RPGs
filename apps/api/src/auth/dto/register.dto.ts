import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;
}
