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
    
    io.sockets.in('channel'+ data.channelId).emit('receive message', msg);   

    if(data.initSet==''){
      if(!(data.msg==1 || data.msg==2 || data.msg==3 || data.msg==4)){
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
                apiResponse('지금부터 몇개의 메뉴를 보여드릴거에요 마음에 드시면 "Y" 아니시면 "N"을 입력해 주세요.');                
                setTimeout(()=>firstQuestion(data.msg),1000);
            }
        })
      }
    } else {

    var sampleData = JSON.parse(data.sampleData);      
    var sampleSelect = JSON.parse(data.sampleSelect);  
    
    lang = "kr";
	  if (data.initSet == "2") { lang = "cn" }
	  else if (data.initSet == "3") { lang = "jp" }
    else if (data.initSet == "4") { lang = "en" }
    
    if(sampleData.length > 0) { //Sample data 남아있을 경우 계속 보여주면서  N일 경우 해당code pop

      if(data.msg==="n" || data.msg==="N" || data.msg==="no" || data.msg==="No") {
        sampleSelect.pop();
      }
      
      //Sample data view
      SampleQuestion(sampleData, sampleSelect);

    } else {

      if(data.preData==='' && data.recomIdx==0){
        if(data.msg==="n" || data.msg==="N" || data.msg==="no" || data.msg==="No") {
          sampleSelect.pop();          
        }
      } else {
        var preData = JSON.parse(data.preData);      
      }

      var retValue = '<h5>이런 메뉴는 어떠신가요? (Y/N)</h5>';
      var msg = data.msg;
      //var preData = JSON.parse(data.preData);      

      if(data.recomIdx==0) {
      //첫 추천은 API call 50개의 추천 메뉴정보 가져옴
      
      var ids = "";

      for (var i = 0; i < sampleSelect.length; i++) {
        ids += "," + sampleSelect[i];
      }
      
      ids = ids.substring(1);
      
      io.sockets.in('channel'+ data.channelId).emit('base cd', ids);
      
      var url = "https://api.redtable.global/chatbot/recommend.php?user="+socket.id+"&method=sample&menu="+ids+"&index=0";
      
          var req = request({
              url: url,
              json: true
          }, (error, response, body) => {
          io.sockets.in('channel'+ data.channelId).emit('pre data', body.result);
          io.sockets.in('channel'+ data.channelId).emit('sample select', sampleSelect);
              
          //console.log(body);
              if (!error && response.statusCode === 200) {            
                  retValue += body.result[0].name + '<br>';
                  io.sockets.in('channel'+ data.channelId).emit('recom idx', 1);
                  apiResponse(retValue);
              }
          })
        } else {        
      
      if (msg == "y") {
        //메뉴 선택
        var url = "https://api.redtable.global/v3/restaurant_partner.php?city=seoul&search=초밥";
        retValue = '<h5>선택하신 메뉴를 판매하는 레스토랑 정보를 드릴까요?</h5>';
        retValue += '<a class="ui button blue">Yes</a> or <a class="ui button red">No</a>?';     
        apiResponse(retValue);

      } else if (data.recomIdx == 0) {
        //다음 메뉴
        var url = "https://api.redtable.global/chatbot/recommend.php?user="+socket.id+"&method=sample&menu="+data.baseCd+"&index=" + data.recomIdx;
        
        var req = request({
          url: url,
          json: true
        }, (error, response, body) => {
          if(!error && response.statusCode === 200) {

            retValue += '<strong>' + body.result[0].name + '</strong><br/>';

            io.sockets.in('channel'+ data.channelId).emit('pre data', body.result);              
            io.sockets.in('channel'+ data.channelId).emit('recom idx', data.recomIdx + 1);
            apiResponse(retValue);
          }
        })        
        
      } else {
            if(data.recomIdx % 50==0){
              retValue = '<h5>추천 메뉴가 마음에 안드시면 처음부터 다시 진행하시겠습니까?</h5>';
              retValue += '<a class="ui button blue">Yes</a> or <a class="ui button red">No</a>?';           
            } else {
              var arrData = preData.shift();
              //retValue += preData[data.recomIdx % 50].name + '<br>';
              retValue += arrData.name + '<br>';
            }
            io.sockets.in('channel'+ data.channelId).emit('pre data', preData);
            io.sockets.in('channel'+ data.channelId).emit('recom idx', data.recomIdx + 1);
            apiResponse(retValue);
      }
        }
      }
    }

    var firstQuestion = function(var1,callback) {
      var lang;
      var retValue = "";
      var arrData = "";
      var sampleSelect = [];

      lang = "kr";
      if (var1 == 2) { lang = "cn" }
      else if (var1 == 3) { lang = "jp" }
	    else if (var1 == 4) { lang = "en" }
      
      var url = "https://api.redtable.global/chatbot/sample.php?lang="+lang;
      
      var req = request({
          url: url,
          json: true
      }, (error, response, body) => {
      
          if (!error && response.statusCode === 200) {
            
            arrData = body.result.shift();
            sampleSelect = [arrData.code];

            retValue = '<img src="/imgs/'+ arrData.code +'.png" />';
            retValue += '<h3>'+ arrData.name + '</h3> <a class="ui button blue">Yes</a> or <a class="ui button red">No</a>?';            
            
            io.sockets.in('channel'+ data.channelId).emit('sample data', body.result);
            io.sockets.in('channel'+ data.channelId).emit('sample select', sampleSelect);
			      io.sockets.in('channel'+ data.channelId).emit('method', 'sample');  
            
            apiResponse(retValue);
          }
      })     
    }
  
  function SampleQuestion(var1, var2) {    
    
    var retValue = "";    
    var arrData = var1.shift();    
    var2.push(arrData.code);        

    retValue = '<img src="/imgs/'+ arrData.code +'.png"/>';
    retValue += '<h3>'+ arrData.name + '</h3> <a class="ui button blue">Yes</a> or <a class="ui button red">No</a>?';     

    io.sockets.in('channel'+ data.channelId).emit('sample data', var1);
    io.sockets.in('channel'+ data.channelId).emit('sample select', var2);
    
    apiResponse(retValue);
  }
	
	var historyQuestion = function(var1,callback) {
      var lang;
      var retValue = "";

	  var url = "https://api.redtable.global/chatbot/recommend.php?user="+socket.id+"&method=history&index=0";
      
      var req = request({
			url: url,
			json: true
		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				retValue = '이런 메뉴는 어떠신가요? (y/n)<br/>' + body.result[0].name + '<br>';
				io.sockets.in('channel'+ data.channelId).emit('pre data', body.result);  
				io.sockets.in('channel'+ data.channelId).emit('recom idx', 0);
				io.sockets.in('channel'+ data.channelId).emit('method', 'history');
				io.sockets.in('channel'+ data.channelId).emit('base cd', '');
				
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