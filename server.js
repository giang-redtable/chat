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

var re_messages = [
  {
    cn:"如果您在西餐期间告诉我们您最喜爱的食物，我会推荐适合您的韩国食物。",
    jp:"日本料理の中で、あなたが好きな食べ物を教えてあげると、あなたに ぴったりの韓国料理をお勧めいたします。",
    en:"If you tell me your favorite food during Western food, I will recommend Korean food."
  },
  {
    cn:"你喜欢 ",
    jp:"あなたは ",
    en:"Do you like "
  },
  {
    cn:" 吗？",
    jp:" が好きですか?",
    en:" ?"
  },
  {
    cn:"你喜欢这些菜单。",
    jp:"あなたは、このようなメニューを好きね",
    en:"You like these menus."
  },
  {
    cn:"我们推荐与您最喜欢的菜单类似的韩国料理。",
    jp:"あなたが好きなメニューと似ている韓国料理をお勧めします。",
    en:"I recommend Korean dishes similar to your favorite menu."
  },
  {
    cn:"这菜单看起来不错吗？",
    jp:"このメニューは、美味しく見えるのか?",
    en:"Does this menu look good?"
  },
  {
    cn:"我可以介绍一家在首尔以烤肉闻名的餐厅吗?",
    jp:"ソウルで焼肉で有名なレストランを紹介してできますか?",
    en:"May I introduce you to a restaurant famous for bulgogi in Seoul?"
  },
  {
    cn:"那么这个菜单怎么样?",
    jp:"これにより、このメニューはいかがですか?",
    en:"So how about this menu?"
  },

];

var sample_menu =
  {
    cn01:{name:"麻辣烫", tag:"#火锅#火锅#涮锅#肉类#海鲜#汤#辣味"},
    cn02:{name:"地三鮮", tag:"#茄子#土豆#灯笼椒#蔬菜#炒"},
    cn03:{name:"烧茄子", tag:"#茄子#油炸#炒"},
    cn04:{name:"煎饼", tag:"#煎饼#香肠#鸡蛋"},
    cn05:{name:"北京烤鸭", tag:"#鸭#烟熏"},
    cn06:{name:"魚香肉絲", tag:"#猪肉#炒#鱼香酱汁#辣味"},
    cn07:{name:"回鍋肉", tag:"#猪肉#五花肉#炒#辣味"},
    cn08:{name:"羊肉串", tag:"#羊肉#烤串#烧烤"},
    cn09:{name:"鐵板牛肉", tag:"#牛肉#蔬菜#炒#铁板"},
    cn10:{name:"宮保鸡丁", tag:"#鸡肉#花生#辣椒#炒#辣味"},

    jp01:{name:"すき焼き", tag:"#牛肉#野菜#豆腐#寄せ鍋"},
    jp02:{name:"天ぷら", tag:"#シーフード#魚#天ぷら"},    
    jp03:{name:"寿司", tag:"#シーフード#魚#刺身#寿司"},
    jp04:{name:"刺身", tag:"#魚#刺身"},
    jp05:{name:"焼き鳥", tag:"#鶏肉#串刺し#焼き"},
    jp06:{name:"トンカツ", tag:"#豚肉#天ぷら#トンカツ"},
    jp07:{name:"しゃぶしゃぶ", tag:"#牛肉#豚肉#野菜#豆腐#しゃぶしゃぶ"},
    jp08:{name:"そば", tag:"#麺#アイス#ソバ"},
    jp09:{name:"うどん", tag:"#麺#うどん"},
    jp10:{name:"ラーメン", tag:"#麺#豚肉"},

    en01:{name:"Beef Steak", tag:"#Beef#Grilled#Steak"},
    en02:{name:"Seafood Pasta", tag:"#Noodle#Seafood#Spicy#Pasta    "},
    en03:{name:"Chicken Soup", tag:"#Chicken#Soup"},
    en04:{name:"Oriental Salad", tag:"#Salad#Vegetables#SoySauce"},
    en05:{name:"Fried Chicken", tag:"#Chicken#Fried"},
    en06:{name:"Pizza", tag:"#Pizza#Cheese#Ham#Vegetables#Meat"},
    en07:{name:"Risotto", tag:"#Rice#Vegetables#Seafood#Porridge"},
    en08:{name:"Hamburger Steak", tag:"#Meat#Steak#Hamburger"},
    en09:{name:"BBQ", tag:"#Beef#Pork#Sausage#Vegetables#Barbeque"},
    en10:{name:"Stew", tag:"#Beef#Pork#Chicken#Vegetables#Stew"},
  };

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
	msg += '<div class="text"><div class="speech-bubble2">'+ data.msg + '</div></div></div></div>';
    
    io.sockets.in('channel'+ data.channelId).emit('receive message', msg);   

    if(data.initSet==''){
      if(!(data.msg==1 || data.msg==2 || data.msg==3 || data.msg==4)){
        msgRe = 'Please input number between 1 and 3.';
        apiResponse(msgRe);
      } else {

        lang = "cn";
        if (data.msg == "1") { lang = "cn" }
        else if (data.msg == "2") { lang = "jp" }
        else if (data.msg == "3") { lang = "en" }

        io.sockets.in('channel'+ data.channelId).emit('init set', lang); 
               
        //login API

        var url = "https://api.redtable.global/chatbot/userreg.php?user="+socket.id;        
        var req = request({
            url: url,
            json: true
        }, (error, response, body) => {
        
            if (!error && response.statusCode === 200) {
                apiResponse(re_messages[0][lang]);                
                setTimeout(()=>firstQuestion(lang),1000);
            }
        })
      }
    } else {

    var sampleData = JSON.parse(data.sampleData);      
    var sampleSelect = JSON.parse(data.sampleSelect);  
    
    lang = data.initSet;

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

      //
      var retValue = '';

      if(sampleSelect.length > 0 && data.recomIdx==0){
        
        retValue += re_messages[3][lang]+'<br/>';

        for (var i = 0; i < sampleSelect.length; i++) {
          retValue += '<h5>'+sample_menu[sampleSelect[i]].name +'</h5>'+ '('+ sample_menu[sampleSelect[i]].tag +')'+'<br/>';
        }        
        apiResponse(retValue);
      }
      

      retValue = '<h5>'+ re_messages[4][lang] +'</h5>';
      var msg = data.msg.toUpperCase();
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
                  
                retValue += '<h5>'+ body.result[0].name + '</h5>' + '('+ body.result[0].tag +')<br/><br/>';
                retValue += '<h5>'+ re_messages[5][lang] + ' (Yes or No)</h5>';

                io.sockets.in('channel'+ data.channelId).emit('recom idx', 1);
                io.sockets.in('channel'+ data.channelId).emit('recom keyword', body.result[0].name);
                apiResponse(retValue);
              }
          })
        } else {        
      
      if (msg == "Y" || msg == 'YES') {
        //메뉴 선택 Yes일 경우
        var url = "http://redtable.global/search.php?w="+ data.recomKeyword +"&city=seoul&lang="+lang+"&srch_type=R";
        retValue = '<h5>'+ re_messages[6][lang] +'</h5>';
        retValue += '<a href="'+url+'" class="ui blue button" target="_blank">Yes</a> or <a href="javascript:answerNo();" class="ui red button">No</a>?';     
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
              retValue += '<strong>Yes</strong> or <strong>No</strong>?';           
            } else {
              //추천메뉴에 대해 No일 경우 다음 메뉴 추천
              
              var arrData = preData.shift();             

              retValue = '<h5>'+ arrData.name + '</h5>' + '('+ arrData.tag +')<br/><br/>';
              retValue += '<h5>'+ re_messages[7][lang] + ' (Yes or No)</h5>';
              io.sockets.in('channel'+ data.channelId).emit('recom keyword', arrData.name);
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

      lang = var1;      
      
      var url = "https://api.redtable.global/chatbot/sample.php?lang="+lang;
      
      var req = request({
          url: url,
          json: true
      }, (error, response, body) => {
      
          if (!error && response.statusCode === 200) {
            
            arrData = body.result.shift();
            sampleSelect = [arrData.code];

            retValue = '<img src="/imgs/'+ arrData.code +'.png" />';
            
            retValue += '<h4>'+ re_messages[1][lang] + arrData.name + '('+ sample_menu[arrData.code].tag +')'+ re_messages[2][lang] + '</h4> <strong>Yes</strong> or <strong>No</strong>?';            
            
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
    retValue += '<h4>'+ re_messages[1][lang] + arrData.name + '('+ sample_menu[arrData.code].tag +')'+ re_messages[2][lang] + '</h4> <strong>Yes</strong> or <strong>No</strong>?';     

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
      msgRT += '<span class="date">'+ getTimeStamp() +'</span></div>';
      msgRT += '<div class="text"><div class="speech-bubble">'+ retMsg +'</div></div></div></div>';
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