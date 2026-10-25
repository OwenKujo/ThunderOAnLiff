import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LineSessionDto } from './dto/line-session.dto';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('admin/login')
  @ApiOperation({ summary: 'Sign in to the Admin Web' })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Post('line/session')
  @ApiOperation({ summary: 'Verify a LINE ID token and issue a short-lived application session' })
  lineSession(@Body() input: LineSessionDto) {
    return this.auth.createLineSession(input.idToken);
  }
}
