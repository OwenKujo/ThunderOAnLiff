import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AttendanceService } from '../attendance/attendance.service';

interface LineWebhookEvent {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  postback?: { data?: string };
}
type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('line integration')
@Controller('line/webhook')
export class LineWebhookController {
  private readonly logger = new Logger(LineWebhookController.name);
  constructor(private readonly config: ConfigService, private readonly attendance: AttendanceService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive signed LINE Messaging API webhook events' })
  async handle(
    @Req() request: RawBodyRequest,
    @Headers('x-line-signature') signature?: string,
  ) {
    const secret = this.config.get<string>('LINE_CHANNEL_SECRET');
    if (!secret) throw new UnauthorizedException('LINE webhook is not configured.');
    if (!signature || !request.rawBody) throw new UnauthorizedException('Missing LINE signature or raw body.');

    const expected = createHmac('sha256', secret).update(request.rawBody).digest('base64');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new UnauthorizedException('LINE webhook signature is invalid.');
    }

    const body = request.body as { events?: LineWebhookEvent[] };
    for (const event of body.events ?? []) {
      if (event.type !== 'postback' || !event.postback?.data || !event.source?.userId) continue;
      const data = new URLSearchParams(event.postback.data);
      if (data.get('action') !== 'checkin') continue;
      const bookingId = data.get('bookingId');
      if (!bookingId) continue;
      try {
        const result = await this.attendance.checkInFromLine(bookingId, event.source.userId);
        await this.reply(event.replyToken, result.alreadyCheckedIn ? 'คุณเช็คอินคลาสนี้แล้ว ✅' : 'เช็คอินสำเร็จ แล้วพบกันในคลาสครับ ✅');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ไม่สามารถเช็คอินได้ กรุณาติดต่อแอดมิน';
        this.logger.warn(`LINE check-in rejected for booking ${bookingId}: ${message}`);
        await this.reply(event.replyToken, this.toUserMessage(message));
      }
    }
    return { ok: true };
  }

  private async reply(replyToken: string | undefined, text: string) {
    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (!replyToken || !token) return;
    try {
      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: text.slice(0, 1000) }] }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.logger.warn(`Could not reply to LINE webhook: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private toUserMessage(message: string) {
    if (message.includes('No booking')) return 'ไม่พบรายการจองที่ผูกกับบัญชี LINE นี้ กรุณาตรวจสอบบัญชีหรือแจ้งแอดมิน';
    if (message.includes('not active')) return 'บัญชีสมาชิกยังไม่พร้อมใช้งาน กรุณาติดต่อแอดมิน';
    if (message.includes('available from')) return 'ยังไม่อยู่ในช่วงเวลาเช็คอิน กรุณาลองอีกครั้งใกล้เวลาเรียน';
    return 'เช็คอินไม่สำเร็จ กรุณาตรวจสอบการจองหรือติดต่อแอดมิน';
  }
}
