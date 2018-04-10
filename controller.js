//Dropbox SDK requires this line
require('isomorphic-fetch'); 

const 
imgController = require('./imgservices'),
dbxservices = require('./dbxservices'),
crypto = require('crypto'),
config = require('./config'),
store = require('./redismodel'),
rp = require('request-promise'),
Dropbox = require('dropbox').Dropbox,
NodeCache = require( "node-cache" );

var mycache = new NodeCache();
 


module.exports.home = async (req,res,next)=>{    

  let token = req.session.token;

  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    let result = await dbxservices.getTemporaryLinksForFolderAsync(dbx,config.DROPBOX_PHOTOS_FOLDER); 

    let paths = result.temporaryLinks;

    if(paths.length>0){
      res.render('gallery', { imgs: paths, layout:false});
    }else{
      //if no images, ask user to upload some
      res.render('empty', {layout:false});
    }    

  }catch(error){
    return next(new Error("Error getting images from Dropbox"));
  }
  
};


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
      console.log("token="+token);
      
      await regenerateSessionAsync(req);
      req.session.token = token;
      console.log("Token="+token);
      
      res.redirect("/");

    }catch(error){
      return next(new Error('error getting token. '+error.message));
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



module.exports.search = async (req,res,next)=>{    

  let token = req.session.token;
  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let dbx = new Dropbox({ accessToken: token });

  try{

    let personId= await store.getValue(req.params.name);
    console.log('found '+personId);

    // Get the paths to the files
    let paths = await dbxservices.searchProperty(dbx,personId);

    console.log("paths to search");
    console.log(paths);

    if(paths.length>0){

      //Get temporary links for files
      let temporaryLinks = await dbxservices.getTemporaryLinksForPathsAsync(dbx,paths);
      res.render('gallery', { imgs: temporaryLinks, layout:false});

    }else{
      //if no images, ask user to upload some
      res.render('empty', {layout:false});
    }    

  }catch(error){
    console.log(error);
    return next(new Error("Error getting images from Dropbox"));
  }

}



module.exports.tag = async(req,res,next)=>{ 

  let token = req.session.token;
  //If not token, redirect to login
  if(!token) return res.redirect('/login');

  let hasmore=true;
  let cursor=null;
  let limit =5;
  let lastModified=null;
  let dbx = new Dropbox({ accessToken: token });
  let path = config.DROPBOX_PHOTOS_FOLDER;


  //only check for images after a stored timestamp to avoid retagging all images in Azure
  try{
    lastModified= await store.getValue(config.STORE_LAST_MODIFIED_KEY);
  }catch(error){
    console.log(error);
    res.write("Error retrieving last modified ... tagging everything");
  }

  //user can force to retag everything with the parameter tagall=true
  if(req.query.tagall && req.query.tagall=='true') lastModified=null;
  if(lastModified)res.write("Tagging images after "+lastModified);

  res.write("\nReading images from "+path +" ...");


  while(hasmore){

    try{

      let imgPathsResult= await dbxservices.getTemporaryLinksForFolderAsync(dbx,path,cursor,limit,lastModified);
      
      cursor=imgPathsResult.cursor;
      hasmore=imgPathsResult.hasmore;

      res.write("\nfound "+imgPathsResult.temporaryLinks.length +" images ...");

      //iterate over a list of eligible images in a folder
      for(let i=0;i<imgPathsResult.temporaryLinks.length;i++){

        //Detect persons on each photo
        let result = await imgController.detectPersonsInPhotoAsync(config.GROUP_NAME,imgPathsResult.temporaryLinks[i],imgPathsResult.imgPaths[i]);
        if(!result) continue;

        //Add those persons to the file properties
        let templateID = await dbxservices.getTemplateIDAsync(dbx);
        await dbxservices.addPropertiesAsync(dbx,templateID,result.path,result.personIds);
        res.write("\nAdded "+result.personIds.length+" persons to "+result.path);
            
      }

      //if there are more results continue, otherwise store a timestamp for future tag jobs
      if(!hasmore){
        let dateIsoString = (new Date()).toISOString();
        await store.saveKey(config.STORE_LAST_MODIFIED_KEY, dateIsoString);
        res.write("\n--> Tagging completed !");
      }

    }catch(error){
      console.log(error);
      hasmore=false;
      res.write("\nError tagging folder: "+error.message);
    }
  }

  res.end();
}


