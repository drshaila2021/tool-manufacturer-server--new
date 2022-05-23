const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");

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

    app.get("/tool", async (req, res) => {
      const query = {};
      const tools = await toolCollection.find(query).toArray();
      console.log(tools);
      res.send(tools);
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
