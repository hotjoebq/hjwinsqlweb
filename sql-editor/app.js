const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'views')));

// Update these values for your Azure SQL connection
const config = {
  user: 'sqladmin',
  password: 'SWauge11!114',
  //server: 'hjdb85-sql-server.database.windows.net', // this is using public endpoint
  server: 'hjdb85-sql-server.hjdb85.internal'  //this is using private endpoint
  database: 'hjdb85-sql-db',
  options: {
    encrypt: true,
    //The servers's certificate only covers public endpoint, so we need to trust the server certificate
    //trustServerCertificate: false
    trustServerCertificate: true
  }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/query', async (req, res) => {
  const query = req.body.sqlquery;
  let resultHtml = '';
  try {
    await sql.connect(config);
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`SQL Editor app listening on port ${port}`);
});
