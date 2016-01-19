var reply = require('reply'); // Made by Alexis Gregerson

var opts = {
  username: {
    default: 'nobody', // if left empty, will fall back to this value
    type: 'string',    // ensure value is not a number
    allow_empty: false // will require an answer
  },
  password: {
    message: 'Password, please.',
    type: 'password',
    regex: /(\w{6})/,
    error: 'Six chars minimum. Try again.'
  },
  pet: {
    message: 'What is your pets name',
    type: 'string'// reply uses the JS primitives, as returned by `typeof var`
  }
}

reply.get(opts, function(err, answers) {
  console.log(answers); 
});