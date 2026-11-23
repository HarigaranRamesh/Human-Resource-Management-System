function handleError(error, res) {
  const msg = error?.message || 'An error occurred';
  const isAuthError = msg.includes('not found') || msg.includes('Password') || msg.includes('inactive') || msg.includes('Denied') || msg.includes('Unauthorized');
  const status = isAuthError ? 401 : 400;
  return res.status(status).json({ success: false, message: msg });
}

module.exports = handleError;
