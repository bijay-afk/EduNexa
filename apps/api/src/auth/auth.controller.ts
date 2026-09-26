import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../ratelimit/rate-limit.decorator';
import { RateLimitGuard } from '../ratelimit/rate-limit.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { registerSchema, loginSchema } from '@edunexa/validation';

@ApiTags('auth')
@Public()
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  @ApiOperation({ summary: 'Register a student or teacher account' })
  register(@Body() dto: RegisterDto) {
    registerSchema.parse(dto);
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @ApiOperation({ summary: 'Login with email + password' })
  login(@Body() dto: LoginDto) {
    loginSchema.parse(dto);
    return this.authService.login(dto);
  }
}