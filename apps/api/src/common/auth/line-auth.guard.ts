import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type LineAuthenticatedRequest = Request & { lineUserId?: string };

@Injectable()
export class LineAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<LineAuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('A valid application session is required.');
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string; type?: string }>(token);
      if (payload.type !== 'trainee' || !payload.sub) throw new Error('Invalid trainee session.');
      request.lineUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Your session is invalid or expired. Reopen the LIFF app to sign in again.');
    }
  }
}
