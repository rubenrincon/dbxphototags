const 
config = require('./config'),
template = require ('./properties_template'),
store = require('./redismodel'),
util = require('util');


/*
Returns a templateId from local storage or gets a new one from Dropbox
*/
module.exports.getTemplateIDAsync = util.promisify(getTemplateID);
async function getTemplateID(dbx,account_id,callback){
	try{
		let template_id;
		let settings = await store.getAllUserSettingsAsync(account_id);

		if(!settings || !settings.dbx_template_id){

			let result = await dbx.filePropertiesTemplatesAddForUser(template.people_template);
			template_id= result.template_id;
			await store.saveSingleUserSettingAsync(account_id,"dbx_template_id",template_id);

		}else{
			template_id= settings.dbx_template_id;
		}
		return callback(null, template_id);
	}catch(error){
		let message= error.error_summary?error.error_summary:error.message;
		callback(new Error("couldnt get templateID. "+message));
	}
}


/*
Search for a property with a specified personId 
returns an array with image paths, if not found, the array is empty
*/
module.exports.searchPropertyAsync = util.promisify(searchProperty);
async function searchProperty(dbx,personId,callback){

	try{

		let paths=[];

		let query={
			"queries": [
				{
					"query": personId,
					"mode": {
						".tag": "field_name",
						"field_name": "person1"
					},
					"logical_operator": "or_operator"
				}
			],
			"template_filter": "filter_none"
		}

		for(let i=0;i<template.people_template.fields.length;i++){

			query.queries[0].mode.field_name = 'person'+(i+1);

			console.log("looking for "+personId +" in "+query.queries[0].mode.field_name);

			let result= await dbx.filePropertiesPropertiesSearch(query);
			console.log(result);

			if(result.matches && result.matches.length>0){

	  		  //Construct a new array only with the path field
			  let resultPaths = result.matches.map(function (entry) {
			    return entry.path;
			  });
			  console.log("found match");
			  console.log(resultPaths);
			  paths = paths.concat(resultPaths);
			}
		}
		callback(null,paths);
	}catch(error){
		let message= error.error.error_summary?error.error.error_summary:error.message;
  	callback(new Error("Error searching for person. "+ message));
	}
}


/*
Adds a set of properties to a specific file
If the properties already exist, it will overwrite them
*/
module.exports.addPropertiesAsync = util.promisify(addProperties);
async function addProperties(dbx,templateId,path,personIds,callback){

	let args =null;
  	try{

		//construct array with persons found according to template
		let fields=[];
		for(let j=0;j<personIds.length;j++){
			fields.push(
				{
				'name': 'person'+(j+1),
				'value':personIds[j]
				}
			);
		}

		args= {
			"path": path,
			"property_groups": [{
				"template_id": templateId,
				"fields": fields
			}]
		}

		console.log("Adding property to file:");
		console.log(args);
		console.log(fields);

  	let result= await dbx.filePropertiesPropertiesAdd(args);
  	callback();


  }catch(error){

	  let tag=null;
	
	//if error from Dropbox, get the .tag field
  	if(error.error&&error.error.error && error.error.error['.tag']){
  		tag= error.error.error['.tag'];
  	}

  	//If the property exists, overwrite it 
  	if((tag=='property_group_already_exists')){

  		try{

  			console.log("property exist, overwriting");
  			await dbx.filePropertiesPropertiesOverwrite(args);
  			callback();

  		}catch(error){
  			let message= (error.error && error.error.error_summary)?error.error.error_summary:error.message;
  			callback(new Error("Error overwriting properties. "+ message))
  		}
  	}else{
  		let message= (error.error && error.error.error_summary)?error.error.error_summary:error.message;
  		callback(new Error("Error adding properties to user. "+ message));
  	}
  }
}


/*
Returns an array with temporary links from a path. 
The path parameter should be a folder.
Only images are returned.
Any call to this method should pass the complete 5 arguments as promisify will make the callback the 6th argument
Response will be returned in the following format.
{
	temporaryLinks: [link1,link2,link3],
	paths:[path1,path2,path3]
}
*/
module.exports.getTemporaryLinksForFolderAsync = util.promisify(getTemporaryLinksForFolder);
async function	getTemporaryLinksForFolder(dbx,path,cursor,limit,lastModified,callback){

  	try{

  		let resolveValue={};

  		let result=null;
			if(!cursor){

				let params ={};
				params.path = path;
				if(limit) params.limit= limit;
				result	= await dbx.filesListFolder(params);

			}else{
				result = await dbx.filesListFolderContinue({'cursor':cursor});
			}

			if(result.cursor) resolveValue.cursor = result.cursor;
			resolveValue.hasmore= result.has_more;


			//Filter response to images only
	    let entriesFiltered= result.entries.filter(function(entry){
	      return entry.path_lower.search(/\.(gif|jpg|jpeg|tiff|png)$/i) > -1;
	    });  


	    //filter it to images modified after a specific date
	    if(lastModified){
		    entriesFiltered = entriesFiltered.filter(function(entry){
		      return entry.server_modified > lastModified;
		    });  
	    }

	    //Get an array from the entries with only the path_lower fields
	    let imgPaths = entriesFiltered.map(function (entry) {
	      return entry.path_lower;
	    });

	    let temporaryLinks = [];
	    if(imgPaths.length>0){
	    	temporaryLinks= await getTemporaryLinksForPathsAsync(dbx, imgPaths);
	    }

		  console.log("created "+temporaryLinks.length+ " temporary links");

		  resolveValue.temporaryLinks= temporaryLinks;
		  resolveValue.imgPaths = imgPaths;

		  callback(null,resolveValue);

		}catch(error){
			console.log(error);
			let message= (error.error && error.error.error_summary)?error.error.error_summary:error.message;
			callback(new Error("couldnt get temporary links. "+message));
		}
	}

//returns an array of temporary links for images in the imgPaths array
var getTemporaryLinksForPathsAsync = module.exports.getTemporaryLinksForPathsAsync = util.promisify(getTemporaryLinksForPaths);
async function	getTemporaryLinksForPaths(dbx,imgPaths,callback){

	try{

		let results=[];

		for(let i=0;i<imgPaths.length;i++){
			try{

				let result = await dbx.filesGetTemporaryLink({'path':imgPaths[i]});
				results.push(result);

			}catch(error){
				console.log(error);
			}
		}


		  //Construct a new array only with the link field
	  let temporaryLinks = results.map(function (entry) {
	    return entry.link;
	  });

	  callback(null,temporaryLinks);

	}catch(error){
		console.log(error);
		callback(new Error('couldnt create temporary links '+error.message));
	}

}






