const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 8760;

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(helmet());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const getFilePath = (directory, file) => path.join(__dirname, directory, file);

app.get('/assets/:id/info', async (req, res) => {
  try {
    const filePath = getFilePath(`blockchains/${req.params.id}/info`, 'info.json');
    const result = await fs.readFile(filePath, 'utf-8');
    res.status(200).json({ result: JSON.parse(result) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/assets/:id/image', (req, res) => {
  const filePath = getFilePath(`blockchains/${req.params.id}/info`, 'logo.png');
  res.sendFile(filePath);
});

app.get('/assets/tokens/:network/:address/info', async (req, res) => {
  try {
    const { network, address } = req.params;
    const filePath = getFilePath(`blockchains/${network}/assets/${address.toLowerCase()}`, 'info.json');
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found' });
    }
    const result = await fs.readFile(filePath, 'utf-8');
    const parsedResult = JSON.parse(result);
    parsedResult.isToken = true;
    parsedResult.contractAddress = address.toLowerCase();
    res.status(200).json({ result: parsedResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/assets/tokens/:network/:address/image', (req, res) => {
  const { network, address } = req.params;
  const filePath = getFilePath(`blockchains/${network}/assets/${address}`, 'logo.png');
  res.sendFile(filePath);
});

app.get('/assets/list', async (req, res) => {
  try {
    const directoryPath = path.join(__dirname, 'blockchains');
    const result = await fs.readdir(directoryPath);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/assets/tokens/:network/addresses', async (req, res) => {
  try {
    const { network } = req.params;
    const directoryPath = path.join(__dirname, `blockchains/${network}/assets`);
    const directoryExists = await fs.access(directoryPath).then(() => true).catch(() => false);
    const result = directoryExists ? await fs.readdir(directoryPath) : [];
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    url: req.url,
    status: 'HEALTHY',
  });
});

app.listen(port, () => console.log(`App is running on port ${port}`));
