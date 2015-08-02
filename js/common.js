/*Common Functions*/

function _getLocation(f) {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(f);
	} else {
		alert("Geolocation is not supported by this browser");
	}
}

function _setStyle(e,s)
{
	e.style.cssText += ";" + s;
}

function _stopEvent(e)
{
	var evt = e ? e:window.event;
	if (evt.stopPropagation)    evt.stopPropagation();
	if (evt.cancelBubble!=null) evt.cancelBubble = true;
}


function _removeChildren(e)
{
	while (e.firstChild) {
		var c = e.firstChild; 
		e.removeChild(c);
		c = null;
	}

}

function _listenProperty(obj, props, callback)
{
	var ps = props.split(",");
	for(var i=0; i < ps.length ;i++)
	{
		__setlistener(ps[i],obj, callback);
	}	
}


function __setlistener(prop, obj, callback)
{	
	var val = obj[prop],
	getter = function ()	
	{ 
		return val; 

	},
	setter = function (nv) 
	{
		val = nv;
		callback(prop, nv);
	};
	if (obj.defineProperty) 
	{ 
		obj.defineProperty(obj, prop, {
			get: getter,
			set: setter
		});
	}
	else if (obj.__defineGetter__ &&
			obj.__defineSetter__) 
	{
		obj.__defineGetter__.call(obj, prop, getter);
		obj.__defineSetter__.call(obj, prop, setter);
	}
};


function _getRequest()
{
	var reqxml = null;
	if(window.XMLHttpRequest) 
	{
		try 
		{
			reqxml = new XMLHttpRequest();
		} 
		catch(e) 
		{
			alert("getxmlrequest: "+e.message);
		}
	} 
	else if(window.ActiveXObject)
	{	
		try{
			reqxml=new ActiveXObject('MSXML2.XMLHTTP.5.0');
		}catch(e){
			try{
				reqxml=new ActiveXObject('MSXML2.XMLHTTP.4.0');
			}catch(e){
				try{
					reqxml=new ActiveXObject('MSXML2.XMLHTTP.3.0');
				}catch(e){
					try{
						reqxml=new ActiveXObject('Microsoft.XMLHTTP');
					}catch(e){
						throw new Error('XMLHttpRequest object doesnt not exist');
						return;
					}
				}
			}
		}	
	}	

	return reqxml;
}
