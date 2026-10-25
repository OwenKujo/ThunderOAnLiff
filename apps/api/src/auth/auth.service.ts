import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LineIdentityService } from '../line/line-identity.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly lineIdentity: LineIdentityService,
  ) {}

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Use the same password-hash operation for unknown users to reduce account enumeration timing differences.
    const validPassword = await compare(
      input.password,
      admin?.passwordHash ?? '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    ).catch(() => false);

    if (!admin || !admin.isActive || !validPassword) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: admin.id, type: 'admin', role: admin.role },
      { expiresIn: this.config.get<string>('ADMIN_SESSION_TTL', '8h') as JwtSignOptions['expiresIn'] },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('ADMIN_SESSION_TTL', '8h'),
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  }

  async createLineSession(idToken: string) {
    const identity = await this.lineIdentity.verifyIdToken(idToken);
    const expiresInSeconds = 60 * 60;
    const accessToken = await this.jwt.signAsync(
      { sub: identity.lineUserId, type: 'trainee' },
      { expiresIn: expiresInSeconds },
    );
    return { accessToken, tokenType: 'Bearer', expiresIn: expiresInSeconds };
  }
}
