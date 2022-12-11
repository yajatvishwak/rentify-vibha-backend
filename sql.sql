-- Active: 1668653346577@@127.0.0.1@3306
CREATE TABLE users(  
    uid INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    name TEXT,
    phonenumber TEXT,
);