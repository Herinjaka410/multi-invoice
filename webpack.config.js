const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "os": false
    }
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader',
        type: 'javascript/auto',
        options: {
          schema: false // Désactive la validation du schéma
        }
      }
    ]
  }
};
