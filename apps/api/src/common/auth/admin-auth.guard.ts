import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

export interface AdminPrincipal {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER';
}

type AuthenticatedRequest = Request & { admin?: AdminPrincipal };

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Admin authentication is required.');
    }

    let payload: { sub?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub?: string; type?: string }>(token);
    } catch {
      throw new UnauthorizedException('Your session is invalid or expired. Please sign in again.');
    }
    if (payload.type !== 'admin' || !payload.sub) {
      throw new UnauthorizedException('Invalid admin session.');
    }

    // Keep the database lookup outside the JWT catch so outages are surfaced as server errors, not misleading 401s.
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!admin?.isActive) throw new UnauthorizedException('Admin account is inactive.');
    request.admin = { id: admin.id, email: admin.email, role: admin.role };
    return true;
  }
}
