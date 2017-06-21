/*
To use this file, stick it in the same directory as the files you want to serve.
Next, open a terminal, cd to the file location, and then type "node server.js"
You may want to do this in a Screen on unix/osx, as you will have to leave it running.
This will only serve on the local network by default.

BASIC WEB PAGE SERVER:
  Once the server is running, it will serve web pages on the local network using port 8888.
  If you want to change the port, you can do it below or pass it in as an argument when you start the server.
  Example:
  http://localhost:8888/index.html ==>serves your page.

SOCKET.IO:
  This script contains a portion at the end which allows socket.io connections.
  To use it, make sure that the web apps have the EXACT SAME VERSION of socket.io

RESTful API:
  To send rest commands, add /rest? to the URL, and then include whatever data you want to send.
  There is an empty function rest_request at the bottom of this script that reacts to REST requests.
  For example:
  http://localhost:8888/rest?working=yes&level=11 ==>  creates a data object in rest_request with the values { working: 'yes', level: '11' }

POST DATA:
  If the serve request contains POST information, then everything else is bypassed, and the post data is passed into 
  the currently empty function deal_with_post_data at the bottom of this script.
*/

//import basic libraries.  If you don't have one, try typing npm instal <package name> into your terminal.
var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    qs = require('querystring');
    port = process.argv[2] || 8888;//<--------Change port here, if needed
var queryString = require( "querystring" );
var htmlRequest = require("request");

//below creates the server functionality.
//You shouldn't need to change this.
var server = http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  var contentTypesByExtension = {
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript",
    '.jpg': "image/jpeg",
    '.png': "image/png"
  };

  //deal with post requests:
  if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;

            // Too much POST data, kill the connection!
            if (body.length > 1e6)
                request.connection.destroy();
        });
        request.on('end', function () {
            try {
              var post = JSON.parse(body);
              deal_with_post_data(request,post);
              response.writeHead(200, {"Content-Type": "text/plain"});
              response.end();
              return;
            }catch (err){
              response.writeHead(500, {"Content-Type": "text/plain"});
              response.write("Bad Post Data.  Is your data a proper JSON?\n");
              response.end();
              return;
            }
        });
    }



  //grab out REST requests and handle those, otherwise work as a normal file server.
  else if(uri=='/rest'){
    try {
      rest_request(url.parse(request.url,true).query);
      response.writeHead(200, {"Content-Type": "text/plain"});
      response.end();
      return;
    }catch (err){
      response.writeHead(500, {"Content-Type": "text/plain"});
      response.write("Bad REST request.\n");
      response.end();
      return;
    }

  }else{
    //return an error if a page is requested that does not exist.
    fs.exists(filename, function(exists) {
      if(!exists) {
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
        return;
    }

    //by default, if no page is requested, serve index.html
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    //read the requested file and serve it up.
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      var headers = {};
      var contentType = contentTypesByExtension[path.extname(filename)];
      if (contentType) headers["Content-Type"] = contentType;
      response.writeHead(200, headers);
      response.write(file, "binary");
      response.end();
    });
  
  });
  }
}).listen(parseInt(port, 10),'0.0.0.0');
//}).listen(parseInt(port, 10),'10.154.16.158');

console.log("server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");


//START OF GET YOUR IP ADDRESS
var os = require('os');
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log('Your IP address:' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log("Your IP address:", iface.address);
    }
    ++alias;
  });
});
//END OF GET YOUR IP ADDRESS

/*
The following chunk of script adds socket.io support.
You will need to make sure that the wedpage imports the exact same version of socket.io.
NOTE!  Socket.io support can be spotty on older mobiles and tablets.
*/

var io = require('socket.io').listen(server);
io.sockets.on('connection', function (socket) {
	console.log("socket connected!");
    //give the page the current physical button state:
    socket.emit("button",current_state);

    socket.on('button', function (message) {
        if (yun_ip==""){
          console.log("No Yun found!")
        }else{
          console.log("Updating Yun...");
          if (current_state=="lit"){
            htmlRequest("http://"+yun_ip+"/data/put/button/off", function(error, response, body) {})
          }
          if (current_state=="off"){
            htmlRequest("http://"+yun_ip+"/data/put/button/lit", function(error, response, body) {})
          }
        }        
    });

  //to send data to all connected sockets:
  //io.emit('message', data);

});

//change this function if you want to do something with REST requests!
function rest_request(data){ 
  console.log(data);
}

//change this function if you want to do something with POST requests!
var yun_ip = "";
function deal_with_post_data(this_request,data){
	if ('action' in data && 'name' in data && data['action'] == "register"){
		yun_ip = this_request.connection.remoteAddress;
		var this_name = data['name'];
    console.log("Got info for a new Yun!")
		check_yun_for_updates();
	}else{
		console.log(data);
  	}

  
}

//create a variable to hold the current state of the LED, either 'lit' or 'off'.
var current_state = 'lit';
var old_state = 'lit';
function check_yun_for_updates(){
  htmlRequest("http://"+yun_ip+"/data/get/button", function(error, response, body) {
    try{
      current_state = JSON.parse(body)['value'];
      if (current_state!=old_state){
        console.log("Change detected!");
        io.emit("button",current_state);
        old_state = current_state;
      }
    }catch(err){}
    check_yun_for_updates();
  });

}
