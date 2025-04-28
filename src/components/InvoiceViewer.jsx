import React, { useState, useRef, useEffect } from 'react';
import './InvoiceViewer.css';

const InvoiceViewer = ({ fileUrl, fileName, fileType }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [displayUrl, setDisplayUrl] = useState('');
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const pdfContainerRef = useRef(null);

  useEffect(() => {
    setPdfLoadError(false);
    
    if (!fileUrl) {
      setDisplayUrl('');
      return;
    }

    const preparePdfUrl = (url) => {
      if (fileType === 'pdf') {
        if (url.startsWith('http')) {
          return `${url}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        return url;
      }
      return url;
    };

    if (fileUrl.startsWith('/')) {
      setDisplayUrl(preparePdfUrl(fileUrl));
    } 
    else if (fileUrl.startsWith('http')) {
      setDisplayUrl(preparePdfUrl(fileUrl));
    }
    else if (fileUrl instanceof Blob) {
      const objectUrl = URL.createObjectURL(fileUrl);
      setDisplayUrl(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [fileUrl, fileType]);

  const getSafeUrl = () => {
    if (!displayUrl) return null;
    return displayUrl;
  };

  const safeUrl = getSafeUrl();

  const handlePdfError = () => {
    setPdfLoadError(true);
  };

  const renderPdfViewer = () => {
    // Solution 1: Iframe (meilleure compatibilité)
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <iframe
          src={`${safeUrl}#toolbar=0&navpanes=0`}
          title={`PDF - ${fileName}`}
          style={{
            width: `${zoomLevel}%`,
            height: `${zoomLevel}%`,
            border: 'none',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: '0 0'
          }}
          onError={handlePdfError}
        >
          <div className="pdf-fallback">
            <p>Votre navigateur ne supporte pas l'affichage des PDF.</p>
            <a href={safeUrl} download={fileName || 'document.pdf'}>
              Télécharger le PDF
            </a>
          </div>
        </iframe>
      </div>
    );
  };

  return (
    <div className="invoice-viewer-container">
      {safeUrl ? (
        <>
          <div className="viewer-controls">
            <div className="zoom-controls">
              <button onClick={() => setZoomLevel(prev => Math.max(prev - 10, 50))}>-</button>
              <span>{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(prev => Math.min(prev + 10, 200))}>+</button>
            </div>
            <div className="document-title" title={fileName}>
              {fileName || 'Document sans nom'}
            </div>
          </div>
          <div 
            className="preview-container"
            ref={pdfContainerRef}
            style={{ 
              height: `calc(100vh - 60px)`,
              overflow: 'auto'
            }}
          >
            {fileType === 'pdf' ? (
              pdfLoadError ? (
                <div className="pdf-error">
                  <p>Impossible d'afficher le PDF.</p>
                  <a 
                    href={safeUrl} 
                    download={fileName || 'document.pdf'}
                    className="download-link"
                  >
                    Télécharger le PDF
                  </a>
                </div>
              ) : (
                renderPdfViewer()
              )
            ) : (
              <img 
                src={safeUrl} 
                alt={`Preview - ${fileName}`}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain',
                  display: 'block',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: '0 0'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-error.png';
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="empty-viewer">
          <p>Aucun document sélectionné</p>
          {fileUrl && (
            <p className="error-message">
              Impossible de charger le document: {fileName || 'URL invalide'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceViewer;
