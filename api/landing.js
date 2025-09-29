const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    // Ler o arquivo HTML
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Servir o HTML
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error('Error serving landing page:', error);
    res.status(500).send('Error loading page');
  }
};
