const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const verifyToken = require('../../src/middleware/auth');

let SECRET;
try {
  SECRET = fs.readFileSync(path.join(process.cwd(), 'private.key'), 'utf8').trim();
} catch (e) {
  SECRET = 'Bla@2021BOWS^!@#$)(*)';
}

describe('Authentication Middleware Unit Tests', () => {
  it('should return 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (s) => {
        statusSent = s;
        return {
          json: (data) => {
            jsonSent = data;
          }
        };
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyToken(req, res, next);

    assert.equal(statusSent, 401);
    assert.equal(jsonSent.message, 'Token missing');
    assert.equal(nextCalled, false);
  });

  it('should return 401 when token is invalid or tampered', () => {
    const req = { headers: { authorization: 'Bearer invalid.tampered.token' } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (s) => {
        statusSent = s;
        return {
          json: (data) => {
            jsonSent = data;
          }
        };
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyToken(req, res, next);

    assert.equal(statusSent, 401);
    assert.equal(jsonSent.message, 'Invalid or expired token');
    assert.equal(nextCalled, false);
  });

  it('should successfully decode valid JWT and call next()', () => {
    const payload = { id: 101, username: 'superadmin', role: 'Super Admin' };
    const validToken = jwt.sign(payload, SECRET, { expiresIn: '1h' });

    const req = { headers: { authorization: `Bearer ${validToken}` } };
    let statusSent = null;
    const res = {
      status: (s) => {
        statusSent = s;
        return { json: () => {} };
      }
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    verifyToken(req, res, next);

    assert.equal(statusSent, null);
    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 101);
    assert.equal(req.user.username, 'superadmin');
    assert.equal(req.user.role, 'Super Admin');
  });
});
