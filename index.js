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
    const bistroCollectionPayments = client.db("bistroDB").collection("payments");

   
    app.post('/jwt' , (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.WEB_SECRATE_TOKEN ,  { expiresIn: '1h' });
      console.log(token);
      res.send({token})
    })

    // user related apis
    app.get("/users",   async (req, res) => {
      const result = await bistroCollectionUser.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email' , verifyJWT, async(req , res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({admin: false})
      }
      const query = {email : email};


      const user = await bistroCollectionUser.findOne(query);
      const result = {admin : user?.role === 'admin'}
      res.send(result)
    })

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

    app.get("/carts", verifyJWT,  async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }


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


// Payment related apis


    // Payment intent
    app.post('/create-payment-intent' , async(req, res) => {
      const { price } = req.body;
        const amount = price * 100;
        console.log(price , amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types : ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })


    app.post('/payment' , async(req , res) => {
      const completeTransition =  req.body;
      const result =  await bistroCollectionPayments.insertOne(completeTransition);
      res.send(result)
    })

    // admin stats

    app.get('/admin-stats' , async(req, res) => {
      const users =  await bistroCollectionUser.estimatedDocumentCount();
      const products =  await bistroCollectionDb.estimatedDocumentCount();
      const orders =  await bistroCollectionPayments.estimatedDocumentCount();
      const payments =  await bistroCollectionPayments.find().toArray();
      const revenue =  payments.reduce((sum , item) => sum + item.price , 0)
      res.send({
        users,
        products,
        orders,
        revenue
      })
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
