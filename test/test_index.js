var should = require('should')
  , index = require('../routes/index')
  ;
  
describe('index', function() {
  describe('#timesTwo()', function() {
    it('should multiply by two', function() {
      var x = 5;
      var xTimesTwo = index.timesTwo(x);
      xTimesTwo.should.equal(10);
    });
  });
});

