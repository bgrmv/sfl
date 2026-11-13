import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { AppModule } from './app.module';

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

  // Prefix for endpoonts
  app.setGlobalPrefix('rest');

  // Open API
  const config = new DocumentBuilder()
    .setTitle('SFL docs')
    .setDescription('The SFL API docs')
    .setVersion('1.0')
    // TODO: enable when it will be ready for http / https
    // .setSchemes('https')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('rest', app, document);

  // Cookies
  app.use(cookieParser());

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

  if (configService.getOrThrow('NODE_ENV') === 'production') {
    app.listen(PORT, () => {
      console.log(`Server is running [http][${PORT}]`);
    });
  } else {
    await app.init();

    https.createServer(httpsOptions, server).listen(PORT, () => {
      console.log(`Server is running [https][${PORT}]`);
    });
  }
}
bootstrap();
