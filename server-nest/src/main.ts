import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let httpsOptions;
if (process.env.NODE_ENV === 'production') {
  // Load SSL certificates provided by Azure
  // httpsOptions = {
  //   key: fs.readFileSync('/path/to/azure/key'),
  //   cert: fs.readFileSync('/path/to/azure/cert'),
  // };
} else {
  // Load local SSL certificates for development
  const keyPath = path.resolve(__dirname, '../..', 'ssl', 'key.pem');
  const certPath = path.resolve(__dirname, '../..', 'ssl', 'cert.pem');
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    passphrase: 'sfl.com',
  };
}

async function bootstrap() {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  const configService = app.get(ConfigService);

  const production = configService.getOrThrow('NODE_ENV') === 'production';

  // Behind the reverse proxy (one hop) the client IP comes from X-Forwarded-For;
  // the rate limit counts the real address (S8.11)
  if (production) {
    server.set('trust proxy', 1);
  }

  configureApp(app, { production });

  const [CLIENT_HOSTNAME, CLIENT_PORT] = [
    configService.getOrThrow('CLIENT_HOSTNAME'),
    configService.getOrThrow('CLIENT_PORT'),
  ];

  // Cors
  app.enableCors({
    origin: [CLIENT_HOSTNAME, `${CLIENT_HOSTNAME}:${CLIENT_PORT}`],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  const PORT = configService.getOrThrow('PORT') || 3001;

  if (production) {
    app.listen(PORT, () => {
      new Logger('Bootstrap').log(`Server is running [http][${PORT}]`);
    });
  } else {
    await app.init();

    https.createServer(httpsOptions, server).listen(PORT, () => {
      new Logger('Bootstrap').log(`Server is running [https][${PORT}]`);
    });
  }
}
bootstrap();
