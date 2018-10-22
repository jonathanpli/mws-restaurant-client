const express = require('express'),
  serveStatic = require('serve-static');

const app = express(),
  port = process.env.PORT || 8000;

app.use(serveStatic('public', {index: ['index.html']}));
app.listen(port, () => {
  console.log(`Client server started on port ${port}...`);
});
