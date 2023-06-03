const express = require("express");
const app = express();
const cors = require("cors");
var jwt = require('jsonwebtoken');
require("dotenv").config();
const port = process.env.PORT || 3000;

const stripe = require("stripe")(process.env.PAYMENT_SECRATE_KEY)
app.use(cors());
app.use(express.json());

const verifyJWT =  ( req, res, next) =>{
  const authorization = req.headers.authorization;
  if (!authorization) {
    return  res.status(401).send({error: true, message: "Unauthorized access"})
  }
  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token , process.env.WEB_SECRATE_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({error: true , message: "Forbidden "})
    }
    req.decoded = decoded;
    next()
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASS_DB}@cluster0.xifd9dy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const bistroCollectionUser = client.db("bistroDB").collection("user");
    const bistroCollectionDb = client.db("bistroDB").collection("menu");
    const bistroCollectionReviews = client.db("bistroDB").collection("reviews");
    const bistroCollectionCart = client.db("bistroDB").collection("carts");

    app.post('/jwt' , (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.WEB_SECRATE_TOKEN , {expiresIn: '12h' });
      res.send({token})
    })

    // user related apis
    app.get("/users", async (req, res) => {
      const result = await bistroCollectionUser.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exsertingUser = await bistroCollectionUser.findOne(query);
      if (exsertingUser) {
        return res.send({ message: "user already exerting" });
      }
      const result = await bistroCollectionUser.insertOne(user);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await bistroCollectionUser.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bistroCollectionUser.deleteOne(query);
      res.send(result);
    });

    // menu related apis
    app.get("/menu", async (req, res) => {
      const result = await bistroCollectionDb.find().toArray();
      res.send(result);
    });

    app.get("/review", async (req, res) => {
      const result = await bistroCollectionReviews.find().toArray();
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      // const decodedEmail =  req.decoded.email;
      // if ( email !== decodedEmail) {
      //   return res.status(403).send({error: true , message: "Forbidden Access"})
      // }

      const query = { email: email };
      const result = await bistroCollectionCart.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await bistroCollectionCart.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await bistroCollectionCart.deleteOne(query);
      res.send(result);
    });




    // Payment intent
    app.post('/create-payment-intent' , async(req, res) => {
      const { price } = req.body;
        const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types : ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
