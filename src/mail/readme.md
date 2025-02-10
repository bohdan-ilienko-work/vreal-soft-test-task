# MailModule

## Overview

The MailModule provides email sending capabilities for NestJS applications. Built on top of the [@nestjs-modules/mailer](https://github.com/nest-modules/mailer) package, it supports sending emails with both plain text and HTML content, along with file attachments. Configuration is streamlined using environment variables through [@nestjs/config](https://docs.nestjs.com/techniques/configuration).

## Features

- **Email Sending**: Send emails with both text and HTML content.
- **Attachments**: Easily include file attachments in your emails.
- **Flexible Configuration**: Configure SMTP settings via environment variables.
- **Seamless NestJS Integration**: Asynchronously initialize and integrate into your NestJS application.

## Requirements

- **Node.js**: Version 12 or higher.
- **NestJS**: Ensure you have a working NestJS application.
- **Dependencies**:
  - `@nestjs-modules/mailer`
  - `@nestjs/config`
  - `nodemailer`

## Installation

Install the required dependencies using npm:

```bash
npm install @nestjs-modules/mailer nodemailer @nestjs/config
```
