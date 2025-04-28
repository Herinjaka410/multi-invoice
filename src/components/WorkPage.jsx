import React from 'react';
import { useLocation } from 'react-router-dom';
import InvoiceViewer from './InvoiceViewer';
import InvoiceForm from './InvoiceForm';
import './WorkPage.css';

const WorkPage = () => {
  const { state } = useLocation();
  const { selectedFile } = state || {};

  // Debug: Vérifiez ce qui est reçu
  console.log("Fichier sélectionné:", selectedFile);

  return (
    <div className="work-container">
      <div className="viewer-panel">
        {selectedFile ? (
          <InvoiceViewer 
            fileUrl={selectedFile.url} 
            fileName={selectedFile.name}
            fileType={selectedFile.type}
          />
        ) : (
          <div className="no-file-selected">
            <p>Aucun fichier sélectionné</p>
          </div>
        )}
      </div>
      <div className="form-panel">
        <InvoiceForm selectedFile={selectedFile} />
      </div>
    </div>
  );
};

export default WorkPage;