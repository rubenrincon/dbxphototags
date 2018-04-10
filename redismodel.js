const util = require('util');
var redis = require("redis"),
client = redis.createClient();

//using bind as per https://github.com/nodejs/node/issues/13338
module.exports.saveKey = util.promisify(client.set).bind(client);

module.exports.getValue = util.promisify(client.get).bind(client);

/*
module.exports.saveKey= (key,value)=>{
  return new Promise(async(resolve,reject)=>{
	client.set(key, value,(error,res)=>{
  		if(error){
  			reject(new Error("Couldn't save key: "+key+". "+error.message));
  		}else{
  			resolve(res);
  		}
  	});
  });
}
*/

/*module.exports.getValue= (key)=>{
  return new Promise(async(resolve,reject)=>{
	client.get(key,(error,res)=>{
  		if(error){
  			reject(new Error("Couldn't get value for key:"+key+". "+error.message));
  		}else{
  			resolve(res);
  		}
  	});
  });
}
*/
