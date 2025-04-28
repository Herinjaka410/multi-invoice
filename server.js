const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration des dossiers
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, '../public');
const S3BUCKET_DIR = path.join(PUBLIC_DIR, 's3bucket');

// Création des dossiers s'ils n'existent pas
[DATA_DIR, PUBLIC_DIR, S3BUCKET_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware pour servir les fichiers statiques
app.use('/s3bucket', express.static(S3BUCKET_DIR));

// API Routes

// Route pour lister les fichiers locaux
app.get('/api/local-files', (req, res) => {
  try {
    fs.readdir(S3BUCKET_DIR, (err, files) => {
      if (err) {
        console.error('Erreur lecture dossier:', err);
        return res.status(500).json({ error: 'Erreur de lecture du dossier' });
      }

      const validFiles = files.filter(file => 
        /\.(pdf|jpg|jpeg|png)$/i.test(file)
      );

      const fileDetails = validFiles.map(file => {
        const filePath = path.join(S3BUCKET_DIR, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
          type: file.endsWith('.pdf') ? 'pdf' : 'image'
        };
      });

      res.json(fileDetails);
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour uploader des fichiers
app.post('/api/upload', (req, res) => {
  // Implémentation à ajouter si nécessaire
  res.status(501).json({ message: 'Endpoint à implémenter' });
});

// Gestion des factures (existante)
app.post('/api/invoices', (req, res) => {
  try {
    if (!req.body.invoiceNumber) {
      return res.status(400).json({ error: 'Le numéro de facture est requis' });
    }

    const invoiceData = {
      ...req.body,
      submittedAt: new Date().toISOString(),
      status: 'pending_verification'
    };

    const fileName = `invoice_${invoiceData.invoiceNumber}_${Date.now()}.json`;
    fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(invoiceData, null, 2));

    res.status(201).json({
      message: 'Facture enregistrée avec succès',
      invoiceId: fileName.replace('.json', '')
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour la vérification (accès réservé)
app.get('/api/invoices/:id', (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath));
      res.json(data);
    } else {
      res.status(404).json({ error: 'Facture non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trouvé' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err.stack);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur backend en cours d'exécution sur http://localhost:${PORT}`);
  console.log(`Dossier S3Bucket: ${S3BUCKET_DIR}`);
});