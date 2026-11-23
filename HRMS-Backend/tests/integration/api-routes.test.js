process.env.NODE_ENV = 'test';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { app } = require('../../src/app');

function executeRequest(method, url, headers = {}, body = {}) {
  return new Promise((resolve) => {
    let responseData = null;
    const responseHeaders = {};

    const req = Object.assign(new EventEmitter(), {
      method,
      url,
      originalUrl: url,
      headers: { ...headers },
      body,
      query: {},
      params: {},
      pipe() { return this; },
      unpipe() { return this; },
      resume() { return this; },
      pause() { return this; },
    });

    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      _headers: responseHeaders,
      setHeader(name, value) {
        responseHeaders[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name) {
        return responseHeaders[name.toLowerCase()];
      },
      hasHeader(name) {
        return Boolean(responseHeaders[name.toLowerCase()]);
      },
      removeHeader(name) {
        delete responseHeaders[name.toLowerCase()];
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ status: this.statusCode, body: responseData });
      },
      send(data) {
        responseData = data;
        resolve({ status: this.statusCode, body: responseData });
      },
      end(data) {
        if (data && !responseData) responseData = data;
        resolve({ status: this.statusCode, body: responseData });
      }
    });

    app.handle(req, res);
  });
}

describe('API Route Integration Tests (In-Memory Engine)', () => {
  it('GET / should return 200 with service health status', async () => {
    const res = await executeRequest('GET', '/');
    assert.equal(res.status, 200);
    assert.ok(res.body.status.includes('HRMS Backend running'));
  });

  it('GET /api/user should reject unauthenticated request with 401', async () => {
    const res = await executeRequest('GET', '/api/user');
    assert.equal(res.status, 401);
    assert.ok(res.body && (res.body.message || res.body.error));
  });

  it('GET /api/announcements should reject unauthenticated request with 401', async () => {
    const res = await executeRequest('GET', '/api/announcements');
    assert.equal(res.status, 401);
    assert.ok(res.body && (res.body.message || res.body.error));
  });

  it('GET /api/unknown-endpoint should return 404', async () => {
    const res = await executeRequest('GET', '/api/unknown-endpoint-xyz-404');
    assert.equal(res.status, 404);
  });
});
