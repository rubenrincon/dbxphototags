var redis = require("redis"),
client = redis.createClient();


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


module.exports.getValue= (key)=>{
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

