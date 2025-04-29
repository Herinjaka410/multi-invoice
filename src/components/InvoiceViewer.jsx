import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './InvoiceViewer.css';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const InvoiceViewer = ({ fileUrl, fileName, fileType }) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [displayUrl, setDisplayUrl] = useState('');
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const pdfContainerRef = useRef(null);

  useEffect(() => {
    setPdfLoadError(false);
    
    if (!fileUrl) {
      setDisplayUrl('');
      return;
    }

    const prepareUrl = (url) => {
      // Pour les PDF, on utilise l'URL directement
      return url;
    };

    if (fileUrl.startsWith('/') || fileUrl.startsWith('http') || fileUrl.startsWith('blob')) {
      setDisplayUrl(prepareUrl(fileUrl));
    } else if (fileUrl instanceof Blob) {
      const objectUrl = URL.createObjectURL(fileUrl);
      setDisplayUrl(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [fileUrl, fileType]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfLoadError(true);
  };

  const changePage = (offset) => {
    setPageNumber(prevPageNumber => Math.max(1, Math.min(prevPageNumber + offset, numPages)));
  };

  const renderPdfViewer = () => {
    return (
      <div className="pdf-viewer-container">
        <Document
          file={displayUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div>Chargement du PDF...</div>}
          error={<div>Erreur de chargement du PDF</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            width={pdfContainerRef.current?.clientWidth * (zoomLevel / 100)}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
        {numPages > 1 && (
          <div className="pdf-navigation">
            <button 
              onClick={() => changePage(-1)} 
              disabled={pageNumber <= 1}
            >
              Précédent
            </button>
            <span>
              Page {pageNumber} sur {numPages}
            </span>
            <button 
              onClick={() => changePage(1)} 
              disabled={pageNumber >= numPages}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="invoice-viewer-container">
      {displayUrl ? (
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
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            {fileType === 'pdf' ? (
              pdfLoadError ? (
                <div className="pdf-error">
                  <p>Impossible d'afficher le PDF.</p>
                  <a 
                    href={displayUrl} 
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
                src={displayUrl} 
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
