const express = require('express');
const userCommentRouter = express.Router();

userCommentRouter.use(function(req, res, next){
    console.log("routerUserSession");

    if(req.session.user){
        next();
    }
    else{
        res.send("No está autenticado, no se ha podido insertar el comentario");
    }
});

module.exports = userCommentRouter;