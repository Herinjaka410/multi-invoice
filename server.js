require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const PORT = 5000;

// Configuration AWS S3 v3
const s3Client = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Dossier de stockage local
const FILES_DIR = path.join(__dirname, 'public', 's3bucket');

// Vérification/Création du dossier
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

// Route pour la synchronisation S3 (version SDK v3)
app.post('/api/sync-s3', async (req, res) => {
  try {
    const s3Params = {
      Bucket: 'photonasync-datcorp',
      Prefix: 'data/768327198/'
    };

    const command = new ListObjectsV2Command(s3Params);
    const s3Data = await s3Client.send(command);

    if (!s3Data.Contents || s3Data.Contents.length === 0) {
      return res.status(404).json({ success: false, message: 'Aucun fichier trouvé sur S3' });
    }

    const downloadPromises = s3Data.Contents
      .filter(item => /\.(pdf|jpg|jpeg|png)$/i.test(item.Key))
      .map(async item => {
        const fileName = path.basename(item.Key);
        const localPath = path.join(FILES_DIR, fileName);

        if (!fs.existsSync(localPath)) {
          const getObjectCommand = new GetObjectCommand({
            Bucket: s3Params.Bucket,
            Key: item.Key
          });

          const response = await s3Client.send(getObjectCommand);
          const fileData = await streamToBuffer(response.Body);
          fs.writeFileSync(localPath, fileData);
          return { name: fileName, status: 'downloaded' };
        }
        return { name: fileName, status: 'already_exists' };
      });

    const results = await Promise.all(downloadPromises);
    const newFiles = results.filter(r => r.status === 'downloaded');

    res.json({
      success: true,
      message: `Synchronisation réussie. ${newFiles.length} nouveaux fichiers.`,
      details: results
    });

  } catch (error) {
    console.error('Erreur de synchronisation S3:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la synchronisation',
      error: error.message
    });
  }
});

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Route pour lister les fichiers locaux
app.get('/api/files', (req, res) => {
  try {
    fs.readdir(FILES_DIR, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return res.status(500).json({ error: 'Unable to scan directory' });
      }

      const fileDetails = files
        .filter(file => /\.(pdf|jpg|jpeg|png)$/i.test(file))
        .map(file => {
          const filePath = path.join(FILES_DIR, file);
          const stats = fs.statSync(filePath);
          
          return {
            name: file,
            path: `/s3bucket/${file}`,
            type: path.extname(file).substring(1).toLowerCase(),
            size: stats.size,
            lastModified: stats.mtime,
            date: stats.mtime.toISOString().split('T')[0]
          };
        });

      res.json(fileDetails);
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour générer une URL signée (exemple)
app.get('/api/signed-url', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Key parameter is required' });
    }

    const command = new GetObjectCommand({
      Bucket: 'photonasync-datcorp',
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

// Servir les fichiers statiques
app.use('/s3bucket', express.static(FILES_DIR));

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`S3 files directory: ${FILES_DIR}`);
  console.log('AWS SDK v3 is being used');
});
