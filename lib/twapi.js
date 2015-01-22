var OAuth = require('oauth').OAuth;

//oauth credentials should be stored in myconfig.js________________
var access_token = config.access_token;
var access_token_secret = config.access_token_secret;
var oa = new OAuth(
    "https://api.twitter.com/oauth/request_token",
    "https://api.twitter.com/oauth/access_token",
    config.consumer_key,
    config.consumer_secret,
    "1.0A",
    null,
    "HMAC-SHA1"
  );

var twapi = exports;

//utilities________________________________________________________
var packURL = function(base, params){
  var packedurl = base+"?"+querystring.stringify(params);
  return packedurl;
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
