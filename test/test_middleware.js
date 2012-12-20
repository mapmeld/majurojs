var middleware = require('../middleware')
  , should = require('should')
  , sinon = require('sinon')
  ;
describe('middleware', function() {
  describe('#require_auth_browser()', function() {
    it('should only be accessible to authenticated user', function() {
    
      // this mock_req has NO user object which means the user is not logged in
      var mock_req = {session: {}};
      var mock_res = {redirect: function() {}, end: function() {}};
    
      sinon.spy(mock_res,"redirect");

      middleware.require_auth_browser(mock_req, mock_res, function() { mock_res.statusCode = 200 });

      mock_res.statusCode.should.eql(401);
      mock_res.redirect.getCall(0).args[0].should.equal("/login");

      // this mock_req has a user object which means the user is logged in
      mock_req = {user: {}};
      middleware.require_auth_browser(mock_req, mock_res, function() { mock_res.statusCode = 200 });

      mock_res.statusCode.should.eql(200);
    });
  });
});