const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 7000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// MongoDB Connection Caching
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.z1t2q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let db;
async function connectDB() {
    if (db) return db;
    await client.connect();
    db = client.db("Mobile-Store");
    return db;
}

// Routes
app.get("/mobile", async (req, res) => {
    const db = await connectDB();
    const data = await db.collection("Mobile").find().toArray();
    res.send(data);
});

app.get("/laptops", async (req, res) => {
    const db = await connectDB();
    const data = await db.collection("Laptop").find().toArray();
    res.send(data);
});

app.get("/tv", async (req, res) => {
    const db = await connectDB();
    const data = await db.collection("Tv").find().toArray();
    res.send(data);
});

app.get("/categories", async (req, res) => {
    const db = await connectDB();
    const data = await db.collection("All-Category").find().toArray();
    res.send(data);
});

app.post("/bookings", async (req, res) => {
    const db = await connectDB();
    const booking = req.body;
    const exists = await db.collection("Bookings").findOne({
        email: booking.email,
        serviceName: booking.serviceName,
    });
    if (exists) {
        return res.send({ acknowledge: false, message: "Already booked." });
    }
    const result = await db.collection("Bookings").insertOne(booking);
    res.send(result);
});

app.get("/bookings", async (req, res) => {
    const db = await connectDB();
    const email = req.query.email;
    const data = await db.collection("Bookings").find({ email }).toArray();
    res.send(data);
});

app.post("/create-payment-intent", async (req, res) => {
    const booking = req.body;
    const amount = booking.price * 100;
    const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount,
        payment_method_types: ["card"],
    });
    res.send({ clientSecret: paymentIntent.client_secret });
});

app.post("/payments", async (req, res) => {
    const db = await connectDB();
    const payment = req.body;
    const result = await db.collection("Payments").insertOne(payment);
    const filter = { _id: new ObjectId(payment.bookingId) };
    const update = {
        $set: { paid: true, transactionId: payment.transactionId },
    };
    await db.collection("Bookings").updateOne(filter, update);
    res.send(result);
});

app.get("/users", async (req, res) => {
    const db = await connectDB();
    const data = await db.collection("Users").find().toArray();
    res.send(data);
});

app.post("/users", async (req, res) => {
    const db = await connectDB();
    const result = await db.collection("Users").insertOne(req.body);
    res.send(result);
});

app.put("/users/admin/:id", async (req, res) => {
    const db = await connectDB();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const update = { $set: { role: "admin" } };
    const result = await db.collection("Users").updateOne(filter, update);
    res.send(result);
});

app.get("/users/admin/:email", async (req, res) => {
    const db = await connectDB();
    const email = req.params.email;
    const user = await db.collection("Users").findOne({ email });
    res.send({ isAdmin: user?.role === "admin" });
});

app.get("/all-service", async (req, res) => {
    const db = await connectDB();
    const services = await db.collection("Service").find().toArray();
    res.send(services);
});

app.post("/add-service", async (req, res) => {
    const db = await connectDB();
    const { name, description } = req.body;
    const pic = req.files.image;
    const buffer = Buffer.from(pic.data.toString("base64"), "base64");
    const result = await db.collection("Service").insertOne({
        name,
        des: description,
        img: buffer,
    });
    res.send(result);
});

app.get("/", (req, res) => {
    res.send("Welcome to Mobile Store API");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});