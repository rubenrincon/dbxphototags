var redis = require("redis"),
client = redis.createClient();



module.exports.savePersonId= (nameKey,personIdValue)=>{
  return new Promise(async(resolve,reject)=>{
	client.set(nameKey, personIdValue,(error,res)=>{
  		if(error){
  			reject(new Error("Couldn't save faceId for "+nameKey+". "+error.message));
  		}else{
  			resolve(res);
  		}
  	});
  });
}


module.exports.getPersonIdValue= (nameKey)=>{
  return new Promise(async(resolve,reject)=>{
	client.get(nameKey,(error,res)=>{
  		if(error){
  			reject(new Error("Couldn't get faceId for "+nameKey+". "+error.message));
  		}else{
  			resolve(res);
  		}
  	});
  });
}

