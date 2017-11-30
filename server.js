var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var https = require('https');


app.use('/semantic', express.static(__dirname + '/semantic'));
app.use('/imgs', express.static(__dirname + '/imgs'));

app.get('/',function(req, res){
  res.sendFile(__dirname + '/client.html');
});



var count=1;
var connectionCount = 1
io.on('connection', function(socket){
  console.log('user connected: ', socket.id);  
  var name = count++;

  socket.on('join:channel', function(data) {
    socket.join('channel' + data.channelId);
    console.log('Channel Join:'+ data.channelId);
  });
  
  console.log('connectionCount:'+connectionCount);

  io.to(socket.id).emit('change name',name);

  socket.on('disconnect', function(){
    console.log('user disconnected: ', socket.id);
  });

  socket.on('send message', function(data){

  var msg;
  var msgRT;
  var msgRe;
	var avatarNum = (data.userName % 4) + 1;

	msg = '<div class="comment" style="text-align:right"><a class="avatar" style="float:right;"><img src="/imgs/avatar/'+ avatarNum +'.jpg"></a><div class="content" style="margin-left:0;margin-right:3.5em;"><a class="author">Guest('+ socket.id +')</a><div class="metadata">';
	msg += '<span class="date">'+ getTimeStamp() +'</span></div>'
	msg += '<div class="text">'+ data.msg + '</div></div></div>';

    //console.log(msg);
    io.sockets.in('channel'+ data.channelId).emit('receive message', msg);   

    if(data.initSet==''){
      if(!(data.msg==1 || data.msg==2)){
        msgRe = '1 (한식) 또는 2 (中餐)를 입력해 주세요.';
      } else {
        io.sockets.in('channel'+ data.channelId).emit('init set', data.msg); 
        
        //login API      
        var url = "https://api.redtable.global/chatbot/userreg.php?user="+socket.id;
  
        var req = https.get(url, function(res) {
          var bodyChunks = [];
          res.on('data', function(chunk) {          
            bodyChunks.push(chunk);
          }).on('end', function() {
            var body = Buffer.concat(bodyChunks);
            body = JSON.parse(body);
            
            if(body.result=="OK"){
              msgRe = '사용자 인증에 성공했습니다.';
            } else {
              msgRe = '사용자 인증에 실패했습니다.';
            }
  
          })
        });
        
        req.on('error', function(e) {
          console.log('ERROR: ' + e.message);
        });  
      }
    } else {
              
      
    }
    
    setTimeout(apiResponse,500);    

    function apiResponse(){
	  msgRT = '<div class="comment"><a class="avatar"><img src="/imgs/avatar/5.jpg"></a><div class="content"><a class="author">REDTABLE</a><div class="metadata">';
	  msgRT += '<span class="date">'+ getTimeStamp() +'</span></div>'
	  msgRT += '<div class="text">'+ msgRe +'</div></div></div>';
      io.sockets.in('channel'+ data.channelId).emit('receive message', msgRT);
    }

  });

});

function getTimeStamp() {
  var d = new Date();
  var s =
	leadingZeros(d.getFullYear(), 4) + '-' +
	leadingZeros(d.getMonth() + 1, 2) + '-' +
	leadingZeros(d.getDate(), 2) + ' ' +

	leadingZeros(d.getHours(), 2) + ':' +
	leadingZeros(d.getMinutes(), 2) + ':' +
	leadingZeros(d.getSeconds(), 2);

  return s;
}

function leadingZeros(n, digits) {
  var zero = '';
  n = n.toString();

  if (n.length < digits) {
	for (i = 0; i < digits - n.length; i++)
	  zero += '0';
  }
  return zero + n;
}

http.listen(3000, function(){
  console.log('server on!');
});