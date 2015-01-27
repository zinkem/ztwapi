var OAuth = require('oauth').OAuth;
var util  = require('util');
var querystring = require('querystring');
var config = require('./myconfig.js').config

//oauth credentials should be stored in myconfig.js________________
var access_token = config.access_token;
var access_token_secret = config.access_token_secret;
/*
var oa = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    config.consumer_key,
    config.consumer_secret,
    "1.0A",
    null,
    "HMAC-SHA1"
  );
*/
var twapi = exports;

//utilities________________________________________________________
var packURL = function(base, params){
  var packedurl = base+"?"+querystring.stringify(params);
  return packedurl;
};


//io callback wrappers________________________________________________

//checks for errors before calling cb-- all cbs should be derived from this
var errorCheckingCallback = function(cb){
  return function(error, data){
    if(error){
      console.log("Error: ");
      console.log(error); 
    } else {
      cb(error, data);
    }
  };
};

//expects dataparser returns an array/object from io data
//performs dataop on each 
var parseIterateCallback = function(dataparser, dataop){
  return errorCheckingCallback(function(error, data) {
    var array = dataparser(data);
    for( var i in array ){
      dataop(array[i]);
    }
  });
};

//tweet parsers_____________________________________________________
var reverseTweetParser = function(data){
  return JSON.parse(data).reverse();
};

var searchReverseTweetParser = function(data){
  return JSON.parse(data).statuses.reverse();
};

//tweet operations_________________________________________________
var displayTweet = function(tweet){
  var tweet_display = tweet.user.screen_name + " tweets " + 
                      tweet.text + "\n" + 
                      "on " + tweet.created_at + ", id: "+ tweet.id +"\n";
  console.log(tweet_display);
};

var colors = {
  Clear       : "\33[0;0m",
  Black       : "\33[0;30m",
  Blue        : "\33[0;34m",
  Green       : "\33[0;32m",
  Cyan        : "\33[0;36m",
  Red         : "\33[0;31m",
  Purple      : "\33[0;35m",
  Brown       : "\33[0;33m",
  Gray        : "\33[0;37m",
  DarkGray    : "\33[1;30m",
  LightBlue   : "\33[1;34m",
  LightGreen  : "\33[1;32m",
  LightCyan   : "\33[1;36m",
  LightRed    : "\33[1;31m",
  LightPurple : "\33[1;35m",
  Yellow      : "\33[1;33m",
  White       : "\33[1;37m"
}

twapi.displayColorTweet = function(tweet){

  var tweet_header = colors.Green +"@"+ tweet.user.screen_name + colors.DarkGray;
  while(tweet_header.length < 35)
    tweet_header = tweet_header+"_";
  tweet_header = tweet_header+colors.Cyan + tweet.created_at + colors.DarkGray;
  while(tweet_header.length < 100)
    tweet_header = tweet_header+"_";
  tweet_header = tweet_header + tweet.id;

  var tweet_display = colors.White  + tweet.text + colors.Clear+"\n"; 
  tweet_display += colors.Yellow + tweet.favorite_count + " favorites " 
  tweet_display += tweet.retweet_count +" retweets\n"+colors.Gray;

  console.log(tweet_header);
  console.log(tweet_display);

};




//twitter api calls________________________________________________

//suitable for any endpoint that returns data that canbe parsed into an array
//dataparser takes responses 'data' as a parameter and returns an array
//dataop is an operation to be performed on all elements of that array in order
twapi.get = function(endpoint, opts, dataparser, dataop){
  var url = "https://api.twitter.com/1.1/"+endpoint;
  if(opts) {
    url = packURL(url, opts);
  }
  console.log("twiget url : "+url);
  oa.get(url, access_token, access_token_secret,
          parseIterateCallback(dataparser, dataop));
};

//suitable for posting a new tweet to your timeline
twapi.post = function(params){
  var message = params.join(' ');
  var url = packURL("https://api.twitter.com/1.1/statuses/update.json",
                    { "status": message });
  console.log(url);

  oa.post(url,access_token, access_token_secret, null, null, 
    errorCheckingCallback(function(err, data){
      console.log("Status sucessfully set to "+message);
      
      //console.log(err);
      //console.log(data);
    }));

};


//get home feed 
twapi.getHomeFeed = function(dataparser, dataop){
  
  var op1 = dataparser || reverseTweetParser;
  var op2 = dataop || displayColorTweet;

  console.log(dataparser)
  console.log(op1)
  console.log(op2)

  twapi.get("statuses/home_timeline.json", 
    null, op1, op2);
};



//Handling data from steams
var EventEmitter = require('events').EventEmitter;

function StreamHandler(endpoint, params){
  EventEmitter.call(this);

  this.oa = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    config.consumer_key,
    config.consumer_secret,
    "1.0A",
    null,
    "HMAC-SHA1"
  );

  this.url = endpoint || "https://userstream.twitter.com/1.1/user.json";
  this.opts = params || {};
  this.res = null;
  this.req = null;
};
util.inherits(StreamHandler, EventEmitter)

//Once StreamHandler is started, it will emit an 'object'
//event that should be listened for in the app
StreamHandler.prototype.start = function(){
  this.url = packURL(this.url, this.opts);

  self = this;
  var request = this.oa.get(this.url, access_token, access_token_secret, null);
  this.req = request;

  var objectbuffer = '';

  this.outstream = function(data){
      var message = data.toString('UTF8');
      objectbuffer += message;

      var endofobject = objectbuffer.indexOf('\r\n');
      var twitter_data;

      if( endofobject !== -1) {
        if( objectbuffer !== '\r\n'){
          twitter_data = JSON.parse(objectbuffer);
          //twitter data is object that gets emitted with event
          self.emit('object', twitter_data)
        }
        objectbuffer = '';
      }

  }

  request.on('response', function(response) {
    console.log('http response ' + response.statusCode);

    self.res = response;

    if(response.statusCode != 200)
      self.emit('refused', response)
    else
      response.on('data', self.outstream);
  });

  request.on('error', function(error){
    console.log('StreamHandler error on request');
    console.log(error);
  });

  request.on('close', function(){
    console.log('StreamHandler request closed');
  });

  request.on('end', function(){
    console.log('end!!')
  });

  request.end();

  console.log('StreamHandler request sent to ' + self.url)

};

StreamHandler.prototype.end = function(){
  if( this.res != null){
    this.res.removeAllListeners('data');
  }

  if(this.req != null){
    this.req.end();
  }
};

twapi.StreamHandler = StreamHandler;
