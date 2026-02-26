// Quick test of redaction logic
const testData = {
  apiKey: 'sk-abc123xyz789supersecrettoken',
  secret: 'my-super-secret-value',
  password: 'hunter2',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  oauth: {
    clientId: 'public-id',
    clientSecret: 'super-secret-oauth-secret',
    refreshToken: 'long-refresh-token-string-here',
  },
  nested: {
    api_key: 'another-secret-key-12345',
    safeField: 'this is fine to show',
  },
  credentials: {
    username: 'admin',
    password: 'correct-horse-battery-staple',
  },
  webhookSecret: 'whsec_1234567890abcdef',
  normalData: 'This should be visible',
};

// Redaction function (copy from main server)
const REDACTION_PATTERNS = [
  /token/i, /secret/i, /api[_-]?key/i, /password/i,
  /cookie/i, /oauth/i, /authorization/i, /bearer/i,
  /auth/i, /credential/i, /private[_-]?key/i,
  /refresh[_-]?token/i, /webhook[_-]?secret/i,
];

function redactSecrets(obj, path = '') {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    const keyLower = path.toLowerCase();
    const isSecretField = REDACTION_PATTERNS.some(p => p.test(keyLower));
    
    if (isSecretField) {
      return obj.length > 4 ? obj.slice(0, 4) + '••••' : '••••';
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item, i) => redactSecrets(item, `${path}[${i}]`));
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (REDACTION_PATTERNS.some(p => p.test(keyLower))) {
        if (typeof value === 'string' && value.length > 0) {
          result[key] = value.length > 4 ? value.slice(0, 4) + '••••' : '••••';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = '••••';
        }
      } else {
        result[key] = redactSecrets(value, `${path}.${key}`);
      }
    }
    return result;
  }
  
  return obj;
}

console.log('Original:');
console.log(JSON.stringify(testData, null, 2));
console.log('\nRedacted:');
console.log(JSON.stringify(redactSecrets(testData), null, 2));
console.log('\n✓ Redaction test complete');
