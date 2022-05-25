const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require("jsonwebtoken");

// middlewire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ump00.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(404).send({ massage: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ massage: "Forbidden access" });
    }

    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    const toolCollection = client.db("tool_manufacturer").collection("tools");
    const purchaseCollection = client
      .db("tool_manufacturer")
      .collection("toolPurchased");
    const paymentCollection = client
      .db("tool_manufacturer")
      .collection("payments");
    const userCollection = client.db("tool_manufacturer").collection("users");
    const reviewCollection = client
      .db("tool_manufacturer")
      .collection("review");

    app.get("/tool", async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });
    app.get("/tools", verifyJWT, async (req, res) => {
      const query = {};
      const cursor = toolCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    //get one tool
    app.get("/tool/:toolId", async (req, res) => {
      const id = req.params.toolId;
      console.log(id);
      const query = { _id: ObjectId(id) };
      const tool = await toolCollection.findOne(query);
      res.send(tool);
    });

    // post purchase data
    app.post("/purchase", async (req, res) => {
      const toolPurchased = req.body;
      const result = await purchaseCollection.insertOne(toolPurchased);
      res.send(result);
    });
    //    get all purchased item for one user
    app.get("/purchase", verifyJWT, async (req, res) => {
      const email = req.query.user;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await purchaseCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.send({ massage: "Forbidden" });
      }
    });
    // app.get("/purchase", async (req, res) => {
    //   const email = req.query.user;

    //   const query = { email: email };
    //   const orders = await purchaseCollection.find(query).toArray();
    //   return res.send(orders);
    // });

    app.delete("/purchase/:orderId", async (req, res) => {
      const orderId = req.params.orderId;
      console.log(orderId);
      const query = { _id: ObjectId(orderId) };
      const result = await purchaseCollection.deleteOne(query);
      res.send(result);
    });

    // getting one item from toolpurchased for payment

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const orderedItem = await purchaseCollection.findOne(query);
      res.send(orderedItem);
    });

    // get all orders(purchase)for admin

    app.get("/purchases", verifyJWT, async (req, res) => {
      const orders = await purchaseCollection.find().toArray();
      res.send(orders);
    });

    app.patch("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedPurchase = await purchaseCollection.updateOne(
        filter,
        updatedDoc
      );
      const result = await paymentCollection.insertOne(payment);
      res.send(updatedDoc);
    });

    // get all users
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();

      res.send(users);
    });

    // get a admin user
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // updade user ,add admin role

    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });

    // update and insert user in database
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "4hr" }
      );
      res.send({ result, token });
    });

    app.post("/create-payment-intent", async (req, res) => {
      const item = req.body;
      console.log(item);
      const totalCost = item.totalCost;
      const amount = totalCost * 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    //post review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
    //get reviews
    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await reviewCollection.find(query).toArray();
      res.send(reviews);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(" Manufactural World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
