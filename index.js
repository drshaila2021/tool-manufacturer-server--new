const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { query } = require("express");
// const jwt = require("jsonwebtoken");

// middlewire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ump00.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();

    const toolCollection = client.db("tool_manufacturer").collection("tools");
    const purchaseCollection = client
      .db("tool_manufacturer")
      .collection("toolPurchased");

    app.get("/tool", async (req, res) => {
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
    app.get("/purchase", async (req, res) => {
      const email = req.query.user;
      const query = { email: email };
      const orders = await purchaseCollection.find(query).toArray();
      res.send(orders);
    });

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
