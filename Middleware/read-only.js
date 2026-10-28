function enforceReadOnlyRequests(request, response) {
  if (request.method === "GET" || request.method === "HEAD") return true;

  response.writeHead(405, { Allow: "GET, HEAD" });
  response.end("Method not allowed");
  return false;
}

module.exports = enforceReadOnlyRequests;
