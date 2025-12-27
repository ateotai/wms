const jwt = require('jsonwebtoken');
const secret = process.env.APP_JWT_SECRET || 'change_me_in_prod';
const token = jwt.sign({ 
  id: 'admin_test_id', 
  email: 'admin@test.com', 
  role: 'ADMIN', 
  full_name: 'Admin Test' 
}, secret, { expiresIn: '1h' });
console.log(token);
