
/*	Global Variables	*/

/* had to add this to get the comments because the OAUTH2 key doesn't work*/
var YOUTUBE_API_KEY = "AIzaSyDatlo3qK8YNcVcP9AeHwsEdrHBaZsxMyk"; 

/* This variable is used to create unique ID and for labeling purpose */
var DROPDOWN_ID = 0;

/*	Public Classes	*/
function $videoUI(id)
{
	var parent = document.getElementById(id);
	if(parent ==null)
	{
		alert("Invalid container ID");
		return;
	}	

	$object.call(this, "div", "class-video-ui");
	var sort_expression = "date";
	var next_page_token = "";
	var location_latitude = "";
	var location_longitude = "";
	var location_radius = "";

	//	Video Player
	var video = new $videoplayer();

	//	Results list
	var results = new $listpagination("Videos");
	results.style = "width:400px;margin:10px;";
	results.itemselected = function(d)
	{
		video.setVideo(d, false);
	};
	results.showmore = function(){
		nextPage();
	};

	//	Search 
	var node = new $objectpanel();
	node.style = "padding:10px;";

	var search_text = new $inputtext(); 
	search_text.Element.placeholder = "video keyword";
	search_text.style = "width:80%";
	search_text.enterkeypressed = function(){setSearch();};
	node.appendChild(search_text);

	var search_button = new $inputbutton("Search");
	search_button.style = "width:100px;height:30px;margin-left:5px;";
	search_button.clicked = function(){
		setSearch();
	};
	node.appendChild(search_button);
	this.appendChild(node);

	//	Sort and Filter
	var tools = new $objectpanel();
	tools.style = "text-align:left;margin-top:5px;padding-left: 10px;";

	var filter = new $dropdown(["None","By Location (10 miles)", "By Location (50 miles)", "By Location (100 miles)"], "Filter");
	filter.style = "margin-right:5px;width:150px";
	filter.selectionchanged = function(s){

		if(s == "None")
		{
			location_latitude = "";
			location_longitude = "";
			location_radius = "";
			setSearch();
		}
		else
		{
			_getLocation(function(position){
				location_latitude = position.coords.latitude;
				location_longitude = position.coords.longitude;
				if(s == "By Location (10 miles)")
				{
					location_radius = "10mi";
				}
				else if(s == "By Location (50 miles)")
				{
					location_radius = "50mi";
				}	
				else if(s == "By Location (100 miles)")
				{
					location_radius = "100mi";
				}

				setSearch();
			});

		}	
	};
	tools.appendChild(filter.label);
	tools.appendChild(filter);

	var sort = new $dropdown(["Sort by Date", "Sort by Rating", "Sort by Relevance"], "Sort");
	sort.selectionchanged = function(s){

		if(s == "Sort by Date")
		{
			sort_expression = "date";
		}
		else if(s == "Sort by Rating")
		{
			sort_expression = "rating";
		}
		else if(s == "Sort by Relevance")
		{
			sort_expression = "relevance";
		}
		setSearch();

	};
	tools.appendChild(sort.label);
	tools.appendChild(sort);

	//	Build UI
	var table = new $objecttable();
	table.appendRow(2);
	table.addItem(0,0, video);
	table.addItem(0,1, tools);
	table.addItem(0,1, results);
	this.appendChild(table);

	//	Add UI to the parent node  
	parent.appendChild(this.Element);

	//	set focus on search text
	search_text.focus();

	//	Load favorites videos from session storage
	video.loadFavorites();

	//	Private Methods
	function setSearch()
	{
		next_page_token = "";
		results.reset();
		results.pagination(false);
		search();
	}

	function nextPage()
	{
		search();
	}

	function search()
	{
		var text  = search_text.getText();
		var request = null;
		if(location_radius == "")
		{
			request = gapi.client.youtube.search.list({
				q: text,
				type:"video",
				order:sort_expression,
				pageToken:next_page_token,
				part: 'snippet'
			});
		}
		else
		{
			var location = location_latitude +"," + location_longitude;
			request = gapi.client.youtube.search.list({
				q: text,
				order:sort_expression,
				type:"video",
				location:location,
				locationRadius:location_radius,
				pageToken:next_page_token,
				part: 'snippet'
			});
		}	


		request.execute(function(response) {

			if(response.items == undefined)
			{
				alert("An Error occurred while requesting the video list, try it later");
				return;
			}	

			next_page_token = response.nextPageToken;
			for(var i=0;  i < response.items.length ;i++) results.addItem(new $videoitem(response.items[i], false));

			/* FIXME: There is a Youtube API BUG: 
			 * 	For example when executing a search the response returns: 
			 *  
			 *  response.pageInfo.totalResults = 24  
			 *  response.items.length = 0
			 *  
			 *  The response.items arrays is empty even when totalResults is greater than zero,
			 *  also nextPageToken returns the next page info.
			 */
			
			if(next_page_token != "" && response.items.length > 0)
			{
				results.pagination(true);
			}
			else
			{
				results.pagination(false);
			}	
		});
	}

	//	Private classes
	function $videoplayer()
	{
		var data = null;
		var This = this;
		var comments_list = null;
		var commnets_next_token = "";

		this.Element = document.createElement("div");
		this.Element.className = "class-video-player-box";

		var favorites = new $foldinglist("Favorites", true);
		favorites.style = "width:560px;margin-left:5px;";
		favorites.itemselected = function(d){
			This.setVideo(d, true);
		};
		favorites.itemremoved = function(d){
			removeFromFavorites(d);
		};
		favorites.postreset = function(){
			//	clean up session storage
			localStorage.removeItem("favoritelist");
		};

		var video  = document.createElement("iframe");
		video.className = "class-video-player-link";

		var meta = document.createElement("div");
		meta.className = "class-video-player-meta";
		meta.style.display = "none";

		var title = document.createElement("div");
		title.className = "class-video-player-title";

		var detail = document.createElement("div");
		detail.className = "class-video-player-detail";

		var rating = document.createElement("div");
		rating.className = "class-video-player-rating";

		var add_button = new $inputbutton("Add to Favorites");
		add_button.clicked = function(){
			addToFavorites();
		};

		meta.appendChild(add_button.Element);
		meta.appendChild(title);
		meta.appendChild(detail);
		meta.appendChild(rating);

		var comments = new $listpagination("Comments");
		comments.style = "width:560px;margin-top:10px;margin-left:5px;";
		comments.showmore = function(){
			getComments();
		};

		this.Element.appendChild(favorites.Element);
		this.Element.appendChild(video);
		this.Element.appendChild(meta);
		this.Element.appendChild(comments.Element);

		//	Methods
		this.loadFavorites = function()
		{
			loadFavorites();
		};

		this.setVideo = function(d, favo){
			favorites.collapse();
			_removeChildren(rating);
			comments.reset();
			data = d;
			meta.style.display = "block";
			title.innerHTML =  data.snippet.title;
			detail.innerHTML =  "<br><span>Published: "+ new Date(data.snippet.publishedAt) + "</span><br>" +
			"<span>Channel: " +  data.snippet.channelTitle + "</span><br><br><span>" + data.snippet.description + "</span>";
			video.src = "http://www.youtube.com/embed/"+ data.id.videoId +"?autoplay=1";
			commnet_next_page_token = "";
			comment_count = 0;
			comment_index = 0;
			comments_list = [];
			comments.pagination(false);
			commnets_next_token = "";
			getVideoInfo();
		};

		function getVideoInfo()
		{

			request = gapi.client.youtube.videos.list({
				id: data.id.videoId,
				part:"statistics"
			});
			request.execute(function(response) {
				getComments();
				if(response)
				{
					if(response.items.length > 0)
					{
						var rate = document.createElement("div");
						rate.className = "class-video-rate-view-count";
						rate.innerHTML = response.items[0].statistics.viewCount; 
						rating.appendChild(rate);

						rate = document.createElement("div");
						rate.className = "class-video-rate-like-count";
						rate.innerHTML = response.items[0].statistics.likeCount; 
						rating.appendChild(rate);

						rate = document.createElement("div");
						rate.className = "class-video-rate-dislike-count";
						rate.innerHTML = response.items[0].statistics.dislikeCount; 
						rating.appendChild(rate);
					}	
				}	

			});
		}

		//	Private Methods
		function getComments()
		{

			var request = new $request();
			request.responseReady = function(text){
				var tmp = JSON.parse(text);
				if(tmp.items != undefined)
				{	
					comments_list = tmp.items;
					commnets_next_token = tmp.nextPageToken;
					if(commnets_next_token !="")
					{
						comments.pagination(true);
					}
					else
					{
						comments.pagination(false);
					}	
					displayComments();
				}

			};
			//request.execute("http://gdata.youtube.com/feeds/api/videos/" + data.id.videoId + "/comments?v=2&alt=json&max-results=50","GET");

			/* New code added to get comments the code above doesn't work anymore, API 2 has been deprecated, I didn't know that until today */
			/* This code will only retrieve the comments and not the replies so the new code will match the old one
			 */
			request.execute("https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=" +data.id.videoId + 
					"&key=" + YOUTUBE_API_KEY + "&pageToken=" + commnets_next_token +"&order=time" ,"GET");


			/* left this code because had problems implementing it, I got message saying :insufficient privileges, not sure why
			 * 
			var request = gapi.client.youtube.commentThreads.list(
					{videoId: data.id.videoId,	part:'snippet'});
			request.execute(function(response){
			});
			 */

		}

		function displayComments()
		{

			for(var i = 0 ; i < comments_list.length ; i++)
			{
				var cmt = new $comment(comments_list[i]);
				comments.addItem(cmt);
			}
		}

		function $comment(d)
		{
			this.Element = document.createElement("div");
			this.Element.className = "class-comment-item";

			var left = document.createElement("div");
			left.className = "class-cell";

			var pic = document.createElement("div");
			pic.className = "class-comment-pic";
			pic.style.backgroundImage = "url(" + d.snippet.topLevelComment.snippet.authorProfileImageUrl + ")";

			var right = document.createElement("div");
			right.className = "class-cell";

			var panel = document.createElement("div");

			var author = document.createElement("div");
			author.className = "inline-element class-comment-author class-link";

			author.innerHTML = d.snippet.topLevelComment.snippet.authorDisplayName;
			author.userid = d.snippet.topLevelComment.snippet.authorGoogleplusProfileUrl;
			author.onclick = function(){
				window.open(this.userid);
			};

			pic.userid = d.snippet.topLevelComment.snippet.authorGoogleplusProfileUrl;
			pic.onclick = function(){
				window.open(this.userid);
			};

			var date = document.createElement("div");
			date.className = "inline-element class-comment-date";
			date.innerHTML = new Date(d.snippet.topLevelComment.snippet.publishedAt);

			var content = document.createElement("div");
			content.className = "class-comment-content";
			content.innerHTML = d.snippet.topLevelComment.snippet.textDisplay;

			var replies = document.createElement("div");
			replies.className = "class-comment-replies";

			var reply_cnt = document.createElement("div");
			reply_cnt.className = "class-link"; 
			reply_cnt.innerHTML = "Replies: " + d.snippet.totalReplyCount; 

			replies.appendChild(reply_cnt);

			left.appendChild(pic);

			panel.appendChild(author);
			panel.appendChild(date);
			panel.appendChild(content);
			panel.appendChild(replies);

			right.appendChild(panel);

			this.Element.appendChild(left);
			this.Element.appendChild(right);
		}

		function loadFavorites()
		{
			var list = localStorage.getItem("favoritelist");

			if(list != null) 
			{	
				list = JSON.parse(list);
				for(var i=0; i < list.length ;i++)
				{
					addFavoriteItem(list[i]);	
				}
			}
		}

		function addToFavorites()
		{
			if(data !=null)
			{
				var search = searchFavorite(data.id.videoId);

				if(search.index == -1) 
				{
					search.list.push(data); 
					localStorage.setItem("favoritelist", JSON.stringify(search.list));
					//	Add to list
					addFavoriteItem(data);
				}
			}	
		}

		function removeFromFavorites(d)
		{
			var search = searchFavorite(d.id.videoId);

			if(search.index > -1) 
			{
				search.list.splice(search.index, 1);
				localStorage.setItem("favoritelist", JSON.stringify(search.list));
			}	
		}

		function searchFavorite(id)
		{
			var list = localStorage.getItem("favoritelist");

			if(list == null) 
			{
				list = [];
			}
			else
			{	
				list = JSON.parse(list);
			}

			for(var i=0; i < list.length ;i++)
			{
				if(list[i].id.videoId == id) return {index:i,list:list};
			}

			return {index:-1,list:list};;
		}

		function addFavoriteItem(d)
		{
			var item = new $videoitem(d, true);
			favorites.addItem(item);
		}
	}

	function $videoitem(data, close)
	{

		var This = this;
		$object.call(this, "div","class-video-list-item");

		this._parent = null;

		this.clicked = function(){
			if(This._parent!=null) 
			{
				This._parent.itemselected(data);
				This._parent._itemselected(data);
			}
		};

		var cell = document.createElement("div");
		cell.className = "class-cell";

		var video = document.createElement("div");
		video.className = "class-video-list-video";
		video.style["background-image"] = "url(" + data.snippet.thumbnails["default"].url +")";

		cell.appendChild(video);
		this.appendChild(cell);

		var details =  document.createElement("div");
		details.className = "class-video-list-details";

		var title =  document.createElement("div");
		title.className = "class-video-list-title";
		title.innerHTML = data.snippet.title;
		details.appendChild(title);

		var date =  document.createElement("div");
		date.className = "class-video-list-subtitle";
		date.innerHTML = "Published: "+ new Date(data.snippet.publishedAt);
		details.appendChild(date);

		cell = document.createElement("div");
		cell.className = "class-cell";

		cell.appendChild(details);

		if(close == true)
		{
			var del = document.createElement("div");
			del.className = "class-close-item";
			del.title = "remove";
			del.onclick = function(e){
				_stopEvent(e);
				if(This.Element.parentNode != undefined)  This.Element.parentNode.removeChild(This.Element);
				if(This._parent!=null) 
				{
					This._parent.itemremoved(data);
					This._parent._itemremoved();
				}
			};
			details.appendChild(del);
		}	

		this.appendChild(cell);
	}
}


function $dropdown(list, label)
{
	var This = this;
	$object.call(this,"select", "class-dropdown");

	DROPDOWN_ID++;
	var id = "_ddlb" + DROPDOWN_ID;

	this.Element.id = id; 

	this.Element.onchange = function(e){
		This.selectionchanged(this.value);
	};

	this.label = document.createElement("label");
	this.label.innerHTML = label;
	this.label.setAttribute("for", id);
	if(label != undefined) _setStyle(this.Element, "margin-left:5px");  

	//	Load List
	for(var i=0; i < list.length ;i++) 
	{
		var op = document.createElement("option");
		op.value = list[i];
		op.innerHTML = list[i];
		this.Element.appendChild(op);
	}

	//	Events
	this.selectionchanged = function(s){};
}

function $foldinglist(text, clear)
{
	var This = this;
	$object.call(this,"div", "class-object class-folding-list");

	var remove = null;

	var header = document.createElement("div");
	header.className = "class-folding-list-title class-folding-list-title-collapsed";
	header.expanded = false;
	header.onclick = function(){
		if(this.expanded == false)
		{
			this.expanded = true;
			this.className = "class-folding-list-title class-folding-list-title-expanded";
			list.style.display = "block";
		}
		else
		{
			this.expanded = false;
			this.className = "class-folding-list-title class-folding-list-title-collapsed";
			list.style.display = "none";
		}	

	};

	var title = document.createElement("span"); 	
	title.innerHTML = text + "(0)";
	header.appendChild(title);

	var node = document.createElement("div");
	_setStyle(node, "width:100%;height:100%;overflow-x:auto");

	var list = document.createElement("div");
	list.className = "class-table";
	_setStyle(list,"width:100%;display:none");
	node.appendChild(list);

	if(clear == true)
	{
		remove = new $inputbutton("Clear");
		remove.style = "margin-left:25px";
		remove.enabled = false;
		remove.clicked = function(){
			This.reset();
			postreset();
		};
		header.appendChild(remove.Element);
	}	

	this.appendChild(header);
	this.appendChild(node);

	//	Events
	this.itemselected = function(value){};
	this._itemselected = function(){ collapse();};

	this.itemremoved = function(data){};
	this._itemremoved = function(){

		if(remove == null) return;

		if(list.childNodes.length == 0)
		{
			remove.enabled = false;
			collapse();
		}
		else
		{
			remove.enabled = true;
		}	

		title.innerHTML = text + "("+ list.childNodes.length +")";
	};

	// Methods
	this.addItem = function(item){
		item._parent = this;
		list.appendChild(item.Element);
		if(remove != null) remove.enabled = true;
		title.innerHTML = text + "("+ list.childNodes.length +")";
	};

	this.reset = function(){
		_removeChildren(list);
		title.innerHTML = text + "(0)";
	};

	this.collapse = function(){collapse();};

	//	Events
	this.showmore = function(){};
	this.postreset = function(){};

	//	Private Methods
	function postreset()
	{
		This.postreset();
		if(remove != null) remove.enabled = false;
		collapse();
	}

	function collapse()
	{
		header.expanded = false;
		header.className = "class-folding-list-title class-folding-list-title-collapsed";
		list.style.display = "none";
	}
}

function $listpagination(title)
{
	var This = this;
	$object.call(this,"div","class-object class-list-pagination");

	var title_text = document.createElement("div");
	title_text.className = "class-list-pagination-title";
	title_text.innerHTML = title;

	var list = document.createElement("div");
	list.className = "class-table";
	_setStyle(list, "padding-top:10px;width:100%");

	var show_more = document.createElement("div");
	show_more.className = "class-list-show-more";
	show_more.innerHTML = "show more";
	show_more.style.display = "none";
	show_more.onclick = function(){
		This.showmore();
	};

	this.appendChild(title_text);
	this.appendChild(list);
	this.appendChild(show_more);

	//	Events
	this._itemselected = function(){};
	this.itemselected = function(value){};
	this._itemremoved = function(){};
	this.itemremoved = function(value){};

	//	Methods
	this.setTitle = function(text){
		title_text.innerHTML = text;
	};

	this.addItem = function(item){
		item._parent = this;
		list.appendChild(item.Element);
	};

	this.pagination = function(b){
		show_more.style.display =  b==true?"block":"none";
	};

	this.reset = function(){
		_removeChildren(list);
	};

	//	Events
	this.showmore = function(){

	};
}

function $objecttable()
{
	$object.call(this, "div","class-table");

	this.appendRow = function(c){
		var row = document.createElement("div");
		row.className = "class-row";

		for(var i=0;i < c ;i++)
		{	
			var cell = document.createElement("div");
			cell.className = "class-cell";
			row.appendChild(cell);
		}

		this.appendChild(row);

	};

	this.addItem = function(r,c, o)
	{
		if(this.Element.childNodes[r].childNodes[c] != undefined)
		{
			if(o.Element == undefined)
			{
				this.Element.childNodes[r].childNodes[c].appendChild(o);
			}
			else
			{	
				this.Element.childNodes[r].childNodes[c].appendChild(o.Element);
			}
		}	
	};

}

function $inputtext()
{
	var This = this;
	$input.call(this,"text","class-input-text");

	this.Element.addEventListener("keypress", function(e){
		var k = e.keyCode?e.keyCode:e.which;
		if(k==13) This.enterkeypressed();
	});

	//	Events
	this.enterkeypressed = function(){};

}

function $inputbutton(text)
{	
	$input.call(this,"button", "class-input-button");
	this.setText(text);
}

function $input(t,c)
{
	$object.call(this, "input", c);
	this.Element.type = t;

	// Methods
	this.getText = function(){ return this.Element.value;};
	this.setText = function(v){ return this.Element.value = v;};
}

function $objectpanel(c)
{
	$object.call(this,"div",c);
}

function $object(t,c)
{
	var This = this;

	//	Create Element based on parameters
	this.Element = t==undefined ?document.createElement("div"):document.createElement(t);
	if(c!=undefined) this.Element.className = c;

	this.Element.onclick = function(e){ _stopEvent(e); This.clicked();};

	this.style = "";
	this.enabled = true;
	_listenProperty(this,"style,enabled",_set);

	//	Events
	this.clicked = function(){};

	//	Methods
	this.focus = function(){
		this.Element.focus();
	};


	this.appendChild = function(o)
	{
		if(o.Element == undefined)
		{
			this.Element.appendChild(o);
		}
		else
		{	
			this.Element.appendChild(o.Element);
		}
	};

	function _set(p,v)
	{
		if(p == "style")
		{	
			_setStyle(This.Element, v);
		}
		else if(p == "enabled")
		{
			This.Element.disabled = !v;
		}	
	};
}

function $request()
{
	var This = this;
	var reqxml = _getRequest();
	this.contenttype = "application/x-www-form-urlencoded";

	this.responseReady = function(t){};

	this.execute = function(url, type)
	{
		if(reqxml != undefined) 
		{

			reqxml.onreadystatechange = function()
			{
				if (reqxml.readyState == 4) 
				{
					if (reqxml.status == 200) 
					{

						This.responseReady(reqxml.responseText);
					}
				}
			};
			if(type == "GET")
			{
				reqxml.open("GET", url, true);
				reqxml.setRequestHeader("Content-Type", This.contenttype);
				reqxml.send(null);

			}	
			else if(type == "POST")
			{
				reqxml.open("POST", url, true);
				reqxml.setRequestHeader("Content-Type",This.contenttype);
				reqxml.send(args);
			}	

		}
	};

}

