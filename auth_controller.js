//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
crypto = require('crypto'),
config = require('./config'),
Dropbox = require('dropbox').Dropbox,
store = require('./redismodel'),
util = require('util'),
NodeCache = require( "node-cache" );

var mycache = new NodeCache();




module.exports.login = (req,res,next)=>{

  //create a random state value and store it for 10 mins
  let state = crypto.randomBytes(16).toString('hex');
  mycache.set(state, req.sessionID, 600);

  let dbx = new Dropbox({clientId: config.DBX_APP_KEY});

  //get a redirect URL from Dropbox using code authentication
  let dbxRedirect= dbx.getAuthenticationUrl(config.OAUTH_REDIRECT_URL , state, 'code');

  res.redirect(dbxRedirect);
}



module.exports.oauthredirect = async (req,res,next)=>{

  if(req.query.error_description){
    return next( new Error(req.query.error_description));
  } 

  let state= req.query.state;

  //compare state in the query with previously stored state
  if(mycache.get(state)!=req.sessionID){
    return next(new Error("session expired or invalid state"));
  } 

  let code = req.query.code;
  //Exchange code for token

  console.log("code="+code);
  if(code){

    try{

      let dbx = new Dropbox({
        clientId: config.DBX_APP_KEY,
        clientSecret: config.DBX_APP_SECRET
      });

      let token = await dbx.getAccessTokenFromCode(config.OAUTH_REDIRECT_URL, code) ;
      await dbx.setAccessToken(token);
      let account_info = await dbx.usersGetCurrentAccount();
      account_id = account_info.account_id;

      //if no settings found reset 
      let settings = await store.getAllUserSettingsAsync(account_id);
      if(!settings) await store.resetSettingsAsync(account_id);
  
      //store both token and account_id on a new session
      await regenerateSessionAsync(req);
      req.session.token = token;
      req.session.account_id= account_id;

      
      res.redirect("/");

    }catch(error){
      console.log(error);
      return next(new Error('error authenticating. '+error.message));
    }        
  }
}

//Returns a promise that fulfills when a new session is created
function regenerateSessionAsync(req){
  return new Promise((resolve,reject)=>{
    req.session.regenerate((err)=>{
      err ? reject(err) : resolve();
    });
  });
}



module.exports.logout = async (req,res,next)=>{
  try{
    await destroySessionAsync(req);
    res.redirect("/login");
  }catch(error){
    return next(new Error('error logging out. '+error.message));
  }  
}

//Returns a promise that fulfills when a session is destroyed
function destroySessionAsync(req){
  return new Promise(async (resolve,reject)=>{
    //first try to revoke token
    try{
      let token = req.session.token;
      if(token){
        let dbx = new Dropbox({ accessToken: token });
        await dbx.authTokenRevoke();
      }
    }catch(error){
      console.log("error revoking token: "+error.message);
    }  
    //then destroy the session
    req.session.destroy((err)=>{
      err ? reject(err) : resolve();
    });
  });
}
