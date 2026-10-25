import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface LineVerifyResponse {
  sub?: string;
  aud?: string;
  exp?: number;
  iss?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class LineIdentityService {
  constructor(private readonly config: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<{ lineUserId: string; name?: string; picture?: string }> {
    const channelId = this.config.get<string>('LIFF_CHANNEL_ID');
    if (!channelId) {
      throw new ServiceUnavailableException('LINE Login is not configured on this server.');
    }

    let response: Response;
    try {
      response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException('LINE identity verification is temporarily unavailable.');
    }
    if (!response.ok) {
      throw new UnauthorizedException('LINE ID token is invalid or expired.');
    }

    const identity = (await response.json()) as LineVerifyResponse;
    if (!identity.sub || identity.aud !== channelId || identity.iss !== 'https://access.line.me' || !Number.isFinite(identity.exp)) {
      throw new UnauthorizedException('LINE ID token claims are invalid.');
    }
    if (identity.exp! * 1000 <= Date.now()) {
      throw new UnauthorizedException('LINE ID token has expired.');
    }
    return { lineUserId: identity.sub, name: identity.name, picture: identity.picture };
  }
}
