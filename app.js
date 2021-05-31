
const express = require('express');
const http = require('http');
const bcrypt = require('bcrypt');
const path = require("path");
const bodyParser = require('body-parser');
const users = require('./data').userDB;
const mysql = require('mysql');
var jwt = require('jsonwebtoken');
var validator = require("email-validator");
var express_graphql = require('express-graphql');
var { buildSchema } = require('graphql');
var { graphqlHTTP } = require('express-graphql');

const pool = mysql.createConnection({
    connectionLimit : 100,
    host: '0.0.0.0',
    user: 'root',
    password: '',
    database: 'antarctica'
  });



const app = express();
const server = http.createServer(app);

app.use(express.json());

function addRow(table, columns, values, callback) {
    let insertQuery = 'INSERT INTO ?? (??) VALUES (?)';
    let query = mysql.format(insertQuery,[table,columns,values]);
    pool.query(query,(err, response) => {
        if(err) {
            console.error(err);
            return;
        }
        // rows added
        return callback(response);
    });
}

function queryRow(table, column, value, fetch, callback) {
    let selectQuery = 'SELECT ?? FROM ?? WHERE ?? = ?';    
    let query = mysql.format(selectQuery,[fetch, table, column, value]);
    // query = SELECT * FROM `todo` where `user` = 'shahid'
    pool.query(query,(err, data) => {
        if(err) {
            console.error(err);
            return;
        }
        // rows fetch
        // console.log(data);
        return callback(data);
    });
}

// GraphQL schema
var schema = buildSchema(`
    type Query {
        message: String,
        test: String,
    }
`);
// Root resolver
var root = {
    message: () => 'Hello World!',
    test: () => {example: () => "sasa"},
};


app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
}));

app.get('/',(req,res) => {
    console.log('Hi');
    res.sendFile(path.join(__dirname,'./public/index.html'));
});

app.post('/register', async (req, res) => {
    try{
        if (!["Consulting", "Frontend Development", "Backend Development", "DevOps", "Cloud Computing", "UI UX"].includes(req.body.organization)){
            return res.json({"status":"error", "message":'organisation should be from Consulting, Frontend Development, Backend Development, DevOps, Cloud Computing, UI UX.'});
        }
        if (!validator.validate(req.body.email)){
            return res.json({"status":"error", "message":'email not valid.'});
        }
        queryRow("employee", "email", req.body.email, "password", async function(foundUser){
            console.log(foundUser);
            

            if (foundUser.length==0) {
        
                let hashPassword = await bcrypt.hash(req.body.password, 10);
        
                let userColumns = ["first_name", "last_name", "email"]
                let userValues = [req.body.first_name, req.body.last_name, req.body.email]
                let employeeColumns = ["organization", "password", "email"]
                let employeeValues = [req.body.organization, hashPassword, req.body.email]

                addRow("user", userColumns, userValues, function(response){
                    console.log(response);
                });
                addRow("employee", employeeColumns, employeeValues, function(response){
                    console.log(response);
                });

                res.json({"status":"successful", "message":"account created"});
        
            } else {
                res.json({"status":"error", "message":"email already exists"});
            }});
    } catch{
        res.json({"status":"error", "message":"internal server error"});
    }
});


app.post('/login', async (req, res) => {
    try{
        // let foundUser = users.find((data) => req.body.email === data.email);
        console.log(req.body);
        queryRow("employee", "email", req.body.email, "password", async function(foundUser){
            console.log(foundUser);
            console.log(req.body.password);
            if (foundUser.length > 0) {
        
                let submittedPass = req.body.password; 
                let storedPass = foundUser[0].password; 
        
                const passwordMatch = await bcrypt.compare(submittedPass, storedPass);
                console.log(passwordMatch);
                if (passwordMatch) {
                    let usrname = req.body.email;
                    var token = jwt.sign({ email: req.body.email }, 'shhhhh');
                    res.json({"status":"successful", "token":token});
                } else {
                    res.json({"status":"error", "message":"Invalid email or password"});
                }
            }
            else {
        
                let fakePass = `$2b$$10$ifgfgfgfgfgfgfggfgfgfggggfgfgfga`;
                await bcrypt.compare(req.body.password, fakePass);
        
                res.json({"status":"error", "message":"Invalid email or password"});
            }
        })
    } catch{
        res.json("Internal server error");
    }
});



app.get('/user-list', function(req, res) {
    let token = req.headers.token;
    try {
        var decoded = jwt.verify(token, 'shhhhh');
      } catch(err) {
          return res.json({"status":"Unauthorized"})
        // err
      }
    
    var sql='SELECT u.first_name, u.last_name, e.email, e.id, e.organization FROM user u inner JOIN employee e WHERE u.email = e.email';
    var current_page = 1;
    var total_pages = 1;
    var total_data_length = 0;

    console.log(req.query);

    pool.query(sql,(err, data) => {
        if(err) {
            console.error(err);
            return;
        }
        // rows fetch
        // console.log(data);
        total_pages = Math.ceil(data.length / 10);
        if (total_pages == 0){
            total_pages = 1;
        }
        total_data_length = data.length;
        console.log(total_pages);

    });
    
    if ("search" in req.query){
        var keyword = req.query.search;
        var sql="SELECT u.first_name, u.last_name, e.email, e.id, e.organization FROM user u INNER JOIN employee e USING(email) WHERE (u.first_name) LIKE ('%"+keyword+"%') OR (u.last_name) LIKE ('%"+keyword+"%') OR (e.id) LIKE ('%"+keyword+"%')";
    }

    if ("field" in req.query){
        var order = "asc";
        var field = req.query.field;
        if ("order" in req.query){
            order = req.query.order;
        }
        if (!["asc", "desc"].includes(order)){
            order="asc";
        }

        sql = sql + " order by " + field + " " + order
    }


    if ("page" in req.query && req.query.page != 0){
        current_page = req.query.page;
    }

    var end_index = current_page * 10;
    var start_index = end_index - 10;
    if (start_index < 0){
        start_index = 0;
    }

    sql = sql + " limit " + start_index + ", " + end_index;
    console.log(sql);

    pool.query(sql,(err, data) => {
            if(err) {
                console.error(err);
                return;
            }

            res.json({"data":data, "page_info":{"total_pages":total_pages, "current_page":current_page, "data_length":data.length, "total_data_length":total_data_length}});
        });

});

app.post('/user-list', function(req, res, next) {
    var keyword = req.body.keyword;
    console.log(keyword);
    var sql="SELECT u.first_name, u.last_name, e.email, e.id, e.organization FROM user u INNER JOIN employee e USING(email) WHERE (u.first_name) LIKE ('%"+keyword+"%') OR (u.last_name) LIKE ('%"+keyword+"%') OR (e.id) LIKE ('%"+keyword+"%')";
    // var sql = mysql.format(selectQuery, [keyword]);
    console.log(sql);
    pool.query(sql,(err, data) => {
         if(err) {
             console.error(err);
             return;
         }
         // rows fetch
         console.log(data);
         // res.sendFile(path.join(__dirname,'./public/user_list.html'), { title: 'User List', userData: data});
         res.render(path.join(__dirname,'./public/user_list'), { title: 'User List', userData: data});
     });
 
 });

server.listen(process.env.PORT || 3000, function(){
    console.log("server is listening on port: 3000");
});
