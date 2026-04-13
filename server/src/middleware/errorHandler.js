// Auth-route paths where user enumeration is a risk — return generic messages only
const AUTH_PATHS = ['/api/auth/signup', '/api/auth/signin', '/api/auth/me', '/api/auth/refresh'];

function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);

  const status = err.status || 500;

  let message;
  if (status === 500) {
    message = 'Internal server error.';
  } else if (AUTH_PATHS.some(p => req.path.startsWith(p))) {
    // Generic messages prevent user enumeration via error text differences
    if (status === 401) message = 'Invalid credentials.';
    else if (status === 409) message = 'Request failed. Please try again.';
    else message = 'Request failed.';
  } else {
    message = err.message;
  }

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
