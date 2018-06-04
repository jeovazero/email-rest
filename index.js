const restify = require('restify')

const corsMiddleware = require('restify-cors-middleware')
const cors = corsMiddleware({
    origins: ['*'],
    allowHeaders: ['Authorization'],
  })

const server = restify.createServer()
require('./routes/email')(server);
const jwt = require('jsonwebtoken');



server.pre(cors.preflight)
server.use(cors.actual)

const PORT = process.env.PORT
const SECRET = process.env.SECRET
//server.use(restify.fullResponse());
server.use(restify.plugins.acceptParser(server.acceptable))
server.use(restify.plugins.queryParser())
server.use(restify.plugins.bodyParser())


server.use(function(req, res, next){
    console.log("headers" , req.headers)
    res.header('Access-Control-Allow-Credentials', "true");
    res.header("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Origin");
    

    const token = req.header('Authorization');
    console.log("TOKEN", token);
    
    jwt.verify(token, new Buffer.from(SECRET), function(err, data){
        if(err){
            req.user = null;
            console.log("NO AUTH ", err)
        }else{
            req.user = data.user
            console.log("AUTH ", data.user)
        }
    });
    next()
})

server.get("/", function(req, res, next){
    res.send("Wow! \o/")
    return next()
})

server.listen(PORT, function(){
    console.log("Pode cunfiar tiu aqui noiz faiz servidor")
})