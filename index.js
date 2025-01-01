const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')('sk_test_51L27WdEDv8zcGvWbAQp2KHPYrspzm0l0AfRWxtKTday7OXyEiOqWIyGOUZlwQxaNPoymmaGylYOSpEj6KJlettO800mvUniqbf')

// middleware start
app.use(cors());
app.use(express.json());
// middleware end

// mongodb 
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const uri = "mongodb+srv://mdsujait2004:l84HKAl4LK5moInz@busbooking.eswwl.mongodb.net/?retryWrites=true&w=majority&appName=busbooking";
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });


  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      // await client.connect();

// all collactions
      const userCollection = client.db("booking").collection("users");
      const adminUserCollection = client.db("bookingAdmin").collection("adminusers");
      const busInfoCollection = client.db("bookingAdmin").collection("bus");
      const paymentCollection = client.db("booking").collection("payments");
      //

//admin users api
app.get('/adminusers',async(req,res) =>{
  const result = await adminUserCollection.find().toArray();
  res.send(result)
})
//
//AdminUser information crate and send api 
app.post('/adminusers', async (req,res) => {
  const user = req.body;
  //Checked userCollection Email Present or Not
  const query = { email: user.email }
  const existingUser = await adminUserCollection.findOne(query)
  if (existingUser) {
      return res.send({ message: 'user already exists' })
  }
  const result = await adminUserCollection.insertOne(user)
  res.send(result);
})
//


//users api
app.get('/users',async (req,res) =>{
    const result = await userCollection.find().toArray();
    res.send(result)
})

//

//user information crate and send api 
app.post('/users', async (req,res) => {
    const user = req.body;
    //Checked userCollection Email Present or Not
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query)
    if (existingUser) {
        return res.send({ message: 'user already exists' })
    }
    const result = await userCollection.insertOne(user)
    res.send(result);
})
//

//bus Newdata post
app.post('/bus',async (req,res)=>{
  const bus = req.body;
const result = await busInfoCollection.insertOne(bus)
res.send(result)
})
//
//And Bus Data Get
app.get('/businfo',async (req,res) =>{
  const result = await busInfoCollection.find().toArray();
  res.send(result)
})
//
//
app.get('/businfo/:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id:new ObjectId(id)};
  const result = await busInfoCollection.findOne(query);
  res.send(result)
})

//bus info Delete Api
app.delete('/businfo/:id',async(req,res)=>{
  const id = req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await busInfoCollection.deleteOne(query)
  res.send(result);
})
//


//////

app.post('/create-checkout-session', async (req, res) => {
  const { products } = req.body;

  console.log(products);

  const lineItems = products.map((product) => ({
      price_data: {
          currency: 'usd',
          product_data: {
              name: `${product.destinationFrom} to ${product.destinationTo} (${product.seatType})`,
          },
          unit_amount: product.totalPrice * 100, // Convert to cents
      },
      quantity: 1, // Assuming 1 quantity per product
  }));

  try {
      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `https://busbooking-5d224.web.app/success`,
          cancel_url: `https://busbooking-5d224.web.app/cancel`,
      });

      // Prepare the payment object to save to the database
      const payment = {
        userEmail: products[0]?.userEmail,
        userName: products[0]?.userName,
        totalPrice: products.reduce((sum, product) => sum + product.totalPrice, 0),
        selectedSeats: products.flatMap((product) => product.selectedSeats),
        journeyStartDate: products[0]?.journeyStartDate,
        journeyEndDate: products[0]?.journeyEndDate,
        seatType: products[0]?.seatType,
        journeyStartTime: products[0]?.journeyStartTime,
        journeyEndTime: products[0]?.journeyEndTime,
        destinationFrom: products[0]?.destinationFrom,
        destinationTo: products[0]?.destinationTo,
        transactionId: session.id,
        paymentStatus: 'Pending',
        timestamp: new Date(),
      };

      // Save payment details to the database
      const result = await paymentCollection.insertOne(payment);

      console.log('Payment details saved to database:', result);

      // Respond with session ID for the frontend
      res.json({ id: session.id });

  } catch (error) {
      console.error('Error creating checkout session or saving payment:', error);
      res.status(500).send({ message: 'Failed to create checkout session', error });
  }
});


////////
// ticket Api
app.get('/payment/:email', async (req, res) => {
  try {
    const email = req.params.email;

    // Fetch payment data from the payment collection based on email
    const result = await paymentCollection.find({ userEmail: email }).toArray();

    if (result.length === 0) {
      return res.status(404).send({ message: "No payment records found for this email" });
    }

    // Send the result back to the frontend
    res.send(result);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});
//

app.get('/passenger-data',async(req,res)=>{
  const result = await paymentCollection.find().toArray();
  res.send(result)
})

app.get('/passenger',async(req,res)=>{
  const result = await paymentCollection.find().toArray();
  res.send(result)
})



app.get('/search', async (req, res) => {
  const { destinationFrom,destinationTo,seatType } = req.query;
console.log(req.query)
  try {
    // Prepare the search query
    const query = {};

    // Handle destinationFrom
    if (destinationFrom) {
      query.destinationFrom = { $regex: new RegExp(destinationFrom, 'i') };
    }

    // Handle destinationTo
    if (destinationTo) {
      query.destinationTo = { $regex: new RegExp(destinationTo, 'i') };
    }

    // Handle seatType
    if (seatType) {
      query.seatType = { $regex: new RegExp(seatType, 'i') };
    }
  
    console.log('Search Query:', query);

    // Query the database
    const result = await busInfoCollection.find(query).toArray();

    if (result.length === 0) {
      return res.status(404).send({ message: 'Sorry Search Result Not Found' });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error('Error in search API:', error);
    res.status(500).send({ message: 'Internal server error', error });
  }
});


//

      // Send a ping to confirm a successful connection
      // await client.db("admin").command({ ping: 1 });
      // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);
// mongodb 


app.get('/',(req,res)=>{
 res.send('ai bata')
});




app.listen(port,()=>{
    console.log(`Ami kisu pari na ${port}`)
})
