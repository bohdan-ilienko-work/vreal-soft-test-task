import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { MailOptions } from './dto/mail-options.dto';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail({ to, subject, text, html, attachments }: MailOptions) {
    await this.mailerService.sendMail({
      to,
      subject,
      text,
      html,
      attachments,
    });
  }
}
