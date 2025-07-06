const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const cors = require("cors");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = 7000;

// middleware
app.use(cors());
app.use(express.json());
// middleware for file upload
app.use(fileUpload());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.z1t2q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function serverStart() {
    try {
        await client.connect();

        const database = client.db("Mobile-Store");
        const mobileCollection = database.collection("Mobile");
        const laptopCollection = database.collection("Laptop");
        const tvCollection = database.collection("Tv");
        const allCategoryCollection = database.collection("All-Category");
        const bookingCollection = database.collection("Bookings");
        const usersCollection = database.collection("Users");
        const paymentCollection = database.collection("Payments");

        const servicesCollection = database.collection("Service");

        app.get("/mobile", async (req, res) => {
            const query = {};
            const mobile = await mobileCollection.find(query).toArray();
            res.send(mobile);
        });
        app.get("/laptops", async (req, res) => {
            const query = {};
            const laptop = await laptopCollection.find(query).toArray();
            res.send(laptop);
        });
        app.get("/tv", async (req, res) => {
            const query = {};
            const tv = await tvCollection.find(query).toArray();
            res.send(tv);
        });
        app.get("/categories", async (req, res) => {
            const query = {};
            const allCategory = await allCategoryCollection.find(query).toArray();
            res.send(allCategory);
        });

        // get all bookings for a specific user by email
        app.get("/bookings", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        });

        // Post all booking 
        app.post("/bookings", async (req, res) => {
            const booking = req.body;

            console.log(booking);

            const query = {

                email: booking.email,
                serviceName: booking.serviceName,
            };

            const alreadyBooked = await bookingCollection.find(query).toArray();
            console.log(alreadyBooked);

            if (alreadyBooked.length) {
                const message = `You already have a booking on ${booking.appointmentDate}`;
                return res.send({ acknowledge: false, message });
            }

            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        // add payment
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"

                ],

            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.get("/bookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        });

        // post payment

        app.post("/payments", async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                },
            };
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        app.get("/users", async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        // Users post

        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Make Admin user

        app.put("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: "admin",
                },
            };
            const result = await usersCollection.updateOne(
                filter,
                updatedDoc,
                options
            );
            res.send(result);
        });

        // check admin or not

        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === "admin" });
        });
        // add services
        //get all services
        app.get("/all-service", async (req, res) => {
            const query = {};
            const services = await servicesCollection.find(query).toArray();
            res.send(services);
        });

        // post services
        app.post("/add-service", async (req, res) => {
            const name = req.body.name;
            const description = req.body.description;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString("base64");
            const imageBuffer = Buffer.from(encodedPic, "base64");

            const service = {
                name,
                des: description,
                img: imageBuffer,
            };
            const result = await servicesCollection.insertOne(service);
            res.send(result);
        });

        app.get("/price", async (req, res) => {
            const filter = {}
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    price: 100
                }
            }
            const result = await bookingCollection.updateMany(filter, updatedDoc, option)
            res.send(result)
        })
    } finally {
        //     await client.close();
    }
}
serverStart().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Welcome  Mobile Store!👏👏👏");
});

app.listen(port, () => {
    console.log(`Our Mobile store app listening on port ${port}`);
});
