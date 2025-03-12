import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import formidable from 'formidable';
import type { Request } from 'express';
import { createReadStream } from 'fs';

export async function saveFile(file: formidable.File, destPath: string): Promise<void> {
  // Verzeichnis erstellen, falls es nicht existiert
  await mkdir(dirname(destPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const stream = createWriteStream(destPath);
    const readStream = createReadStream(file.filepath);

    stream.on('finish', resolve);
    stream.on('error', reject);

    readStream.pipe(stream);
  });
}

export function parseMultipartForm(req: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ 
    maxFileSize: 2 * 1024 * 1024, // 2MB
    filter: (part) => {
      return part.mimetype?.startsWith('image/') || false;
    }
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}