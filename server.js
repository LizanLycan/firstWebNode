var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var multer = require('multer');
var cloudinary = require("cloudinary");
var connect = require('connect');
var methodOverride = require('method-override');
var http = require('http');
var pass_admin= "1234";

// Multer Storage para mantener la extenteción del archivo.(IMAGEN)
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Directirio donde se guardaran los archivos.
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+file.originalname);
  }
})

var upload = multer({storage: storage}); 
///

cloudinary.config({
    cloud_name: "dergk1a1y",
    api_key: "138727165783356",
    api_secret: "cYg9m7AlfbxXNXNTVhszym-hCk4"

});
var app = express();

var connection_string = "127.0.0.1:27017/nodejs";

if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
    connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
    process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
    process.env.OPENSHIFT_MONGODB_DB_HOST + ":" +
    process.env.OPENSHIFT_MONGODB_DB_PORT + "/" +
    process.env,OPENSHIFT_MONGODB_DB_APP_NAME; 
}

mongoose.connect("mongodb://" + connection_string);

app.use(bodyParser.json());
//el extended estaba en true
app.use(bodyParser.urlencoded({extended: false}));
app.use(methodOverride('_method'));
//Definicion del esquema de productos(objeto dragonSchema)

var dragonSchemaJSON = {
    nombre: String,
    tipo: String,
    description: String,
    skill: String, //entre 1 y 100
    price: Number,
    imageUrl: String,
}

//ahora se lo paso a mongo db

var dragonSchema = new mongoose.Schema(dragonSchemaJSON);

dragonSchema.virtual("image.Url").get(function(){
    if (this.imageUrl === "" || this.imageUrl == undefined){
        return "data.png";
    }

    return this.imageUrl;
});

var dragon = mongoose.model("Dragon", dragonSchema);
app.set("view engine", "jade");
//HTTP
    //METODOS COMUNES
        //GET solicitar dominios o urls
        //POST solicitar formularios

//ahora vamos a hacer el servicio de lo que se 
//encontrara estatico en la pag
//y el acceso a Index   

app.use(express.static("public"));

app.get("/", function(solicitud, respuesta){
    //respuesta.send("envio de info");
    
    respuesta.render("index");
});

app.get("/menu", function(solicitud, respuesta){
    dragon.find(function(error,documento){
        if(error){console.log(error)}
            //products: documento, es el valor de mongodb que tiene la info de la base de datos
        respuesta.render("menu/index", { dragons: documento });
    });
});

app.get("/admin", function(solicitud,respuesta){
    respuesta.render("admin/form");
});

app.post("/admin", function(solicitud,respuesta){
    if (solicitud.body.pass == pass_admin){
        dragon.find(function(error,documento){
            if(error){console.log(error)}
                //products: documento, es el valor de mongodb que tiene la info de la base de datos
            respuesta.render("admin/index", { dragons: documento });
        });
    }else{
        respuesta.redirect("/");
    }
});

app.get("/menu/edit/:id", function(solicitud, respuesta){
    var id=solicitud.params.id;

    dragon.findOne({"_id": id}, function(err, dragon_param){
        respuesta.render("menu/edit", {dragon: dragon_param});
    });
});
//este es put pero app.put no me funciono
app.put("/menu/:id", upload.single('image'), function(solicitud,respuesta){
    console.log(solicitud.body.pass);
    console.log(solicitud.file);
    if (solicitud.body.pass == pass_admin){
        var dataDragon = {
            nombre: solicitud.body.nombre,
            tipo: solicitud.body.tipo,
            description: solicitud.body.description,
            skill: solicitud.body.skill, 
            price: solicitud.body.price
        }
        
        if(solicitud.file){
            cloudinary.uploader.upload(solicitud.file.path, 
                function(result){
                    console.log(solicitud.file.path);
                    dataDragon.imageUrl = result.url;

                    dragon.update({"_id": solicitud.params.id}, dataDragon, function(){
                        respuesta.redirect("/menu");
                    });
                });
        }else{
            dragon.update({"_id": solicitud.params.id}, dataDragon, function(){
                respuesta.redirect("/menu");
            });
        }
        
    }else{respuesta.redirect("/");}
});

app.get("/menu/delete/:id", function(solicitud, respuesta){
    var id = solicitud.params.id;

    dragon.findOne({"_id": id}, function(err, dragon_param){
        respuesta.render("menu/delete", {dragon: dragon_param});
    });
});

app.delete("/menu/:id",function(solicitud,respuesta){
    var id=solicitud.params.id;
    console.log(solicitud.body.pass);
    if (solicitud.body.pass == pass_admin){
        dragon.remove({"_id": id}, function(err){
            if(err){console.log(err)}
            respuesta.redirect("/menu");
        });
    }else{
        respuesta.redirect("/");
    }
});

app.post("/menu", upload.single('image'), function(solicitud,respuesta) {
    
    if (solicitud.body.pass == pass_admin){
        var dataDragon = {
            nombre: solicitud.body.nombre,
            tipo: solicitud.body.tipo,
            description: solicitud.body.description,
            skill: solicitud.body.skill, 
            price: solicitud.body.price
        }

        var dragonData = new dragon(dataDragon);

        if(solicitud.file){
            cloudinary.uploader.upload(solicitud.file.path, 
                function(result){
                    console.log(solicitud.file.path);
                    dragonData.imageUrl = result.url;

                    dragonData.save(function (err) {
                        console.log(dragonData);
                        respuesta.redirect("/menu");
                    });
                }); 
        }else{
            dragonData.save(function (err) {
                console.log(dragonData);
                respuesta.redirect("/menu");
            });
        }

        
        //console.log(solicitud.file);
        /**/    

    }else{
        respuesta.render("menu/new")
    }

});

app.get("/menu/new", function(solicitud, respuesta){
    respuesta.render("menu/new");
});

//var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
//var ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
//app.listen(port,ip);
app.set('port', process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3002);
app.set('ip', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");


http.createServer(app).listen(app.get('port') ,app.get('ip'), function () {
    console.log("Express server listening at %s:%d ", app.get('ip'),app.get('port'));
    //server();
});