/**
 * CloudFront Function for the default (*) cache behavior.
 *
 * S3 REST origins return 403 for client-side routes such as /poojas because
 * there is no object with that key. Rewrite navigation routes to the Vite
 * entry point before CloudFront checks the origin. Requests for real files and
 * API endpoints must keep their original URI.
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === "/" || uri.indexOf("/api/") === 0 || uri === "/api") {
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);
  if (uri.charAt(uri.length - 1) === "/" || lastSegment.indexOf(".") === -1) {
    request.uri = "/index.html";
  }

  return request;
}
