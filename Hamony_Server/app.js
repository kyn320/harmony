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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
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
var USER_DATABASE = mongoose.model('User', User_Schema);
var BULLETIN_DATABASE = mongoose.model('Bulletin', Bulletin_Schema);
var COMMENT_DATABASE = mongoose.model('Comment', Comment_Schema);
var OPINION_DATABASE = mongoose.model('Opinion', Opinion_Schema);

//로그인 요청
app.post('/login', function (req, res) {
    if (req.body.id && req.body.pw) {
        //DB에서 검색합니다. >> 아이디가 존재 하는가?
        USER_DATABASE.findOne({
            id: req.body.id
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else if (db_RESULT.pw == req.body.pw) {
                //로그인 성공
                console.log("[로그인]" + db_RESULT.name);
                console.log("[전송]" + JSON.stringify(db_RESULT));
                res.end(JSON.stringify(db_RESULT));
            }
        });
    }
});

//회원가입 요청
app.post('/signup', function (req, res) {
    if (req.body.id && req.body.pw && req.body.email && req.body.name && req.body.sex) {
        //DB에서 검색합니다. >> 아이디 또는 닉네임 또는 이메일이 중복되는가?
        USER_DATABASE.findOne({
            $or: [{
                id: req.body.id
            }, {
                name: req.body.name
            }, {
                email: req.body.email
            }]
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else if (db_RESULT.id == req.body.id) {
                //아이디 중복
                console.log("[중복]" + req.body.id + "은 존재하는 아이디");
                res.end(1);
            } else if (db_RESULT.name == req.body.name) {
                // 닉네임 중복
                console.log("[중복]" + req.body.name + "은 존재하는 닉네임");
                res.end(2);
            } else if (db_RESULT.email == req.body.email) {
                // 이메일 중복
                console.log("[중복]" + req.body.email + "은 존재하는 이메일");
                res.end(3);
            } else {
                // 성공
                console.log("[회원가입]" + req.body.id + " | " + req.body.name);
                new USER_DATABASE({
                    id: req.body.id // 아이디 
                    , pw: req.body.pw // 비밀번호   
                    , email: req.body.email // 이메일    
                    , name: req.body.name // 닉네임
                    , sex: req.body.sex, //성별
                    joinopinion: null // 참여한 찬반의견
                }).save(function (e) {
                    if (e)
                        throw e;
                });
                res.end(4);
            }
        });
    } else {
        //빈칸 존재
        res.end(0);
    }
});

//게시글 리스트 요청
app.post('/bulletinlist', function (req, res) {
    if (req.body.please == 1) { // 최신순
        BULLETIN_DATABASE.find({}).sort({
            date: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.end(JSON.stringify(db_RESULT));
        });
    } else if (req.body.please == 2) { // 핫 스팟
        BULLETIN_DATABASE.find({}).sort({
            click: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.end(JSON.stringify(db_RESULT));
        });
    } else if (req.body.please == 3) { // 진행률
        BULLETIN_DATABASE.find({}).sort({
            current: -1
        }).limit(20).exec(function (e, db_RESULT) {
            res.end(JSON.stringify(db_RESULT));
        });
    }
});

//게시글 작성 요청
app.post('/writebulletin', function (req, res) {
    // 게시글 번호 지정을 위한 Collection Count
    BULLETIN_DATABASE.count({}, function (e, c) {
        if (e)
            throw e;
        else {
            console.log("[작성중]ㅁㄴㅇ");
            new BULLETIN_DATABASE({
                id: c + 1, // 게시글 번호
                time: new Date, // 작성 시간
                title: req.body.title, // 제목
                content: req.body.bulletincontent, // 내용
                click: 0, // 조회수
                option: req.body.option, // 익명성 여부
                current: 0, // 진행 정도
                select: req.body.bulletinselect, // 자유 발언 1 | 찬반 토론 2 | 투표 3
                like: 0, // 공감 수
                tag: req.body.tag, // 태그
                //img: filePath, // 이미지
                settime: req.body.exittime, // 종료 시간
                vote: 0, //투표 수  vote[0] == 찬성 | vote[1] == 반대
                comment: null // 댓글
            }).save(function (e) {
                if (e)
                    throw e;
            });
        }
    });
});

//댓글 작성요청
app.post('/writecomment', function (req, res) {
    COMMENT_DATABASE.count({
        bulletinid: req.body.bulletinid
    }, function (e, c) {
        if (e)
            throw e;
        else {
            new COMMENT_DATABASE({
                bulletinid: req.body.bulletinid // 게시글 번호 
                , id: c + 1, // 댓글 번호
                time: new Date, //작성 시간
                name: req.body.name, // 닉네임
                content: req.body.commentcontent, // 내용
                like: 0 // 공감 수
            }).save(function (e) {
                if (e)
                    throw e;
            });
        }
    });
});

//댓글 보기 요청
app.post('/seecomment', function (req, res) {
    COMMENT_DATABASE.find({
        bulletinid: req.body.bulletinid
    }).sort({
        date: -1
    }).limit(15).exec(function (e, db_RESULT) {
        if (e)
            throw e;
        else
            res.end(db_RESULT);
    });
});

//투표 요청
app.post('/vote', function (req, res) {
    BULLETIN_DATABASE.findOne({
        id: req.body.bulletinid
    }, function (e, db_RESULT) {
        if (e)
            throw e;
        else {
            if (db_RESULT.votejoin.indexOf(req.body.name) == -1) {
                if (req.body.vote == 0)
                    ++db_RESULT.vote[0];
                else
                    ++db_RESULT.vote[1];
            }
        }
    });
});


//의견 보기 요청
app.post('/seeopinion', function (req, res) {
    OPINION_DATABASE.find({
        bulletinid: req.body.bulletinid
    }).sort({
        date: -1
    }).limit(15).exec(function (e, db_RESULT) {
        if (e)
            throw e;
        else
            res.end(db_RESULT);
    });
});

//의견 작성 요청
app.post('/writeopinion', function (req, res) {
    OPINION_DATABASE.count({
        select: req.body.opinionselect
    }, function (e, c) {
        if (e)
            throw e;
        else {
            if (req.body.joincomment.indexOf(req.body.bulletinid) == -1) {
                new OPINION_DATABASE({
                    bulletinid: req.body.bulletinid, // 게시글 번호    
                    id: c + 1, // 의견 번호
                    time: new Date, // 작성 시간
                    name: req.body.name, // 닉네임
                    content: req.body.opinioncontent, // 내용
                    like: 0, // 공감 수
                    select: req.body.opinionselect // 찬성 1 | 반대 2
                }).save(function (e) {
                    if (e)
                        throw e;
                });
            }
        }
    });
});

//공감 요청
app.post('/like', function (req, res) {
    if (req.body.what == "bulletin") {
        BULLETIN_DATABASE.findOne({
            id: req.body.bulletinid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.body.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
            }
        });
    } else if (req.body.what == "comment") {
        COMMENT_DATABASE.findOne({
            id: req.body.commentid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.body.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
            }
        });
    } else if (req.body.what == "opinion") {
        OPINION_DATABASE.findOne({
            id: req.body.opinionid
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else {
                if (db_RESULT.likejoin.indexOf(req.body.name) == -1)
                    ++db_RESULT.like;
                else
                    --db_RESULT.like;
            }
        });
    }
});



module.exports = app;