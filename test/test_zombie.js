var assert = require('assert')
  , config = require('../test-config')
  , app = require('../app')
  , index = require('../routes')
  , should = require('should')
  , zombie = require('zombie')
  , mongoose = require('mongoose')
  ;

var TEST_PORT = Math.floor(Math.random()*61439 + 4096);
var base_url = "http://localhost:" + TEST_PORT + "/";
var test_email = "testuser@example.com";

before(function() {
   var server = app.init(config);
   
   // should check to see if something is listening on the port first
   server.listen(TEST_PORT);
   console.log("Server is listening on port %s", TEST_PORT);
 });

after(function() {
  var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;
  mongoose.connect(db_uri);
  
  // drop database
  mongoose.connection.db.executeDbCommand( {dropDatabase:1}, function() {
    console.log("Dropped test database.");	
  });
})

describe('front page', function() {
  it('should load', function (done) {
    var browser = new zombie();
    browser.visit(base_url, function () {
      browser.success.should.be.ok;
      if (browser.error) {
        console.dir("errors reported:", browser.errors);
      }
    done();
    });
  }); 
  it('should have the page title Poang', function(done) {
    var browser = new zombie();
    browser.visit(base_url, function () {
      browser.text("title").should.eql("Poang");      
      if (browser.error) {
        console.dir("errors reported:", browser.errors);
      }
      done();
    });
  });
});
describe('registration', function () {
  it('should successfully register', function (done) {
    var browser = new zombie();
    browser.visit(base_url + "register", function () {
      browser.query("#register").should.be.ok;
      // Fill email, password and submit form
      browser.
        fill("email", test_email).
        fill("password", "secret").
        pressButton("register", function() {

          // Form submitted, new page loaded.
          browser.success.should.be.ok;
          browser.location.pathname.should.eql("/");
          done();
        });    
    });
  });
});