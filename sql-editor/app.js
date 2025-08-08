
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

// ...existing code...

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'views')));


// Azure Key Vault and SQL config for SQL Authentication
const keyVaultName = 'hjdb85-key-vault';
const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const secretClient = new SecretClient(keyVaultUrl, credential);

let sqlConfig = null;

async function loadSqlConfig() {
  // Fetch hjappuser password from Key Vault (store as 'hjappuser-password')
  const secret = await secretClient.getSecret('hjappuser-password');
  sqlConfig = {
    user: 'hjappuser',
    password: secret.value,
    server: 'hjsqlvm85', // or use the private IP or DNS name of your SQL Server VM
    database: 'hjsqleditor', // update if your DB name is different
    options: {
      encrypt: false, // set to true for Azure SQL PaaS, false for SQL VM
      trustServerCertificate: true
    }
  };
}

// Load secrets before starting the server
loadSqlConfig().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`SQL Editor app listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to load SQL credentials from Key Vault:', err);
  process.exit(1);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


app.post('/query', async (req, res) => {
  const query = req.body.sqlquery;
  let resultHtml = '';
  try {
    if (!sqlConfig) throw new Error('SQL config not loaded');
    await sql.connect(sqlConfig);
    const result = await sql.query(query);
    resultHtml += '<table border="1"><tr>';
    if (result.recordset.length > 0) {
      Object.keys(result.recordset[0]).forEach(col => {
        resultHtml += `<th>${col}</th>`;
      });
      resultHtml += '</tr>';
      result.recordset.forEach(row => {
        resultHtml += '<tr>';
        Object.values(row).forEach(val => {
          resultHtml += `<td>${val}</td>`;
        });
        resultHtml += '</tr>';
      });
    } else {
      resultHtml += '<tr><td>No results</td></tr>';
    }
    resultHtml += '</table>';
  } catch (err) {
    resultHtml = `<pre>Error: ${err.message}</pre>`;
  }
  res.send(`
    <a href="/">Back</a>
    <h2>Query Results</h2>
    ${resultHtml}
  `);
});

// ...existing code...
