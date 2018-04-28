$(function() {

	$( "#button-new-face").click(function() {
		var path = $("#input-new-face-path").val();
		var search_name = $("#input-new-face-search-name").val();
		makeRequest("/addface",{path:path,search_name: search_name},$("#success-adding"),$("#error-adding"),
			function(error,data){
			if(data) $("#face-list").append($("<li>").text(data));
		});
	});

	$( "#button-tag-all").click(function() {
		makeRequest("/tag?tagall=true",null,$('#success-tagging'),$('#error-tagging'),
		function(error,data){
			$("#last-modified").text(data);
		});
	});

	$( "#button-tag-partial").click(function() {
		makeRequest("/tag",null,$('#success-tagging'),$('#error-tagging'),
			function(error,data){
			$("#last-modified").text(data);
		});
	});

});


/*
Makes a post request
If the call is successful will display a success message given by success_object
If the call fails, will display the returned error using the error_object
If callback is given, will pass on the data received or the error received
*/
function makeRequest(url, body, success_object,error_object,callback){
	$('button').prop('disabled', true);
	$.post(url, body, function(data){ 
		showAndHide(success_object);
		if(callback)callback(null,data);
	})
	.fail(function(error) { 
		error_object.text(error.responseText);
		showAndHide(error_object);
		if(callback)callback(error);
	})
	.always(function(){
		$('button').prop('disabled', false);
	});
}

function showAndHide(object){
	object.show();
	setTimeout(function() { object.hide(); }, 5000);
}


