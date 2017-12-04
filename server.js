var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var https = require('https');
var request = require('request');


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
        apiResponse(msgRe);
      } else {
        io.sockets.in('channel'+ data.channelId).emit('init set', data.msg); 
               
        //login API

        var url = "https://api.redtable.global/chatbot/userreg.php?user="+socket.id;        
        var req = request({
            url: url,
            json: true
        }, (error, response, body) => {
        
            if (!error && response.statusCode === 200) {
                //console.log(body) // Print the json response
                apiResponse('다음 메뉴 중 좋아하시는 메뉴를 선택하시면, 추천해드릴게요');                
                setTimeout(()=>firstQuestion(data.msg),1000);
            }
        })       
      }
    } else {
      lang = data.initSet == "1" ? "kr":"cn";
      var url = "https://api.redtable.global/chatbot/recommend.php?user="+socket.id+"&method=sample&menu=kr06,kr05&index=0";
      var retValue = '이런 메뉴는 어떠신가요? <br/>';
      //console.log('baseCd: '+data.recomIdx);
      //console.log('recomIdx: '+data.recomIdx);

      if(data.recomIdx==0) {
        //첫 추천은 API call 50개의 추천 메뉴정보 가져옴
        var req = request({
            url: url,
            json: true
        }, (error, response, body) => {
            io.sockets.in('channel'+ data.channelId).emit('pre data', body);  
            //console.log(body);
            if (!error && response.statusCode === 200) {
                for(var i in body) {
                  for(var j=data.recomIdx;j < Number(data.recomIdx)+3; j++) {                    
                    retValue += body[i][j].name + '<br>';
                  }
                }
                io.sockets.in('channel'+ data.channelId).emit('recom idx', Number(data.recomIdx)+3);  
                apiResponse(retValue);
            }
        }) 
      } else {
        //console.log(data.preData);
        var body = JSON.parse(data.preData);
        for(var i in body) {
          for(var j=data.recomIdx;j < Number(data.recomIdx)+3; j++) {                    
            retValue += body[i][j].name + '<br>';
          }
        }
        io.sockets.in('channel'+ data.channelId).emit('recom idx', Number(data.recomIdx)+3);  
        apiResponse(retValue);
      }
    }

    var firstQuestion = function(var1,callback) {
      var lang;
      var retValue = "";

      lang = var1 == 1 ? "kr":"cn";
      var url = "https://api.redtable.global/chatbot/sample.php?lang="+lang;
      
      var req = request({
          url: url,
          json: true
      }, (error, response, body) => {
      
          if (!error && response.statusCode === 200) {
              for(var i in body) {
                for(var j in body[i]) {
                  //retValue += '<input type="checkbox" name=chk'+j+'> ' + body[i][j].name + '<br>';             
                  retValue += j +'. ' + body[i][j].name + '<br>';
                }
              }
              apiResponse(retValue);
          }
      })     
    }    
    
    function apiResponse(retMsg){   
	  msgRT = '<div class="comment"><a class="avatar"><img src="/imgs/avatar/5.jpg"></a><div class="content"><a class="author">REDTABLE</a><div class="metadata">';
	  msgRT += '<span class="date">'+ getTimeStamp() +'</span></div>'
	  msgRT += '<div class="text">'+ retMsg +'</div></div></div>';
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