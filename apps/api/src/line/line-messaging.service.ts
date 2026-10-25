import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Keep the LINE payload boundary small and JSON-oriented; the provider owns API-specific message shapes.
type LineMessage = Record<string, unknown>;

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendTextToTrainee(input: {
    traineeId: string;
    type: NotificationType;
    message: string;
    bookingId?: string;
  }): Promise<void> {
    await this.sendToTrainee({
      ...input,
      messages: [{ type: 'text', text: input.message }],
      logPayload: { kind: 'text', message: input.message },
    });
  }

  async sendBookingConfirmationToTrainee(input: {
    traineeId: string;
    bookingId: string;
    classTitle: string;
    startsAt: Date;
    trainerName: string;
  }): Promise<void> {
    const localDate = input.startsAt.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short',
    });
    const data = new URLSearchParams({ action: 'checkin', bookingId: input.bookingId }).toString();
    const altText = `จองคลาส ${input.classTitle} วันที่ ${localDate} เรียบร้อยแล้ว`;
    const message: LineMessage = {
      type: 'flex',
      altText: altText.slice(0, 400),
      contents: {
        type: 'bubble',
        body: {
          type: 'box', layout: 'vertical', spacing: 'md',
          contents: [
            { type: 'text', text: 'จองคลาสสำเร็จ', weight: 'bold', size: 'xl', color: '#C2410C' },
            { type: 'text', text: input.classTitle, weight: 'bold', size: 'lg', wrap: true },
            { type: 'text', text: `${localDate} · ${input.trainerName}`, size: 'sm', color: '#475467', wrap: true },
            { type: 'text', text: 'เมื่อถึงเวลาเรียน กดปุ่มด้านล่างเพื่อยืนยันการเข้าเรียน (เช็คอินได้ตั้งแต่ 30 นาทีก่อนเริ่มคลาส)', size: 'sm', color: '#667085', wrap: true },
          ],
        },
        footer: {
          type: 'box', layout: 'vertical', spacing: 'sm',
          contents: [{
            type: 'button', style: 'primary', color: '#C2410C', height: 'md',
            action: { type: 'postback', label: 'Check in / เช็คชื่อ', data, displayText: 'ยืนยันว่ามาถึงคลาสแล้ว' },
          }],
        },
      },
    };
    await this.sendToTrainee({
      traineeId: input.traineeId,
      bookingId: input.bookingId,
      type: NotificationType.BOOKING_CONFIRMATION,
      messages: [message],
      logPayload: { kind: 'booking-confirmation-flex', classTitle: input.classTitle, startsAt: input.startsAt.toISOString() },
    });
  }

  private async sendToTrainee(input: {
    traineeId: string;
    bookingId?: string;
    type: NotificationType;
    messages: LineMessage[];
    logPayload: unknown;
  }): Promise<void> {
    const account = await this.prisma.lineAccount.findFirst({
      where: { traineeId: input.traineeId, status: 'active' },
      select: { lineUserId: true },
    });
    const token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    const log = await this.prisma.notificationLog.create({
      data: {
        traineeId: input.traineeId,
        bookingId: input.bookingId,
        type: input.type,
        channel: NotificationChannel.LINE_OA,
        status: !token || !account ? 'skipped' : 'queued',
        payload: JSON.stringify(input.logPayload),
      },
    });

    if (!token || !account) return;
    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: account.lineUserId, messages: input.messages }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        const details = await response.text().catch(() => 'LINE Messaging API request failed');
        throw new Error(`LINE Messaging API ${response.status}: ${details.slice(0, 300)}`);
      }
      await this.prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'sent', sentAt: new Date() } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LINE messaging error';
      this.logger.warn(`LINE notification failed (${log.id}): ${message}`);
      await this.prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'failed', error: message } }).catch(() => undefined);
    }
  }
}
