var reply = require('./../'); // Made by Alexis Gregerson

reply.confirm('Do you want a cookie?', function(err, positive) {
  var answer = (!err && positive) ? "Here's your cookie" : 'Too bad';
  console.log(answer);
});

