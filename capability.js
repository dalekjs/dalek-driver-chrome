module.exports = {
  // desribes the URL the browser redirects to when it cannot resolve the requested host
  'POST :sessionId/url hostNotFoundUrl': 'data:text/html,chromewebdata',
  // desribes if the browser redirects to a standard URL when it cannot resolve the requested host
  'POST :sessionId/url hostNotFoundRedirect': true,
  // describes when the command is finished
  'POST :sessionId/url resolve': 'DOMContentLoaded',
};
