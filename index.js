var rl, readline = require('readline'); //module for reading a stream on a line-by-line basis

/**
* Creates an interface using the readline module for input and output stream
* @param stdin - input stream
* @param stdout - output stream
* @return - returns readline interface
*/
var get_interface = function(stdin, stdout) {
  if (!rl) rl = readline.createInterface(stdin, stdout);
  else stdin.resume(); // interface exists
  return rl;
}

/**
* Confirms that user has entered input that was previously prompted by user.
* @param message - message to be used to prompt the user for input.
* @param {function} callback - completes after the user finishes inputting informtion.
*/
var confirm = exports.confirm = function(message, callback) {
  
  /**
  * Get the question to be asked to the user and their response
  * @constructs question for prompting user
  */
  var question = {
    'reply': {
      type: 'confirm',
      message: message,
      default: 'yes'
    }
  }

  get(question, function(err, answer) {
    if (err) return callback(err);
    callback(null, answer.reply === true || answer.reply == 'yes');
  });

};

/**
* Prompts the user for information and gets that information that is input.
* @param options - possible options for prompting and receiving user input by type.
* @param {function} callback - completes after the user finishes inputting informtion.
*/
var get = exports.get = function(options, callback) {

  if (!callback) return; // no point in continuing

  if (typeof options != 'object')
    return callback(new Error("Please pass a valid options object."))

  var answers = {},
      stdin = process.stdin,
      stdout = process.stdout,
      fields = Object.keys(options);
  /**
  * Closes the prompt and does something with the users answers
  */
  var done = function() {
    close_prompt();
    callback(null, answers);
  }
  /**
  * Closes out the readline interface, relingquishing control of input/output streams
  */
  var close_prompt = function() {
    stdin.pause();
    if (!rl) return;
    rl.close();
    rl = null;
  }
  
  /**
  * Gets the default value in the case that the user just presses the enter key as input.
  * @param key - Users keystoke.
  * @param partial_answers - partial answer the user input.
  * @return - returns the options available for the user to input.
  */
  var get_default = function(key, partial_answers) {
    if (typeof options[key] == 'object')
      return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
    else
      return options[key];
  }

  /**
  * Gets the type the user input such as true/false, yes/no, etc.
  * @param reply - The users response to the prompt.
  * @return - the users input type.
  */
  var guess_type = function(reply) {

    if (reply.trim() == '')
      return;
    else if (reply.match(/^(true|y(es)?)$/))
      return true;
    else if (reply.match(/^(false|n(o)?)$/))
      return false;
    else if ((reply*1).toString() === reply)
      return reply*1;

    return reply;
  }
  /**
  * Validates that the type that the user enters is the type required
  * @param key - Users keystoke.
  * @param answer - answer the user input.
  * @returns whether the type entered by the user is a valid option for them to enter
  */
  var validate = function(key, answer) {

    if (typeof answer == 'undefined')
      return options[key].allow_empty || typeof get_default(key) != 'undefined';
    else if(regex = options[key].regex)
      return regex.test(answer);
    else if(options[key].options)
      return options[key].options.indexOf(answer) != -1;
    else if(options[key].type == 'confirm')
      return typeof(answer) == 'boolean'; // answer was given so it should be
    else if(options[key].type && options[key].type != 'password')
      return typeof(answer) == options[key].type;

    return true;

  }
  
  /**
  * Outputs error message and explains valid options the user has for input
  * @param key - Users input
  */
  var show_error = function(key) {
    var str = options[key].error ? options[key].error : 'Invalid value.';

    if (options[key].options)
        str += ' (options are ' + options[key].options.join(', ') + ')';

    stdout.write("\033[31m" + str + "\033[0m" + "\n");
  }
  
  /**
  * Outputs message and explains valid options the user has for input
  * @param key - Users input
  */
  var show_message = function(key) {
    var msg = '';

    if (text = options[key].message)
      msg += text.trim() + ' ';

    if (options[key].options)
      msg += '(options are ' + options[key].options.join(', ') + ')';

    if (msg != '') stdout.write("\033[1m" + msg + "\033[0m\n");
  }

  // taken from commander lib
  var wait_for_password = function(prompt, callback) {

    var buf = '',
        mask = '*';

    var keypress_callback = function(c, key) {

      if (key && (key.name == 'enter' || key.name == 'return')) {
        stdout.write("\n");
        stdin.removeAllListeners('keypress');
        // stdin.setRawMode(false);
        return callback(buf);
      }

      if (key && key.ctrl && key.name == 'c')
        close_prompt();

      if (key && key.name == 'backspace') {
        buf = buf.substr(0, buf.length-1);
        var masked = '';
        for (i = 0; i < buf.length; i++) { masked += mask; }
        stdout.write('\r\033[2K' + prompt + masked);
      } else {
        stdout.write(mask);
        buf += c;
      }

    };

    stdin.on('keypress', keypress_callback);
  }
  
  /**
  * Checks whether the reply given by the user is valid in type and if not, shows error message
  * @param index - keeps track of current question and next question
  * @param curr_key - keeps track of most recent user input entered
  * @param fallback - default when answer returned is undefined
  * @param reply - users response to prompt
  */
  var check_reply = function(index, curr_key, fallback, reply) {
    var answer = guess_type(reply);
    var return_answer = (typeof answer != 'undefined') ? answer : fallback;

    if (validate(curr_key, answer))
      next_question(++index, curr_key, return_answer);
    else
      show_error(curr_key) || next_question(index); // repeats current
  }
 
  /**
  * Checks whether dependencies required are currently met
  * @param conds - the condition that needs to be met for dependency requirement
  * @returns true if the dependencies are met, false otherwise
  */
  var dependencies_met = function(conds) {
    for (var key in conds) {
      var cond = conds[key];
      if (cond.not) { // object, inverse
        if (answers[key] === cond.not)
          return false;
      } else if (cond.in) { // array 
        if (cond.in.indexOf(answers[key]) == -1) 
          return false;
      } else {
        if (answers[key] !== cond)
          return false; 
      }
    }
    
    return true;
  }

  /**
  * Keeps track of the next question following the current question
  * @param index - keeps track of current question and next question
  * @param prev_key - keeps track of user input entered for the previous question
  * @param answer - the user input for the current question
  * @returns the next question and the current answer, if no current answer, calls done
  */
  var next_question = function(index, prev_key, answer) {
    if (prev_key) answers[prev_key] = answer;

    var curr_key = fields[index];
    if (!curr_key) return done();

    if (options[curr_key].depends_on) {
      if (!dependencies_met(options[curr_key].depends_on))
        return next_question(++index, curr_key, undefined);
    }

    var prompt = (options[curr_key].type == 'confirm') ?
      ' - yes/no: ' : " - " + curr_key + ": ";

    var fallback = get_default(curr_key, answers);
    if (typeof(fallback) != 'undefined' && fallback !== '')
      prompt += "[" + fallback + "] ";

    show_message(curr_key);

    if (options[curr_key].type == 'password') {

      var listener = stdin._events.keypress; // to reassign down later
      stdin.removeAllListeners('keypress');

      // stdin.setRawMode(true);
      stdout.write(prompt);

      wait_for_password(prompt, function(reply) {
        stdin._events.keypress = listener; // reassign
        check_reply(index, curr_key, fallback, reply)
      });

    } else {

      rl.question(prompt, function(reply) {
        check_reply(index, curr_key, fallback, reply);
      });

    }

  }

  rl = get_interface(stdin, stdout);
  next_question(0);

  rl.on('close', function() {
    close_prompt(); // just in case

    var given_answers = Object.keys(answers).length;
    if (fields.length == given_answers) return;

    var err = new Error("Cancelled after giving " + given_answers + " answers.");
    callback(err, answers);
  });

}
