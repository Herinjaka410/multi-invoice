// src/components/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css'; // Optionnel pour le style

const NotFoundPage = () => {
  return (
    <div className="not-found-container">
      <h1>404 - Page Introuvable</h1>
      <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="home-link">
        Retour à l'accueil
      </Link>
    </div>
  );
};

export default NotFoundPage;
