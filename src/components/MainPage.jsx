import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MainPage.css';

const MainPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState(['Toutes les dates']);
  const [selectedDate, setSelectedDate] = useState('Toutes les dates');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/files');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const formattedFiles = data.map(file => ({
          key: `file_${file.name}_${file.lastModified}`,
          name: file.name,
          date: file.date,
          type: file.type === 'pdf' ? 'pdf' : 'image',
          local: true,
          url: file.path,
          lastModified: new Date(file.lastModified)
        }));

        setFiles(formattedFiles);
        
        // Extraire les dates uniques
        const uniqueDates = [...new Set(formattedFiles.map(file => file.date))];
        setAvailableDates(['Toutes les dates', ...uniqueDates]);
        
      } catch (err) {
        setError(`Failed to load files: ${err.message}`);
        console.error('Error fetching files:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleFileUpload = async (e) => {
    const filesToUpload = Array.from(e.target.files);
    
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        return response.json();
      });

      await Promise.all(uploadPromises);
      // Recharger la liste après upload
      window.location.reload();
    } catch (err) {
      setError(`Upload error: ${err.message}`);
    }
  };

  const handleStartWork = () => {
    if (selectedFile) {
      navigate('/work', { 
        state: { 
          selectedFile: {
            ...selectedFile,
            type: selectedFile.type,
            name: selectedFile.name,
            url: selectedFile.url
          }
        } 
      });
    }
  };

  const filteredFiles = files
    .filter(file => selectedDate === 'Toutes les dates' || file.date === selectedDate)
    .sort((a, b) => b.lastModified - a.lastModified);

  if (error) {
    return (
      <div className="photen-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="photen-container">
      <div className="sidebar">
        <h1>PHOTEN</h1>
        
        <div className="file-controls">
          <h2>Files</h2>
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
          Add Local Files
          <input 
            type="file" 
            multiple 
            accept=".pdf,.jpg,.jpeg,.png" 
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>

        {isLoading ? (
          <div className="loading-spinner">
            <p>Loading files...</p>
          </div>
        ) : (
          <div className="file-list-container">
            {filteredFiles.length === 0 ? (
              <div className="no-files">
                <p>No files found</p>
                <p>Upload files or check your server connection</p>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div 
                  key={file.key}
                  className={`file-item ${selectedFile?.key === file.key ? 'selected' : ''}`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <div className="file-meta">
                      <span className="file-date">{file.date}</span>
                      <span className={`file-type ${file.type}`}>
                        {file.type.toUpperCase()}
                      </span>
                      <span className="local-badge">LOCAL</span>
                    </div>
                  </div>
                </div>
              ))
            )}
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
        
        <div className="file-preview">
          {selectedFile ? (
            <>
              <h2>{selectedFile.name}</h2>
              <div className="file-details">
                <p><strong>Type:</strong> {selectedFile.type}</p>
                <p><strong>Date:</strong> {selectedFile.date}</p>
                <p><strong>Source:</strong> Local</p>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a file to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default MainPage;
