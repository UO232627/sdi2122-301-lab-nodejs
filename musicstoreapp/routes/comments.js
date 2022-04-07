const { ObjectId } = require("mongodb");

module.exports = function(app, commentsRepository) {
    const {ObjectId} = require("mongodb");
    app.post('/addComment/:id', function (req, res) {
        let comment = {
            author: req.body.commentAuthor,
            text: req.body.commentText,
            song_id: ObjectId(req.params.id).toString()
        }

        commentsRepository.insertComment(comment, function (commentId) {
            if (commentId == null) {
                res.send("Error al insertar el comentario");
            } else {
                res.redirect("/songs/" + ObjectId(req.params.id).toString(), req, res);
            }
        });
    });
}