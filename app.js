const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
// database
const Database = require("better-sqlite3");
const db = new Database("rentify.db", { verbose: console.log });

app.get("/", (req, res) => {
  res.send({ code: "heyy!" });
});

app.post("/signup", async (req, res) => {
  const { username, password, name, phonenumber } = req.body;
  console.log({ username, password, name, phonenumber });
  // check if username exists
  const usernameExists = db
    .prepare("SELECT uid from users where username=@username")
    .get({ username });
  if (usernameExists && usernameExists.uid) {
    return res.send({ code: "err", message: "Username exists" });
  }

  const insert = db.prepare(
    "INSERT INTO users (username, name, password , phonenumber) VALUES (@username , @name, @password,@phonenumber)"
  );
  let info = insert.run({ username, name, password, phonenumber });
  console.log(info);
  if (info) {
    res.send({ isCreated: true, code: "suc", uid: info.lastInsertRowid });
  } else {
    res.send({ isCreated: false, code: "err" });
  }
});
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const select = db.prepare("SELECT *  from users where username=@username");
  let info = select.get({ username });
  console.log(info);
  if (info) {
    if (info.username === username && info.password === password) {
      return res.send({
        loggedin: true,
        uid: info.uid,
        code: "suc",
        name: info.name,
        phonenumber: info.phonenumber,
      });
    }
  }
  return res.send({ loggedin: false, code: "err" });
});
const path = require("path");
app.get("/getpic/:id", (req, res) => {
  console.log(path.join(req.params.id + ".jpg"));
  res.sendFile(path.join(__dirname, req.params.id));
});
app.post("/editprofile", (req, res) => {
  const { username, password, name, phonenumber, uid } = req.body;
  // check if username exists
  const usernameExists = db.prepare(
    "SELECT uid from users where username=@username"
  );
  if (usernameExists && username.uid) {
    return res.send({ code: "err", message: "Username exists" });
  }

  const update = db
    .prepare(
      "UPDATE users SET username=@username, password=@password, name=@name , phonenumber=@phonenumber  WHERE uid=@uid"
    )
    .run({ username, name, password, phonenumber, uid });
  if (update) {
    return res.send({
      code: "success",
      message: "Saved",
    });
  } else {
    res.send({ code: "err", message: "could not update" });
  }
});

app.post("/add-listing", (req, res) => {
  const { title, desc, price, interval, uid, category, imgurl } = req.body;
  const insert = db.prepare(
    "INSERT INTO listings ( imgurl,title, desc, price, interval, uid , category) VALUES (@imgurl,@title, @desc, @price, @interval, @uid , @category)"
  );
  let info = insert.run({
    imgurl,
    title,
    desc,
    price,
    interval,
    uid,
    category,
  });
  if (info) {
    res.send({ isCreated: true, code: "suc" });
  } else {
    res.send({ isCreated: false, code: "err" });
  }
});
app.post("/get-listing", (req, res) => {
  const { lid } = req.body;
  let select = db.prepare("SELECT * from listings where lid=@lid").get({ lid });
  const select2 = db
    .prepare("SELECT * from users where uid=@uid")
    .get({ uid: select.uid });

  if (select) {
    select["user"] = select2;
    return res.send({ code: "suc", item: select });
  }
});
app.post("/get-all-listings", (req, res) => {
  const { uid } = req.body;
  let rented = db.prepare("SELECT lid from user_renting").all();
  rented = rented.map((i) => i.lid);
  console.log(rented);
  const select = db.prepare("SELECT * from listings").all();
  for (const item of select) {
    const select2 = db
      .prepare("SELECT * from users where uid=@uid")
      .get({ uid: item.uid });
    item["user"] = select2;
  }
  let fin = [];
  for (let item of select) {
    if (uid === item.uid) continue;
    if (rented.indexOf(item.lid) < 0) {
      fin.push(item);
    }
  }
  // console.log(fin);
  if (select) {
    return res.send({ code: "suc", item: fin });
  }
});

app.post("/add-item-to-rent", (req, res) => {
  try {
    const { lid, uid } = req.body;
    // let user = db.prepare("SELECT * from users where uid=@uid").get({ uid });
    // let listing = db
    //   .prepare("SELECT * from listings where lid=@lid")
    //   .get({ lid });
    const insert = db.prepare(
      "INSERT INTO user_renting (lid, uid) VALUES (@lid , @uid)"
    );
    insert.run({
      uid,
      lid,
    });
    res.send({ code: "suc", message: "item added" });
  } catch (error) {
    res.send({ code: "lol", message: "item could not be added" });
  }
});
app.post("/get-profile", (req, res) => {
  try {
    const { uid } = req.body;
    let useritemsq = db
      .prepare("SELECT * from listings where uid=@uid")
      .all({ uid });
    let useritems = [];
    for (const { lid } of useritemsq) {
      useritems.push(lid);
    }

    let rentedByUser = db
      .prepare("SELECT * from user_renting where uid=@uid")
      .all({ uid });
    let popListing = [];
    for (const { lid } of rentedByUser) {
      console.log(lid);
      let listing = db
        .prepare("SELECT * from listings WHERE lid=@lid")
        .get({ lid });
      popListing.push(listing);
    }
    let otherusers = [];
    for (const lid of useritems) {
      let rentedByOtherUsers = db
        .prepare("SELECT * from user_renting where lid=@lid")
        .all({ lid });
      for (const otu of rentedByOtherUsers) {
        let us = db
          .prepare("SELECT * from users WHERE uid=@uid")
          .get({ uid: otu.uid });
        let ls = db
          .prepare("SELECT * from listings WHERE lid=@lid")
          .get({ lid });
        console.log(ls, lid);
        otherusers.push({
          listingname: ls.title,
          rentingusername: us.name,
          rentinguserph: us.phonenumber,
          listingid: ls.lid,
        });
      }
    }

    res.send({
      code: "suc",
      userrenting: popListing,
      otheruserrentingyourproducts: otherusers,
    });
  } catch (error) {
    console.log(error);
    res.send({ code: "lol", message: "item could not be retrieved" });
  }
});
app.post("/return-item", (req, res) => {
  try {
    const { uid, lid } = req.body;
    let deleteListing = db
      .prepare("DELETE from user_renting where lid=@lid and uid=@uid")
      .run({ uid, lid });

    res.send({ code: "suc" });
  } catch (error) {
    console.log(error);
    res.send({ code: "lol", message: "item could not be deleted" });
  }
});
app.listen(5000, () => {
  console.log("Server online at 5000");
});
