const fs = require('fs');
const file = 'controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/res\.status\((.*?)\)\.json\(\{\s*message:(.*?),?\s*token:\s*generateToken\((.*?)\),?\s*user(.*?)\}\);/g, (match, status, msg, userId, rest) => {
  return `res.cookie('token', generateToken(${userId}), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.status(${status}).json({ message:${msg}, user${rest}});`;
});

content = content.replace(/res\.status\((.*?)\)\.json\(\{\s*user(.*?),\s*token:\s*generateToken\((.*?)\)\s*\}\);/g, (match, status, rest, userId) => {
  return `res.cookie('token', generateToken(${userId}), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.status(${status}).json({ user${rest} });`;
});

content = content.replace(/res\.status\((.*?)\)\.json\(\{\s*user(.*?),\s*requiresPasswordSetup:(.*?),\s*tempToken:\s*generateToken\((.*?)\)\s*\}\);/g, (match, status, rest, reqPw, userId) => {
  return `res.cookie('token', generateToken(${userId}), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.status(${status}).json({ user${rest}, requiresPasswordSetup:${reqPw} });`;
});

content = content.replace(/res\.status\((.*?)\)\.json\(\{\s*message:(.*?),?\s*token:\s*generateToken\((.*?)\)\s*\}\);/g, (match, status, msg, userId) => {
  return `res.cookie('token', generateToken(${userId}), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });
      res.status(${status}).json({ message:${msg} });`;
});

fs.writeFileSync(file, content);
console.log('patched');
