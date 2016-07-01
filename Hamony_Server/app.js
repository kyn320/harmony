var express = require('express');
var path = require('path');
var multer = require('multer');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes/index');
var users = require('./routes/users');
var app = express();
var port = 9000;
var http = require('http');
var server = http.createServer(app).listen(port, function () {
    console.log('[Server] 서버 열림 : ' + port);
});
var mongoose = require('mongoose');
var fs = require('fs');
var done = false;

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



//app.use(multer());
/*{
dest: './image/'
, rename: function (fieldname, filename) {
    return Date.now();
}
, onFileUploadStart: function (file) {
    console.log(file.originalname + ' is starting ...');
}
, onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path);
}
}
*/

//DB 설정
mongoose.connect("mongodb://localhost/Hamony");

//DB 로드
var Schema = mongoose.Schema;

// DB 구조를 선언
var User_Schema = new Schema({
    id: String, //아이디
    pw: String, //패스워드
    email: String, //이메일
    name: String, //닉네임
    sex: String, //성별
    joinopinion: [Number] //참여한 의견글 
});

var Comment_Schema = new Schema({
    bulletinid: Number, // 게시글 번호
    id: Number, // 댓글 번호
    time: {
        type: Date
        , default: Date.now
    }, //작성 시간
    name: String, // 닉네임
    content: String, // 내용
    likejoin: [String], //공감한 사람
    like: Number // 공감 수
});

var Opinion_Schema = new Schema({
    bulletinid: Number, // 게시글 번호
    id: Number, // 의견 번호
    time: {
        type: Date
        , default: Date.now
    }, //작성 시간
    name: String, // 닉네임
    content: String, // 내용
    likejoin: [String], // 공감한 사람
    like: Number, // 공감 수
    select: Number // 찬성 1 | 반대 2
});

var Bulletin_Schema = new Schema({
    id: Number, // 게시글 번호
    time: {
        type: Date
        , default: Date.now
    }, // 작성 시간
    title: String, // 제목
    content: String, // 내용
    click: Number, // 조회수
    option: Boolean, // 익명성 여부
    current: Number, // 진행 정도
    select: Number, // 자유 발언 1 | 찬반 토론 2 | 투표 3
    likejoin: [String]
    , like: Number, // 공감 수
    tag: String, // 태그
    img: String, // 이미지
    settime: Date, // 종료 시간
    votejoin: [String]
    , vote: [Number], //투표 수  vote[0] == 찬성 | vote[1] == 반대
});

// DATABASE 선언
var USER_DATABASE = mongoose.model('User', User_Schema, "User");
var BULLETIN_DATABASE = mongoose.model('Bulletin', Bulletin_Schema, "Bulletin");
var COMMENT_DATABASE = mongoose.model('Comment', Comment_Schema, "Comment");
var OPINION_DATABASE = mongoose.model('Opinion', Opinion_Schema, "Opinion");

//로그인 요청
app.post('/login', function (req, res) {
    if (req.query.id && req.query.pw) {
        //DB에서 검색합니다. >> 아이디가 존재 하는가?
        USER_DATABASE.findOne({
            id: req.query.id
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else if (db_RESULT.pw == req.query.pw) {
                //로그인 성공
                console.log("[로그인]" + db_RESULT.name);
                res.send(JSON.stringify(db_RESULT));
            }
        });
    } else {
        res.send({
            "error": "login_null"
        });
    }
});

//회원가입 요청
app.post('/signup', function (req, res) {
    if (req.query.id && req.query.pw && req.query.email && req.query.name && req.query.sex) {
        //DB에서 검색합니다. >> 아이디 또는 닉네임 또는 이메일이 중복되는가?
        USER_DATABASE.findOne({
            $or: [{
                id: req.query.id
            }, {
                name: req.query.name
            }, {
                email: req.query.email
            }]
        }, function (e, db_RESULT) {
            console.log(db_RESULT);
            if (e)
                throw e;
            else if (db_RESULT != null && db_RESULT.id == req.query.id) {
                //아이디 중복
                console.log("[중복]" + req.query.id + "은 존재하는 아이디");
                res.send({
                    "error": "id_over"
                });
            } else if (db_RESULT != null && db_RESULT.name == req.query.name) {
                // 닉네임 중복
                console.log("[중복]" + req.query.name + "은 존재하는 닉네임");
                res.send({
                    "error": "name_over"
                });
            } else if (db_RESULT != null && db_RESULT.email == req.query.email) {
                // 이메일 중복
                console.log("[중복]" + req.query.email + "은 존재하는 이메일");
                res.send({
                    "error": "email_over"
                });
            } else {
                // 성공
                console.log("[회원가입]" + req.query.id + " | " + req.query.name);
                var data = new USER_DATABASE({
                    id: req.query.id, // 아이디 
                    pw: req.query.pw, // 비밀번호   
                    email: req.query.email, // 이메일    
                    name: req.query.name, // 닉네임
                    sex: req.query.sex, //성별
                    joinopinion: null // 참여한 찬반의견
                });
                data.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send(JSON.stringify(data));
            }
        });
    } else {
        //빈칸 존재
        res.send({
            "error": "signup_null"
        });
    }
});

//게시글 리스트 요청
app.post('/bulletinlist', function (req, res) {
    if (req.query.please == 1) { // 최신순
        console.log("[리스트 요청] 최신순");
        BULLETIN_DATABASE.find({}).sort({
            date: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.send(JSON.stringify(db_RESULT));
        });
    } else if (req.query.please == 2) { // 핫 스팟
        console.log("[리스트 요청] 핫스팟");
        BULLETIN_DATABASE.find({}).sort({
            click: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.send(JSON.stringify(db_RESULT));
        });
    } else if (req.query.please == 3) { // 진행률
        console.log("[리스트 요청] 진행률");
        BULLETIN_DATABASE.find({}).sort({
            current: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.send(JSON.stringify(db_RESULT));
        });
    }
});

app.post('/clicked', function (req, res) {
    BULLETIN_DATABASE.findOne({
        id: req.query.bulletinid
    }, function (e, db_RESULT) {
        if(e)
            throw e;
        else if(db_RESULT != null){
            ++db_RESULT.click;
            db_RESULT.save(function(e){
                if (e)
                    throw e;
            });
        }
    });
});

//게시글 작성 요청
app.post('/writebulletin', function (req, res) {
    // 게시글 번호 지정을 위한 Collection Count
    BULLETIN_DATABASE.count({}, function (e, c) {
        if (e)
            throw e;
        else {
            var data = new BULLETIN_DATABASE({
                id: c + 1, // 게시글 번호
                time: new Date, // 작성 시간
                title: req.query.title, // 제목
                content: req.query.bulletincontent, // 내용
                click: 0, // 조회수
                option: Boolean(req.query.option), // 익명성 여부
                current: 0, // 진행 정도
                select: parseInt(req.query.bulletinselect), // 자유 발언 1 | 찬반 토론 2 | 투표 3
                like: 0, // 공감 수
                tag: req.query.tag, // 태그
                //img: filePath, // 이미지
                //settime: req.query.exittime, // 종료 시간
                vote: new Array[2], //투표 수  vote[0] == 찬성 | vote[1] == 반대
                comment: null // 댓글
            });
            data.save(function (e) {
                if (e)
                    throw e;
            });
            //데이터를 전송합니다.
            res.end(JSON.stringify(data));
        }
    });
});

//댓글 보기 요청
app.post('/seecomment', function (req, res) {
    COMMENT_DATABASE.find({
        bulletinid: req.query.bulletinid
    }).sort({
        date: -1
    }).limit(15).exec(function (e, db_RESULT) {
        if (e)
            throw e;
        else
            res.send(db_RESULT);
    });
});

//댓글 작성요청
app.post('/writecomment', function (req, res) {
    COMMENT_DATABASE.count({
        bulletinid: req.query.bulletinid
    }, function (e, c) {
        if (e)
            throw e;
        else {
            var data = new COMMENT_DATABASE({
                bulletinid: parseInt(req.query.bulletinid), // 게시글 번호 
                id: c + 1, // 댓글 번호
                time: new Date, //작성 시간
                name: req.query.name, // 닉네임
                content: req.query.commentcontent, // 내용
                like: 0 // 공감 수
            });
            data.save(function (e) {
                if (e)
                    throw e;
            });
            res.send(JSON.stringify(data));
        }
    });
});

//투표 요청
app.post('/vote', function (req, res) {
    BULLETIN_DATABASE.findOne({
        id: req.query.bulletinid
    }, function (e, db_RESULT) {
        if (e)
            throw e;
        else {
            if (db_RESULT.votejoin.indexOf(req.query.name) == -1) {
                db_RESULT.votejoin.push(req.query.name);
                if (req.query.vote == 0) {
                    ++db_RESULT.vote[0];
                } else {
                    ++db_RESULT.vote[1];
                }
                db_RESULT.save(function (err) {
                    res.send({
                        "error": "vote_fail"
                    });
                });
                res.send(db_RESULT.vote);
            }
        }
    });
});


//의견 보기 요청
app.post('/seeopinion', function (req, res) {
    OPINION_DATABASE.find({
        bulletinid: req.query.bulletinid
    }).sort({
        date: -1
    }).limit(15).exec(function (e, db_RESULT) {
        if (e)
            throw e;
        else
            res.send(db_RESULT);
    });
});

//의견 작성 요청
app.post('/writeopinion', function (req, res) {
    OPINION_DATABASE.count({
        select: req.query.opinionselect
    }, function (e, c) {
        if (e)
            throw e;
        else {
            if (req.query.joincomment.indexOf(req.query.bulletinid) == -1) {
                var data = new OPINION_DATABASE({
                    bulletinid: parseInt(req.query.bulletinid), // 게시글 번호    
                    id: c + 1, // 의견 번호
                    time: new Date, // 작성 시간
                    name: req.query.name, // 닉네임
                    content: req.query.opinioncontent, // 내용
                    like: 0, // 공감 수
                    select: parseInt(req.query.opinionselect) // 찬성 1 | 반대 2
                });
                data.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send(data);
            }
        }
    });
});

//공감 요청
app.post('/like', function (req, res) {
    if (req.query.what == "bulletin") {
        BULLETIN_DATABASE.findOne({
            id: req.query.bulletinid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.query.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send(db_RESULT.like);
            }
        });
    } else if (req.query.what == "comment") {
        COMMENT_DATABASE.findOne({
            id: req.query.commentid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.query.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send(db_RESULT.like);
            }
        });
    } else
    if (req.query.what == "opinion") {
        OPINION_DATABASE.findOne({
            id: req.query.opinionid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.query.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send(db_RESULT.like);
            }
        });
    }
});



module.exports = app;