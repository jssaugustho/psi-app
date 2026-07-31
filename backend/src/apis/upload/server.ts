import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../shared/db';
import { verifyUserJwt } from '../../shared/auth';
import { z } from 'zod';

dotenv.config();

const port = Number(process.env.PORT) || 5001;

const fastify = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// Registrar suporte a multipart/form-data (uploads de até 15MB)
fastify.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });

// Registrar suporte a CORS para o frontend Next.js
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-secret'],
});

// Rota de Healthcheck básica
fastify.get('/health', async () => {
  return { status: 'Ok', message: 'Upload & Optimization API active.' };
});

const UploadQuerySchema = z.object({
  type: z.enum(['avatar', 'logo', 'icon']).default('avatar'),
});

// Rota de Upload e Otimização
fastify.post('/upload', {
  schema: {
    querystring: UploadQuerySchema,
  }
}, async (request, reply) => {
  try {
    // 1. Validar Autenticação JWT
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT ausente.' });
    }
    
    try {
      verifyUserJwt(authHeader.split(' ')[1]);
    } catch (err: any) {
      return reply.status(401).send({ error: 'Não autorizado', message: 'Token JWT inválido ou expirado.' });
    }

    // 2. Extrair o arquivo multipart
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Requisição inválida', message: 'Nenhum arquivo enviado.' });
    }

    // 3. Buscar credenciais do R2 no banco
    const settings = await db.query.platformSettings.findFirst();
    if (
      !settings ||
      !settings.cloudflareAccountId ||
      !settings.r2BucketName ||
      !settings.r2AccessKeyId ||
      !settings.r2SecretAccessKey
    ) {
      return reply.status(400).send({
        error: 'R2 Não Configurado',
        message: 'As credenciais do Cloudflare R2 ainda não foram salvas na plataforma.',
      });
    }

    const { type } = request.query;
    const buffer = await data.toBuffer();
    let processedBuffer: Buffer;

    // 4. Otimizar a imagem com Sharp conforme o tipo
    const sharpInstance = sharp(buffer).rotate(); // .rotate() auto-orienta baseado no EXIF

    if (type === 'avatar') {
      processedBuffer = await sharpInstance
        .resize(150, 150, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();
    } else if (type === 'logo') {
      processedBuffer = await sharpInstance
        .resize(400, 400, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } else { // icon
      processedBuffer = await sharpInstance
        .resize(64, 64, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 90 })
        .toBuffer();
    }

    // 5. Configurar nome único e chave do R2
    const filenameBase = data.filename.split('.').slice(0, -1).join('.') || 'image';
    const cleanFilename = filenameBase.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileKey = `media/${type}/${cleanFilename}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

    // 6. Subir para o Cloudflare R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${settings.cloudflareAccountId.trim()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: settings.r2AccessKeyId.trim(),
        secretAccessKey: settings.r2SecretAccessKey.trim(),
      },
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: settings.r2BucketName.trim(),
        Key: fileKey,
        Body: processedBuffer,
        ContentType: 'image/webp',
      })
    );

    const publicDomain = settings.r2PublicDomain || `https://${settings.r2BucketName}.${settings.cloudflareAccountId}.r2.cloudflarestorage.com`;
    const publicUrl = `${publicDomain}/${fileKey}`;

    return reply.send({
      url: publicUrl,
      key: fileKey,
      filename: `${cleanFilename}.webp`,
    });
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(500).send({
      error: 'Erro no processamento',
      message: err.message || 'Ocorreu um erro interno ao processar e salvar a imagem.',
    });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Upload & Optimization Service rodando na porta ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
