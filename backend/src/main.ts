import * as dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
    dotenv.config();
    const app = await NestFactory.create(AppModule, { logger: new Logger() });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: false,
        }),
    );

    const config = new DocumentBuilder()
        .setTitle("MediaMTX Stream Sync API")
        .setDescription("Syncs stream inventories between ingest and cluster MediaMTX")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
    Logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
