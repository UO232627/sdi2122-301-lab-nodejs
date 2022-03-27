module.exports = function(app){

    app.get('/authors/add', function (req, res) {
        res.render("./authors/add.twig");
    });

    app.post('/authors/add', function(req, res){
        let author = req.body.name;
        let group = req.body.group;
        let rol = req.body.rol;

        if (author == 'undefined'){
            author = "Autor no enviado en la petición";
        }
        if (group == 'undefined'){
            group = "Grupo no enviado en la petición";
        }
        if (rol == 'undefined'){
            rol = "Rol no enviado en la petición";
        }

       let response = "Autor agregado: " + author + "<br>" +
                        "Grupo: " + group + "<br>" +
                        "Genero: " + rol + "<br>";

       res.send(response);
    });

    app.get('/authors', function(req, res){
        let authors = [{
            "name": "Dave Grohl",
            "group": "Foo Fighters",
            "rol": "Singer"
        }, {
            "name": "Slash",
            "group": "Guns 'n Roses",
            "rol": "Guitarist"
        }, {
            "name": "Chester Bennington",
            "group": "Linkin Park",
            "rol": "Singer"
        }];

        let response = {
            author: 'Autores',
            authors: authors
        }

        res.render("./authors/authors.twig", response);
    });

    app.get('/authors/*', function(req, res){
        res.redirect('/authors');
    });
    
}