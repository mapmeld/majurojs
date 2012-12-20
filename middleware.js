
// Require a logged in session
exports.require_auth_browser = function require_auth(req, res, next) {
  if (req.user != undefined) {
    next();
  } else {
    req.session.return_to = req.url
    res.statusCode = 401;
    res.redirect("/login");
  }
}