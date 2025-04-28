import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AWS from 'aws-sdk';
import './MainPage.css';

const MainPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processedFiles, setProcessedFiles] = useState([]);
  const [availableDates, setAvailableDates] = useState(['Toutes les dates']);
  const [selectedDate, setSelectedDate] = useState('Toutes les dates');
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

     
  const s3 = new AWS.S3({
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
    region: process.env.REACT_APP_AWS_REGION,
    signatureVersion: 'v4'
  });

  const loadRealLocalFiles = async () => {
    try {
      // Solution 1: Pour développement avec Create React App (fichiers dans public/s3bucket)
     /* const response = await fetch('/s3bucket/list.json'); // Créez ce fichier manuellement
      const files = await response.json();
      */
      // Solution 2: Pour Electron ou environnement Node.js (accès direct au filesystem)
       
      const fs = window.require('fs');
      const path = window.require('path');
      const files = fs.readdirSync('C:/s3bucket')
        .filter(name => name.match(/\.(pdf|jpg|jpeg|png)$/i))
        .map(name => ({
          key: `local_${name}`,
          name,
          date: new Date().toISOString().split('T')[0],
          type: name.endsWith('.pdf') ? 'pdf' : 'image',
          local: true,
          url: `/s3bucket/${name}`
        }));
      
      
      setLocalFiles(files);
    } catch (error) {
      console.error("Erreur lecture fichiers locaux:", error);
      // Fallback aux fichiers mock
      setLocalFiles([
        { 
          key: 'local_1.pdf', 
          name: 'facture.pdf', 
          date: '2025-01-15', 
          type: 'pdf', 
          local: true,
          url: '/s3bucket/facture.pdf'
        }
      ]);
    }
  };

  useEffect(() => {
    loadRealLocalFiles();
    const savedProcessedFiles = JSON.parse(localStorage.getItem('processedFiles')) || [];
    setProcessedFiles(savedProcessedFiles);
    loadLocalFiles();
    loadS3Files(); // Conserver pour compatibilité
  }, []);

  const loadLocalFiles = async () => {
    try {
      // Simuler la lecture du dossier local C:\s3bucket
      const mockLocalFiles = [
        { 
          key: 'local_1.pdf', 
          name: '9df88234-dd1e-4db3-b7c1-d20c0610817b.pdf', 
          date: '2025-01-15', 
          type: 'pdf', 
          local: true,
          url: '/s3bucket/9df88234-dd1e-4db3-b7c1-d20c0610817b.pdf' // Chemin relatif public
        },
        { 
          key: 'local_2.jpg', 
          name: 'image_2025_03_18T08_02_44_823Z.png', 
          date: '2025-01-16', 
          type: 'image', 
          local: true,
          url: '/s3bucket/image_2025_03_18T08_02_44_823Z.png'
        },
        // Ajoutez d'autres fichiers de test selon besoin
      ];
      setLocalFiles(mockLocalFiles);
      updateAvailableDates(mockLocalFiles);
    } catch (error) {
      console.error("Erreur chargement local:", error);
    }
  };
  const loadS3Files = async () => {
    try {
      if (process.env.REACT_APP_USE_S3 === 'false') {
        setIsLoading(false);
        return;
      }
  
      const dateFolders = await s3.listObjectsV2({
        Bucket: 'photonasync-datcorp',
        Prefix: 'data/768327198/',
        Delimiter: '/'
      }).promise();
  
      const dates = dateFolders.CommonPrefixes.map(folder => {
        const parts = folder.Prefix.split('/');
        return parts[parts.length - 2];
      }).filter(Boolean);
  
      setAvailableDates(prev => [...new Set([...prev, ...dates])]);
  
      const s3Files = await Promise.all(
        dateFolders.CommonPrefixes.flatMap(async folder => {
          const filesData = await s3.listObjectsV2({
            Bucket: 'photonasync-datcorp',
            Prefix: folder.Prefix
          }).promise();
  
          return filesData.Contents
            .filter(item => item.Key.match(/\.(pdf|jpg|jpeg|png)$/i))
            .map(item => ({
              key: item.Key,
              name: item.Key.split('/').pop(),
              date: folder.Prefix.split('/').slice(-2)[0],
              type: item.Key.endsWith('.pdf') ? 'pdf' : 'image',
              local: false,
              url: s3.getSignedUrl('getObject', {
                Bucket: 'photonasync-datcorp',
                Key: item.Key,
                Expires: 3600
              })
            }));
        })
      );
  
      setFiles(s3Files.flat());
    } catch (error) {
      console.error("Erreur S3:", error);
      setFiles([]); // Retourner un tableau vide en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailableDates = (newFiles) => {
    const newDates = newFiles.map(file => file.date);
    setAvailableDates(prev => [...new Set([...prev, ...newDates])]);
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files).map(file => ({
      key: `local_${Date.now()}_${file.name}`,
      name: file.name,
      date: new Date().toISOString().split('T')[0],
      type: file.type.includes('pdf') ? 'pdf' : 'image',
      local: true,
      url: URL.createObjectURL(file) // Crée une URL locale
    }));

    setLocalFiles(prev => [...prev, ...uploadedFiles]);
    updateAvailableDates(uploadedFiles);
  };

  const handleStartWork = () => {
    if (selectedFile) {
      navigate('/work', { 
        state: { 
          selectedFile: {
            ...selectedFile,
            // Assurez-vous que ces champs existent
            name: selectedFile.name,
            url: selectedFile.local 
              ? selectedFile.url 
              : s3.getSignedUrl('getObject', {
                  Bucket: 'photonasync-datcorp',
                  Key: selectedFile.key,
                  Expires: 3600
                }),
            type: selectedFile.type
          }
        } 
      });
    }
  };

  const filteredFiles = [...files, ...localFiles]
    .filter(file => selectedDate === 'Toutes les dates' || file.date === selectedDate)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="photen-container">
      <div className="sidebar">
        <h1>PHOTEN</h1>
        
        <div className="file-controls">
          <h2>Filename</h2>
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-selector"
          >
            {availableDates.map((date, index) => (
              <option key={index} value={date}>{date}</option>
            ))}
          </select>
        </div>

        <label className="upload-local-btn">
          Ajouter fichiers locaux
          <input 
            type="file" 
            multiple 
            accept=".pdf,.jpg,.jpeg,.png" 
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>

        {isLoading ? (
          <p>Chargement...</p>
        ) : (
          <div className="file-list-container">
            {filteredFiles.map((file) => (
              <div 
                key={file.key}
                className={`file-item ${selectedFile?.key === file.key ? 'selected' : ''} ${processedFiles.includes(file.key) ? 'processed' : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <div className="file-meta">
                    <span className="file-date">{file.date}</span>
                    <span className={`file-type ${file.type}`}>{file.type}</span>
                    {file.local && <span className="local-badge">Local</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="main-content">
        <div className="action-buttons">
          <button 
            onClick={handleStartWork}
            disabled={!selectedFile}
            className="primary-button"
          >
            Start Work
          </button>
          <button className="secondary-button">View Details</button>
          <button className="secondary-button">Export</button>
        </div>
        
        <div className="upload-section">
          <h2>Uploaded Ad (PT)</h2>
          {/* Timestamps ici */}
        </div>
      </div>
    </div>
  );
};
export default MainPage;
