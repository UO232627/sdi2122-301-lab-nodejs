const { ObjectId } = require("mongodb");

module.exports = function(app, songsRepository, commentsRepository){
    app.get("/songs", function(req, res){
        let songs = [{
            "title": "Blank space",
            "price": "1.2"
        }, {
            "title": "See you again",
            "price": "1.3"
        }, {
            "title": "Uptown Funk",
            "price": "1.1"
        }];

        let response = {
            seller: 'Tienda de canciones',
            songs: songs
        }

        res.render("shop.twig", response);
    });

    app.get('/songs/add', function (req, res){
        res.render("songs/add.twig");
    })

    app.get('/add', function(req, res){
        let response = parseInt(req.query.num1) + parseInt(req.query.num2);

        res.send(String(response));
    })

    app.get('/songs/delete/:id', function (req, res) {
        let filter = {_id: ObjectId(req.params.id)};

        songsRepository.deleteSong(filter, {}).then(result => {
            if (result == null || result.deletedCount == 0){
                res.send("No se ha podido eliminar el registro");
            }
            else{
                res.redirect("/publications");
            }
        }).catch(error => {
            res.send("Se ha producido un error al intentar eliminar la canción: " + error);
        });
    });

    app.get('/songs/:id', function(req, res){
        let filter = {_id: ObjectId(req.params.id)};
        let options = {};
        let filterComments = {"song_id": ObjectId(req.params.id).toString()};
        let filterPurchases = {user: req.session.user};

        songsRepository.findSong(filter, options).then(song => {
            commentsRepository.getComments(filterComments, options).then(comments => {
                songsRepository.getPurchases(filterPurchases, options).then(purchases => {
                    let purchased = false;
                    if (purchases.find(s => s._id = song._id) != undefined){
                        purchased = true;
                    }
                    if (song.author == req.session.user){
                        purchased = true;
                    }

                    let settings = {
                        url: "https://www.freeforexapi.com/api/live?pairs=EURUSD",
                        method: "get",
                        headers: {
                            "token": "ejemplo"
                        }
                    }
                    let rest = app.get("rest");
                    rest(settings, function (error, response, body) {
                        console.log("cod: " + response.statusCode + " Cuerpo :" + body);
                        let responseObject = JSON.parse(body);
                        let rateUSD = responseObject.rates.EURUSD.rate;
                        // nuevo campo "usd" redondeado a dos decimales
                        let songValue= rateUSD * song.price; song.usd = Math.round(songValue * 100) / 100;
                        res.render("songs/song.twig", {song: song, comments: comments, purchased: purchased});
                    })
                })
            }).catch(error => {
                res.send("Se ha producido un error al listar los comentarios " + error)
            });
        }).catch(error => {
            res.send("Se ha producido un error al buscar la canción " + error)
        });
    });

    app.get('/songs/edit/:id', function (req, res){
        let filter = {_id: ObjectId(req.params.id)};

        songsRepository.findSong(filter, {}).then(song => {
            res.render("songs/edit.twig", {song: song});
        }).catch(error => {
            res.send("Se ha producido un error al recuperar la cancion " + error)
        });
    });

    app.post('/songs/edit/:id', function(req, res) {
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }

        let songId = req.params.id;
        let filter = {_id: ObjectId(songId)};

        const options = {upsert: false}

        songsRepository.updateSong(song, filter, options).then(result => {
            step1UpdateCover(req.files, songId, function (result){
                if (result == null){
                    res.send("Error al actualizar la portada o el audio de la canción");
                }
                else{
                    res.redirect("/publications");
                }
            });
        }).catch(error => {
            res.send("Se ha producido un error al modificar la cancion " + error);
        })
    });

    app.get('/songs/buy/:id', function(req, res) {
        let songId = ObjectId(req.params.id);
        let shop = {
            user: req.session.user,
            songId: songId
        }
        let filterPurchases = {user: req.session.user};
        let options = {};
        let filter = {_id: songId};

        songsRepository.findSong(filter, options).then(song => {
            songsRepository.getPurchases(filterPurchases, options).then(purchases => {
                if (purchases.find(s => s._id = song._id) != undefined || song.author == req.session.user) {
                    res.send("Error al realizar la compra");
                }
                else{
                    songsRepository.buySong(shop, function (shopId) {
                        if (shopId == null) {
                            res.send("Error al realizar la compra");
                        } else {
                            res.redirect("/purchases");
                        }
                    });
                }
            })
        })
    });

    app.get('/purchases', function (req, res){
        let filter = {user: req.session.user};
        let options = {projection: {_id: 0, songId: 1}};

        songsRepository.getPurchases(filter, options).then(purchasedIds => {
            let purchasedSongs = [];

            for (let i = 0; i < purchasedIds.length; i++) {
                purchasedSongs.push(purchasedIds[i].songId)
            }

            let filter = {"_id": {$in: purchasedSongs}};
            let options = {sort: {title: 1}};

            songsRepository.getSongs(filter, options).then(songs => {
                res.render("purchase.twig", {songs: songs});
            }).catch(error => {
                res.send("Se ha producido un error al listar las publicaciones del usuario: " + error)
            });
        }).catch(error => {
            res.send("Se ha producido un error al listar las canciones del usuario " + error)
        });
    });

    app.get('/songs/:kind/:id', function(req, res){
        let response = 'id: ' + req.params.id + '<br>' + 'Tipo de música: ' + req.params.kind;

        res.send(response);
    });

    app.post('/songs/add', function(req, res){
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }

        songsRepository.insertSong(song, function(songId){
            if (songId == null){
                res.send("Error al insertar canción");
            }
            else{
                if (req.files != null){
                    let imagen = req.files.cover;
                    imagen.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function(err){
                        if (err){
                            res.send("Error al subir la portada de la canción");
                        }
                        else{
                            if (req.files.audio != null){
                                let audio = req.files.audio;
                                audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function(err){
                                    if (err){
                                        res.send("Error al subir el audio");
                                    }
                                    else{
                                        res.redirect("/publications");
                                    }
                                })
                            }
                        }
                    })
                }
                else{
                    res.send("Agregada la canción ID: " + songId)
                }
            }
        })
    });

    app.get('/promo*', function (req, res){
        res.send('Respuesta al patrón promo*');
    });

    app.get('/pro*ar', function(req, res){
        res.send('Respuesta al patrón pro*ar');
    })

    app.get('/shop', function(req, res){
       let filter = {};
       let options = {sort: {title: 1}};

       if (req.query.search != null && typeof(req.query.search) != "undefinded" && req.query.search != ""){
           filter = {"title": {$regex: ".*" + req.query.search + ".*"}};
       }

        let page = parseInt(req.query.page); // Es String !!!
        if (typeof req.query.page === "undefined" || req.query.page === null || req.query.page === "0") {
            // Puede no venir el param
            page = 1;
        }

        songsRepository.getSongsPg(filter, options, page).then(result => {
            let lastPage = result.total / 4;
            if (result.total % 4 > 0) {
                // Sobran decimales
                lastPage = lastPage + 1;
            }

            let pages = []; // paginas mostrar

            for (let i = page - 2; i <= page + 2; i++) {
                if (i > 0 && i <= lastPage) {
                    pages.push(i);
                }
            }

            let response = {
                songs: result.songs,
                pages: pages,
                currentPage: page
            }

            res.render("shop.twig", response);
       }).catch(error => {
           res.send("Se ha producido un error al listar las canciones " + error)
       });
    });

    app.get('/publications', function(req, res){
        let filter = {author: req.session.user};
        let options = {sort: {title: 1}};

        songsRepository.getSongs(filter, options).then(songs => {
            res.render("publications.twig", {songs: songs});
        }).catch(error => {
            res.send("Se ha producido un error al listar las publicaciones del usuario:" + error)
        });
    });

    function step1UpdateCover(files, songId, callback) {
        if (files && files.cover != null){
            let image = files.cover;

            image.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err){
                if (err){
                    callback(null);
                }
                else{
                    step2UpdateAudio(files, songId, callback);
                }
            });
        }
        else{
            step2UpdateAudio(files, songId, callback);
        }
    };

    function step2UpdateAudio(files, songId, callback){
        if (files && files.audio != null){
            let audio = files.audio;

            audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function (err){
                if (err){
                    callback(null);
                }
                else{
                    callback(true);
                }
            });
        }
        else{
            callback(true);
        }
    };


}