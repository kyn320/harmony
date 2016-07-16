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
var formidable = require('formidable');
var mime = require('mime');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public2')));

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
        type: Date,
        default: Date.now
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
        type: Date,
        default: Date.now
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
        type: Date,
        default: Date.now
    }, // 작성 시간
    title: String, // 제목
    content: String, // 내용
    click: Number, // 조회수
    option: Boolean, // 익명성 여부
    current: Number, // 진행 정도
    select: Number, // 자유 발언 1 | 찬반 토론 2 | 투표 3
    likejoin: [String],
    like: Number, // 공감 수
    tag: [String], // 태그
    img: String, //{ data: Buffer, contentType: String },
    settime: Date, // 종료 시간
    votejoin: [String],
    vote: [Number], //투표 수  vote[0] == 찬성 | vote[1] == 반대
    comment: Number
});

// DATABASE 선언
var USER_DATABASE = mongoose.model('User', User_Schema, "User");
var BULLETIN_DATABASE = mongoose.model('Bulletin', Bulletin_Schema, "Bulletin");
var COMMENT_DATABASE = mongoose.model('Comment', Comment_Schema, "Comment");
var OPINION_DATABASE = mongoose.model('Opinion', Opinion_Schema, "Opinion");




//로그인 요청
app.post('/login', function (req, res) {
    if (req.body.id && req.body.pw) {
        //DB에서 검색합니다. >> 아이디가 존재 하는가?
        USER_DATABASE.findOne({
            id: req.body.id
        }, function (e, db_RESULT) {
            if (e)
                throw e;
            else if (db_RESULT == null) {
                console.log("[로그인] 존재하지 않는 계정");
                res.send(401);
            } else if (db_RESULT.pw == req.body.pw) {
                //로그인 성공
                console.log("[로그인]" + db_RESULT.name);
                res.send(JSON.stringify({
                    "data": db_RESULT
                }));
            } else if (db_RESULT.pw != req.body.pw) {
                console.log("[로그인] 비밀번호 틀림");
                res.send(402);
            }
        });
    } else {

        res.send(403);
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
            console.log(db_RESULT);
            if (e)
                throw e;
            else if (db_RESULT != null && db_RESULT.id == req.body.id) {
                //아이디 중복
                console.log("[중복]" + req.body.id + "은 존재하는 아이디");
                res.sendStatus(401);
            } else if (db_RESULT != null && db_RESULT.name == req.body.name) {
                // 닉네임 중복
                console.log("[중복]" + req.body.name + "은 존재하는 닉네임");
                res.sendStatus(402);
            } else if (db_RESULT != null && db_RESULT.email == req.body.email) {
                // 이메일 중복
                console.log("[중복]" + req.body.email + "은 존재하는 이메일");
                res.sendStatus(403);
            } else {
                // 성공
                console.log("[회원가입]" + req.body.id + " | " + req.body.name);
                var data = new USER_DATABASE({
                    id: req.body.id, // 아이디 
                    pw: req.body.pw, // 비밀번호   
                    email: req.body.email, // 이메일    
                    name: req.body.name, // 닉네임
                    sex: req.body.sex, //성별
                    joinopinion: null // 참여한 찬반의견
                });
                data.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send({
                    "error": null
                });
            }
        });
    } else {
        //빈칸 존재
        res.sendStatus(404);
    }
});

//게시글 리스트 요청
app.post('/bulletinlist', function (req, res) {
    console.log(req.body.skip);
    if (req.body.finddata != undefined && req.body.finddata != null && req.body.finddata != "") {
        if (req.body.findtype == 1) {
            BULLETIN_DATABASE.find({
                title: req.body.finddata
            }).sort({
                time: 1
            }).skip(req.body.skip).limit(20).exec(function (e, db_RESULT) {
                if (db_RESULT == null || db_RESULT.length <= 0) {
                    res.sendStatus(401);
                } else {
                    console.log("title");
                    res.send({
                        "list": true,
                        "data": db_RESULT
                    });
                }
            });
        } else {
            BULLETIN_DATABASE.find({
                tag: req.body.finddata
            }).sort({
                time: 1
            }).skip(req.body.skip).limit(20).exec(function (e, db_RESULT) {
                if (db_RESULT == null || db_RESULT.length <= 0) {
                    res.sendStatus(401);
                } else {
                    console.log("tag");
                    res.send({
                        "list": true,
                        "data": db_RESULT
                    });
                }
            });
        }
    } else if (req.body.please == 1) { // 최신순
        console.log("[리스트 요청] 최신순");
        BULLETIN_DATABASE.find({}).sort({
            time: -1
        }).skip(req.body.skip).limit(20).exec(function (e, db_RESULT) {
            if (db_RESULT == null || db_RESULT.length <= 0) {
                res.sendStatus(401);
            } else
                res.send({
                    "list": true,
                    "data": db_RESULT
                });
        });
    } else if (req.body.please == 2) { // 핫 스팟
        console.log("[리스트 요청] 핫스팟");
        BULLETIN_DATABASE.find({}).sort({
            click: -1
        }).skip(req.body.skip).limit(20).exec(function (e, db_RESULT) {
            if (db_RESULT == null || db_RESULT.length <= 0) {
                res.sendStatus(401);
            } else
                res.send({
                    "list": true,
                    "data": db_RESULT
                });
        });

    } else if (req.body.please == 3) { // 진행률
        console.log("[리스트 요청] 진행률");
        BULLETIN_DATABASE.find({}).sort({
            current: -1
        }).skip(req.body.skip).limit(20).exec(function (e, db_RESULT) {
            if (db_RESULT == null || db_RESULT.length <= 0) {
                res.sendStatus(401);
            } else
                res.send({
                    "list": true,
                    "data": db_RESULT
                });
        });
    } else {
        res.sendStatus(401);
    }

});

app.post('/clicked', function (req, res) {
    BULLETIN_DATABASE.findOne({
        id: req.body.bulletinid
    }, function (e, db_RESULT) {
        if (e)
            throw e;
        else if (db_RESULT != null) {
            ++db_RESULT.click;
            db_RESULT.save(function (e) {
                if (e)
                    throw e;
            });
            res.send({
                "sucess": "clear"
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
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                console.log(fields);
                console.log(files);
                if (Object.keys(files).length == 0) {
                    var data = new BULLETIN_DATABASE({
                        id: c + 1, // 게시글 번호
                        time: new Date(), // 작성 시간
                        title: "asdf", // 제목
                        content: "sadf", // 내용
                        click: 0, // 조회수
                        option: Boolean(1), // 익명성 여부
                        current: 0, // 진행 정도
                        select: 1, // 자유 발언 1 | 찬반 토론 2 | 투표 3
                        like: 0, // 공감 수
                        tag: "1", //req.body.tag.split(','), // 태그
                        img: null, // 이미지
                        settime: +new Date(), // 종료 시간
                        vote: new Array(0, 0), //투표 수  vote[0] == 찬성 | vote[1] == 반대
                        votejoin: new Array(),
                        comment: 0 // 댓글
                    });
                    data.save(function (e) {
                        if (e)
                            throw e;
                    });
                    //데이터를 전송합니다.
                    res.send(JSON.stringify(data));
                } else {
                    fs.readFile(files.image.path, function (e, data) {
                        var dirname = __dirname + "/image/";
                        var file = files.image.name;
                        var total = file.split('.');
                        var newPath = dirname + c + 1 + "_" + file;

                        fs.writeFile(newPath, data, function (e) {
                            if (e)
                                throw e;
                            else {
                                var data = new BULLETIN_DATABASE({
                                    id: c + 1, // 게시글 번호
                                    time: new Date, // 작성 시간
                                    title: "asdf", // 제목
                                    content: "asdf", // 내용
                                    click: 0, // 조회수
                                    option: true, // 익명성 여부
                                    current: 0, // 진행 정도
                                    select: 1, // 자유 발언 1 | 찬반 토론 2 | 투표 3
                                    like: 0, // 공감 수
                                    tag: "1", //req.body.tag.split(','), // 태그
                                    img: newPath, //null, //{ data: fs.readFileSync(newPath), contentType: 'image/'+total[1] }, //이미지
                                    settime: +Date.now(), // 종료 시간
                                    vote: new Array(0, 0), //투표 수  vote[0] == 찬성 | vote[1] == 반대
                                    votejoin: new Array(),
                                    comment: 0 // 댓글
                                });
                                data.save(function (e) {
                                    if (e)
                                        throw e;
                                });

                                //데이터를 전송합니다.
                                res.send(JSON.stringify(data));
                            }
                        });
                    });
                }
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
        else if (db_RESULT == null) {
            res.sendStatus(401);
        } else {
            res.send({
                "comment": true,
                "data": db_RESULT
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
            var data = new COMMENT_DATABASE({
                bulletinid: parseInt(req.body.bulletinid), // 게시글 번호 
                id: c + 1, // 댓글 번호
                time: new Date, //작성 시간
                name: req.body.name, // 닉네임
                content: req.body.commentcontent, // 내용
                like: 0 // 공감 수
            });
            data.save(function (e) {
                if (e)
                    throw e;
            });
            BULLETIN_DATABASE.findOne({
                id: req.body.bulletinid
            }, function (e, db_RESULT) {
                ++db_RESULT.comment;
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
            });
            res.send(JSON.stringify(data));
        }
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
                db_RESULT.votejoin.push(req.body.name);
                if (req.body.vote == 0) {
                    ++db_RESULT.vote[0];
                } else {
                    ++db_RESULT.vote[1];
                }
                db_RESULT.save(function (e) {
                    if (e)
                        res.send({
                            "error": "vote_fail"
                        });
                });
                res.send({
                    "error": null,
                    "data": JSON.stringify(db_RESULT.vote)
                });
            } else {
                res.sendStatus(401);
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
        else if (db_RESULT == null) {
            res.sendStatus(401);
        } else {
            res.send({
                "opinion": true,
                "data": db_RESULT
            });
        }
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
            USER_DATABASE.findOne({
                id: req.body.id
            }, function (e, db_RESULT) {
                if (e)
                    throw e;
                else {
                    if (db_RESULT.joinopinion.indexOf(req.body.bulletinid) == -1) {
                        var data = new OPINION_DATABASE({
                            bulletinid: parseInt(req.body.bulletinid), // 게시글 번호    
                            id: c + 1, // 의견 번호
                            time: new Date, // 작성 시간
                            name: req.body.name, // 닉네임
                            content: req.body.opinioncontent, // 내용
                            like: 0, // 공감 수
                            select: parseInt(req.body.opinionselect) // 찬성 1 | 반대 2
                        });
                        data.save(function (e) {
                            if (e)
                                throw e;
                        });
                        res.send({
                            "error": "succes",
                            "data": JSON.stringify(data)
                        });
                    } else {
                        res.sendStatus(401);
                    }
                }
            });
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
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send({
                    "error": null,
                    "data": db_RESULT.like
                });
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
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send({
                    "error": null,
                    "data": db_RESULT.like
                });
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
                db_RESULT.save(function (e) {
                    if (e)
                        throw e;
                });
                res.send({
                    "error": null,
                    "data": db_RESULT.like
                });
            }
        });
    } else {
        res.sendStatus(401);
    }
});

module.exports = app;
