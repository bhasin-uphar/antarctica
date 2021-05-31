const mysql = require('mysql');

const pool = mysql.createConnection({
    connectionLimit : 100,
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'antarctica'
  });

  module.exports = { pool:pool };


//   CREATE TABLE `antarctica`.`user` (
//   `id` INT NOT NULL AUTO_INCREMENT,
//   `first_name` VARCHAR(45) NOT NULL,
//   `last_name` VARCHAR(45) NOT NULL,
//   `email` VARCHAR(45) NOT NULL,
//   PRIMARY KEY (`id`),
//   UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE);


// CREATE TABLE `antarctica`.`employee` (
//     `id` INT NOT NULL AUTO_INCREMENT,
//     `email` VARCHAR(45) NOT NULL,
//     `password` VARCHAR(200) NOT NULL,
//     `organization` VARCHAR(45) NOT NULL,
//     PRIMARY KEY (`id`),
//     UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE);