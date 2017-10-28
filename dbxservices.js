const 
Dropbox = require('dropbox'),
config = require('./config'),
template = require ('./properties_template');

var dbx;
var templateId;




var self = module.exports ={

	initializeDropbox:(token)=>{
		dbx= new Dropbox({ accessToken: token});
	},

	/*
	Returns a promise for a templateId, if it exists locally will return it
	If no local templateId, will fetch the first one in Dropbox
	If does not exist in Dropbox, will create a new one
	*/
	getTemplateIDAsync: ()=>{
		  return new Promise(async(resolve,reject)=>{
		  	try{

		  		if(templateId)return resolve(templateId);

		  		//If no templateId stored in memory get it from Dropbox
		  		let result = await dbx.filePropertiesTemplatesListForUser();

			  	if(result.template_ids && result.template_ids.length>0){
			  		resolve(result.template_ids[0]);
			  	} else{

			  		//If no template already attached to user, then attach one
			  		result = await dbx.filePropertiesTemplatesAddForUser(template.people_template);
			  		resolve(result.template_id);
			  	}
		  	}catch(error){
		  		let message= error.error_summary?error.error_summary:error.message;
		  		reject(new Error("couldnt get templateID. "+message));
		  	}
		  });

	},


	/*
	Adds a set of properties to a specific file
	If the properties already exist, it will overwrite them
	*/
	addPropertiesAsync:(templateId,path,personIds)=>{

		return new Promise(async (resolve,reject)=>{

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
			    "property_groups": [
		        {
	            "template_id": templateId,
	            "fields": fields
		        }
			    ]
				}

		  	let result= await dbx.filePropertiesPropertiesAdd(args);
		  	resolve();


		  }catch(error){

		  	let tag=null;
		  	if(error.error&&error.error.error && error.error.error['.tag']){
		  		tag= error.error.error['.tag'];
		  	}

		  	//If the property exists, overwrite it 
		  	if((tag=='property_group_already_exists')){

		  		try{

		  			await dbx.filePropertiesPropertiesOverwrite(args);
		  			resolve();

		  		}catch(error){
		  			let message= error.error.error_summary?error.error.error_summary:error.message;
		  			reject(new Error("Error overwriting properties. "+ message))
		  		}
		  	}else{
		  		let message= error.error.error_summary?error.error.error_summary:error.message;
		  		reject(new Error("Error adding properties to user. "+ message));
		  	}
		  }
		});
	},



	/*
	Search for a property with a specified personId 
	returns an array with images
	*/
	searchProperty:(personId)=>{

		return new Promise(async (resolve,reject)=>{

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

				console.log("search result");
				console.log(paths);
				resolve(paths);

			}catch(error){
				let message= error.error.error_summary?error.error.error_summary:error.message;
		  	reject(new Error("Error searching for person. "+ message));
			}

		});
	},


/*
Returns an array with temporary links from an array with file paths
Only images are returned
Response will be returned in the following format once the promised is fulfilled
{
	temporaryLinks: [link1,link2,link3],
	paths:[path1,path2,path3]
}

*/

	getTemporaryLinksForFolderAsync:async (path,cursor,limit)=>{

	  return new Promise(async(resolve,reject)=>{

	  	try{

	  		//Will hold values to return in case promise correctly fullfills
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

				resolveValue.cursor = result.cursor;
				resolveValue.hasmore= result.has_more;


				//Filter response to images only
		    let entriesFiltered= result.entries.filter(function(entry){
		      return entry.path_lower.search(/\.(gif|jpg|jpeg|tiff|png)$/i) > -1;
		    });        

		    //Get an array from the entries with only the path_lower fields
		    let imgPaths = entriesFiltered.map(function (entry) {
		      return entry.path_lower;
		    });

		    let temporaryLinks = await self.getTemporaryLinksForPathsAsync(imgPaths);

			  console.log("created "+temporaryLinks.length+ " temporary links");

			  resolveValue.temporaryLinks= temporaryLinks;
			  resolveValue.imgPaths = imgPaths;

			  resolve(resolveValue);

			}catch(error){
				console.log(error);
				reject(new Error("couldnt get temporary links. "+error));
			}
	  });
	},

	getTemporaryLinksForPathsAsync: async (imgPaths)=>{

	  return new Promise(async(resolve,reject)=>{

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

			  resolve(temporaryLinks);

			}catch(error){
				console.log(error);
				reject(new Error('couldnt create temporary links'));
			}
		});
	}

}







