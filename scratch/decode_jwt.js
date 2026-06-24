const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dnBkbHBkanpqaW1kenppa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM3MTYsImV4cCI6MjA5NzU0OTcxNn0.2c1EJsQlslYPcHFeP7ckMNEc8UUA1xg0o6FzcvktlY0';
const payload = token.split('.')[1];
const decoded = Buffer.from(payload, 'base64').toString('utf8');
console.log('Decoded JWT payload:', JSON.parse(decoded));
